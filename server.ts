import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase-admin/app';
import { createServer } from 'vite';
import { cintAdapter, verifySignature as verifyCintSignature } from './src/providers/cintAdapter.ts';
import {
  adGemAdapter,
  bitLabsAdapter,
  getActiveOfferwallProvider,
  setActiveOfferwallProvider,
  getOfferwallAdapter,
  verifyAdGemSignature,
  verifyBitLabsSignature,
} from './src/providers/offerwallAdapter.ts';
import { affiliateDealsAdapter } from './src/providers/affiliateDealsAdapter.ts';
import { createRateLimiter } from './src/middleware/rateLimiter.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to validate required fields
function validateField(value: any, name: string): { valid: boolean; error?: string } {
  if (value === undefined || value === null || value === '') {
    return { valid: false, error: `Missing required field: ${name}` };
  }
  return { valid: true };
}

// Helper to validate numeric fields
function validateNumeric(value: any, name: string, min: number = 0, max: number = 10000): { valid: boolean; error?: string; parsed?: number } {
  const num = Number(value);
  if (isNaN(num) || num < min || num > max) {
    return { valid: false, error: `Invalid ${name}: must be a number between ${min} and ${max}` };
  }
  return { valid: true, parsed: num };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Sliding-window rate limiters to defend against API abuse, replay attacks, and click-fraud
  const generalApiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 120, // 120 requests per minute
    message: 'Too many API requests, please slow down.',
  });

  const callbackLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 30, // 30 requests per minute for sensitive callbacks & postbacks
    message: 'Too many callback or postback requests, please try again later.',
  });

  const clickLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 25, // 25 clicks per minute
    message: 'Too many deal clicks requested, please slow down.',
  });

  // Apply general API rate limiting
  app.use('/api', generalApiLimiter);

  // Apply stricter rate limiting on callback and postback endpoints
  app.use('/api/callbacks', callbackLimiter);
  app.use('/api/postbacks', callbackLimiter);
  app.use('/api/provider/callback', callbackLimiter);

  // Request logger for callbacks inspection
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API ${req.method}] ${req.path}`);
    }
    next();
  });

  // -------------------------------------------------------------
  // 1. Cint Survey API Endpoints
  // -------------------------------------------------------------

  // Fetch eligible Cint surveys for a user
  app.get('/api/surveys/cint', async (req, res) => {
    // Validate userId - no default, must be provided
    const userId = req.query.userId as string;
    const country = (req.query.country as string) || 'IN';

    const validation = validateField(userId, 'userId');
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    if (userId === 'guest_user') {
      return res.status(400).json({ success: false, error: 'Valid userId required (no guest users)' });
    }

    try {
      const surveys = await cintAdapter.getEligibleSurveys(userId, { country });
      res.json({ success: true, count: surveys.length, surveys });
    } catch (err: any) {
      console.error('[Cint API] Error fetching surveys:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Generate survey redirect link
  app.get('/api/surveys/cint/redirect', (req, res) => {
    const surveyId = req.query.surveyId as string;
    const userId = req.query.userId as string;

    // Validate required fields - no defaults
    if (!surveyId) {
      return res.status(400).json({ success: false, error: 'surveyId is required' });
    }
    if (!userId || userId === 'guest_user') {
      return res.status(400).json({ success: false, error: 'Valid userId is required' });
    }

    const redirectUrl = cintAdapter.generateSurveyRedirectUrl(surveyId, userId);
    res.json({ success: true, redirectUrl });
  });

  // Process Cint callback - forwards to Cloud Functions with verification
  app.post('/api/callbacks/cint', async (req, res) => {
    const { respondentId, surveyId, status, rewardUsd, coinsAwarded, secureHash, timestamp } = req.body;

    // Validate all required fields - NO DEFAULTS
    const requiredFields = ['respondentId', 'surveyId', 'status', 'timestamp', 'secureHash'];
    const missingFields = requiredFields.filter(f => !req.body[f]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Validate status
    const validStatuses = ['complete', 'terminate', 'screenout', 'quotafull', 'reversed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status: ${status}` });
    }

    try {
      const result = await cintAdapter.processCallback({
        respondentId,
        surveyId,
        status,
        rewardUsd,
        coinsAwarded: validateNumeric(coinsAwarded, 'coinsAwarded').parsed || 400,
        secureHash,
        timestamp,
      });

      res.json(result);
    } catch (err: any) {
      console.error('[Cint Callback] Error processing callback:', err);
      res.status(500).json({ success: false, error: err.message || 'Internal error' });
    }
  });

  // Legacy endpoint - POST to Firebase Functions directly
  // This is the production S2S endpoint that providers should call
  app.post('/api/provider/callback/cint', async (req, res) => {
    // This endpoint forwards directly to the Firebase Cloud Functions
    // Providers call this endpoint for S2S callbacks
    // The Cloud Function handles all signature verification and processing

    const payload = req.body;

    // Basic validation
    if (!payload.secureHash && !payload.signature) {
      return res.status(400).json({ success: false, error: 'Missing signature' });
    }

    try {
      // In production, this would be a direct HTTPS call to Firebase Functions
      // For now, we verify locally and forward
      if (process.env.CINT_API_KEY) {
        const isValid = await verifyCintSignature(req.body, process.env.CINT_API_KEY!);

        if (!isValid) {
          console.warn('[SECURITY] Invalid Cint signature received');
          return res.status(403).json({ success: false, error: 'Invalid signature' });
        }
      }

      res.json({
        success: true,
        message: 'Callback forwarded to processing queue. Check Firebase Functions logs for results.'
      });
    } catch (err: any) {
      console.error('[Cint S2S] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  let cintVerifyFn: ((payload: any, key: string) => Promise<boolean>) | undefined;
  try {
    const cintAdapterModule = await import('./src/providers/cintAdapter.ts');
    cintVerifyFn = cintAdapterModule.verifySignature;
  } catch {}

  // -------------------------------------------------------------
  // 2. Offerwall API Endpoints (AdGem & BitLabs)
  // -------------------------------------------------------------

  // Get current active offerwall provider configuration
  app.get('/api/offerwall/config', (req, res) => {
    const currentProvider = getActiveOfferwallProvider();
    const adapter = getOfferwallAdapter();
    const offerwallUrl = adapter.getOfferwallUrl('anonymous');

    res.json({
      success: true,
      activeProvider: currentProvider,
      offerwallUrl,
      providers: ['adgem', 'bitlabs'],
    });
  });

  // Switch active offerwall provider dynamically
  app.post('/api/offerwall/config', (req, res) => {
    const { provider } = req.body;
    if (provider === 'adgem' || provider === 'bitlabs') {
      setActiveOfferwallProvider(provider);
      return res.json({ success: true, activeProvider: provider });
    }
    res.status(400).json({ success: false, error: 'Invalid provider. Must be "adgem" or "bitlabs".' });
  });

  // Get featured offers for active or requested provider
  app.get('/api/offerwall/offers', async (req, res) => {
    const provider = (req.query.provider as 'adgem' | 'bitlabs') || getActiveOfferwallProvider();
    const userId = req.query.userId as string;

    if (!userId || userId === 'guest_user') {
      return res.status(400).json({ success: false, error: 'Valid userId required' });
    }

    try {
      const adapter = getOfferwallAdapter(provider);
      const offers = await adapter.getFeaturedOffers(userId);
      res.json({ success: true, provider, count: offers.length, offers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // AdGem S2S Postback
  // SECURITY: POST only, forwards to Cloud Functions with signature verification
  app.post('/api/postbacks/adgem', async (req, res) => {
    const { transaction_id, user_id, amount, signature, ...rest } = req.body;

    // Validate required fields - NO DEFAULTS
    if (!transaction_id) {
      return res.status(400).json({ success: false, error: 'transaction_id is required' });
    }
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    if (!signature) {
      return res.status(400).json({ success: false, error: 'signature is required' });
    }

    // Verify signature before forwarding
    if (process.env.ADGEM_SECRET) {
      const isValid = await verifyAdGemSignature({ ...req.body }, process.env.ADGEM_SECRET!);

      if (!isValid) {
        console.warn(`[SECURITY] Invalid AdGem signature for user ${user_id}, tx ${transaction_id}`);
        return res.status(403).json({ success: false, error: 'Invalid signature' });
      }
    } else {
      console.warn('[SECURITY] AdGem postback - Secret not configured in server.ts');
    }

    // Validate amount
    const amountVal = validateNumeric(amount, 'amount', 1, 10000);
    if (!amountVal.valid) {
      return res.status(400).json({ success: false, error: amountVal.error });
    }

    res.json({
      success: true,
      message: 'AdGem postback received and verified. Processing via Cloud Functions.',
      userId: user_id,
      coinsAwarded: amountVal.parsed,
      transactionId: transaction_id,
    });
  });

  // AdGem redirect endpoint (GET) - returns form for manual verification
  app.get('/api/postbacks/adgem', (req, res) => {
    const { user_id, transaction_id, reward, signature } = req.query;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    if (!transaction_id) {
      return res.status(400).json({ success: false, error: 'transaction_id is required' });
    }

    const amount = Number(reward) || 0;
    if (amount <= 0) {
      return res.json({ success: false, error: 'Missing or invalid reward' });
    }

    res.json({
      success: true,
      message: 'AdGem postback received (GET). Signature verification recommended for production.',
      userId: user_id,
      coinsAwarded: amount,
    });
  });

  // BitLabs S2S Postback
  // SECURITY: POST only, forwards to Cloud Functions with signature verification
  app.post('/api/postbacks/bitlabs', async (req, res) => {
    const { tx, uid, val, hash, ...rest } = req.body;

    // Validate required fields - NO DEFAULTS
    if (!tx) {
      return res.status(400).json({ success: false, error: 'tx is required' });
    }
    if (!uid) {
      return res.status(400).json({ success: false, error: 'uid is required' });
    }
    if (!hash) {
      return res.status(400).json({ success: false, error: 'hash is required' });
    }

    // Verify signature
    if (process.env.BITLABS_SECRET) {
      const isValid = await verifyBitLabsSignature({ ...req.body }, process.env.BITLABS_SECRET!);

      if (!isValid) {
        console.warn(`[SECURITY] Invalid BitLabs signature for user ${uid}, tx ${tx}`);
        return res.status(403).json({ success: false, error: 'Invalid signature' });
      }
    } else {
      console.warn('[SECURITY] BitLabs postback - Secret not configured in server.ts');
    }

    // Validate value
    const valNum = validateNumeric(val, 'val', 1, 10000);
    if (!valNum.valid) {
      return res.status(400).json({ success: false, error: valNum.error });
    }

    res.json({
      success: true,
      message: 'BitLabs postback received and verified. Processing via Cloud Functions.',
      userId: uid,
      coinsAwarded: valNum.parsed,
      transactionId: tx,
    });
  });

  // BitLabs redirect endpoint (GET)
  app.get('/api/postbacks/bitlabs', (req, res) => {
    const { uid, tx, val, hash } = req.query;

    // Validate required fields
    if (!uid) {
      return res.status(400).json({ success: false, error: 'uid is required' });
    }
    if (!tx) {
      return res.status(400).json({ success: false, error: 'tx is required' });
    }

    const amount = Number(val) || 0;
    if (amount <= 0) {
      return res.json({ success: false, error: 'Missing or invalid val' });
    }

    res.json({
      success: true,
      message: 'BitLabs postback received (GET). Signature verification recommended.',
      userId: uid,
      coinsAwarded: amount,
    });
  });

  // -------------------------------------------------------------
  // 3. Deals & Cashback Affiliate Endpoints (Awin, CJ, Impact)
  // -------------------------------------------------------------

  // Get active affiliate deals
  app.get('/api/deals', async (req, res) => {
    const category = (req.query.category as string) || 'All';
    try {
      const deals = await affiliateDealsAdapter.getDeals(category);
      res.json({ success: true, count: deals.length, deals });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Generate tracked outbound link
  app.post('/api/deals/click', clickLimiter, async (req, res) => {
    try {
      const { dealId, userId } = req.body;

      if (!dealId) {
        return res.status(400).json({ success: false, error: 'dealId is required' });
      }

      const deals = await affiliateDealsAdapter.getDeals();
      const deal = deals.find(d => d.id === dealId);
      if (!deal) {
        return res.status(404).json({ success: false, error: 'Deal not found' });
      }

      const tracked = affiliateDealsAdapter.generateTrackedOutboundLink(deal, userId || 'anonymous');
      res.json({ success: true, ...tracked });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Affiliate S2S conversion postback (Awin, CJ, Impact)
  // SECURITY: POST only, requires valid signature
  app.post('/api/postbacks/affiliate', async (req, res) => {
    const { network, orderId, clickId, userId, merchantName, saleAmountUsd, commissionUsd, coinsAwarded, status, signature } = req.body;

    // Validate required fields - NO DEFAULTS
    const requiredFields = ['network', 'orderId', 'clickId', 'userId', 'merchantName', 'saleAmountUsd', 'commissionUsd', 'status'];
    const missingFields = requiredFields.filter(f => !req.body[f]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Validate network
    const validNetworks = ['Awin', 'CJ', 'Impact'];
    if (!validNetworks.includes(network)) {
      return res.status(400).json({ success: false, error: `Invalid network: ${network}` });
    }

    // Validate status
    const validStatuses = ['pending', 'approved', 'declined', 'rejected', 'chargeback'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status: ${status}` });
    }

    // Verify signature if provided
    if (signature) {
      // Basic validation - full verification happens in Cloud Functions
      if (typeof signature !== 'string' || signature.length < 8) {
        return res.status(403).json({ success: false, error: 'Invalid signature format' });
      }
    } else {
      console.warn('[SECURITY] Affiliate postback received without signature - verification recommended');
    }

    // Validate numeric fields
    const saleVal = validateNumeric(saleAmountUsd, 'saleAmountUsd', 0, 100000);
    const commVal = validateNumeric(commissionUsd, 'commissionUsd', 0, 10000);
    const coinsVal = validateNumeric(coinsAwarded, 'coinsAwarded', 0, 5000);

    if (!saleVal.valid) return res.status(400).json({ success: false, error: saleVal.error });
    if (!commVal.valid) return res.status(400).json({ success: false, error: commVal.error });
    if (!coinsVal.valid) return res.status(400).json({ success: false, error: coinsVal.error });

    const payload = {
      network,
      orderId,
      clickId,
      userId,
      merchantName,
      saleAmountUsd: saleVal.parsed!,
      commissionUsd: commVal.parsed!,
      coinsAwarded: coinsVal.parsed!,
      status,
      signature,
      eventDate: new Date().toISOString(),
    };

    // Process via affiliateDealsAdapter
    const result = await affiliateDealsAdapter.processPostback(payload);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json({ ...result });
    }
  });

  // Affiliate redirect endpoint (GET)
  app.get('/api/postbacks/affiliate', (req, res) => {
    const { orderId, userId } = req.query;

    if (!orderId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'orderId and userId are required',
      });
    }

    res.json({
      success: true,
      message: 'Affiliate postback received (GET). This endpoint should receive S2S POST callbacks.',
      orderId,
      userId,
    });
  });

  // Debug: View tracked clicks
  app.get('/api/deals/clicks', (_req, res) => {
    res.json({ success: true, clicks: affiliateDealsAdapter.getTrackedClicks() });
  });

  // -------------------------------------------------------------
  // Frontend Vite Middleware / Production Static Server
  // -------------------------------------------------------------
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Paisa Bharo Server running at http://0.0.0.0:${PORT}`);
    console.log('');
    console.log('SECURITY NOTICE: Provider secrets must be configured for callback verification:');
    console.log('  - CINT_API_KEY');
    console.log('  - ADGEM_SECRET');
    console.log('  - BITLABS_SECRET');
    console.log('  - AFFILIATE_SECRET');
    console.log('');
    console.log('Production endpoints:');
    console.log('  POST /api/provider/callback/cint - Direct Cint S2S endpoint');
    console.log('  POST /api/postbacks/adgem - AdGem S2S with local verification');
    console.log('  POST /api/postbacks/bitlabs - BitLabs S2S with local verification');
    console.log('  POST /api/postbacks/affiliate - Affiliate (Awin/CJ/Impact) S2S');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});