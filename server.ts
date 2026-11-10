import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { cintAdapter } from './src/providers/cintAdapter.ts';
import {
  adGemAdapter,
  bitLabsAdapter,
  getActiveOfferwallProvider,
  setActiveOfferwallProvider,
  getOfferwallAdapter,
} from './src/providers/offerwallAdapter.ts';
import { affiliateDealsAdapter } from './src/providers/affiliateDealsAdapter.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logger for postbacks/callbacks inspection
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
    try {
      const userId = (req.query.userId as string) || 'guest_user';
      const country = (req.query.country as string) || 'INR';
      const surveys = await cintAdapter.getEligibleSurveys(userId, { country });
      res.json({ success: true, count: surveys.length, surveys });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Generate survey redirect link
  app.get('/api/surveys/cint/redirect', (req, res) => {
    const surveyId = (req.query.surveyId as string) || 'cint_srv_901';
    const userId = (req.query.userId as string) || 'guest_user';
    const redirectUrl = cintAdapter.generateSurveyRedirectUrl(surveyId, userId);
    res.json({ success: true, redirectUrl });
  });

  // Process Cint callback (Supports both POST S2S and GET redirect returns)
  const handleCintCallback = (req: express.Request, res: express.Response) => {
    const payload = {
      respondentId: req.body.respondentId || req.query.respondentId || 'guest_user',
      surveyId: req.body.surveyId || req.query.surveyId || 'cint_srv_901',
      status: (req.body.status || req.query.status || 'complete') as any,
      rewardUsd: parseFloat((req.body.rewardUsd || req.query.rewardUsd || '0.80') as string),
      coinsAwarded: parseInt((req.body.coinsAwarded || req.query.coinsAwarded || '400') as string, 10),
      timestamp: new Date().toISOString(),
    };

    const result = cintAdapter.processCallback(payload);
    res.json(result);
  };

  app.post('/api/callbacks/cint', handleCintCallback);
  app.get('/api/callbacks/cint', handleCintCallback);

  // -------------------------------------------------------------
  // 2. Offerwall API Endpoints (AdGem & BitLabs)
  // -------------------------------------------------------------

  // Get current active offerwall provider configuration
  app.get('/api/offerwall/config', (req, res) => {
    const userId = (req.query.userId as string) || 'guest_user';
    const currentProvider = getActiveOfferwallProvider();
    const adapter = getOfferwallAdapter();
    const offerwallUrl = adapter.getOfferwallUrl(userId);

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
    try {
      const provider = (req.query.provider as 'adgem' | 'bitlabs') || getActiveOfferwallProvider();
      const userId = (req.query.userId as string) || 'guest_user';
      const adapter = getOfferwallAdapter(provider);
      const offers = await adapter.getFeaturedOffers(userId);
      res.json({ success: true, provider, count: offers.length, offers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // AdGem Server-to-Server Postback
  const handleAdGemPostback = async (req: express.Request, res: express.Response) => {
    const payload = { ...req.query, ...req.body };
    const result = await adGemAdapter.processPostback(payload);
    // AdGem expects HTTP 200 with confirmation
    if (result.success) {
      res.status(200).json({ ...result, adgemCode: 1 });
    } else {
      res.status(200).json({ ...result, adgemCode: 0 });
    }
  };

  app.post('/api/postbacks/adgem', handleAdGemPostback);
  app.get('/api/postbacks/adgem', handleAdGemPostback);

  // BitLabs Server-to-Server Postback
  const handleBitLabsPostback = async (req: express.Request, res: express.Response) => {
    const payload = { ...req.query, ...req.body };
    const result = await bitLabsAdapter.processPostback(payload);
    // BitLabs expects HTTP 200 with confirmation
    res.status(200).json({ ...result, bitlabsOutcome: result.success ? 'success' : 'error' });
  };

  app.post('/api/postbacks/bitlabs', handleBitLabsPostback);
  app.get('/api/postbacks/bitlabs', handleBitLabsPostback);

  // -------------------------------------------------------------
  // 3. Deals & Cashback Affiliate Endpoints (Awin, CJ, Impact)
  // -------------------------------------------------------------

  // Get active affiliate deals
  app.get('/api/deals', async (req, res) => {
    try {
      const category = (req.query.category as string) || 'All';
      const deals = await affiliateDealsAdapter.getDeals(category);
      res.json({ success: true, count: deals.length, deals });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Generate tracked outbound link
  app.post('/api/deals/click', async (req, res) => {
    try {
      const { dealId, userId } = req.body;
      const deals = await affiliateDealsAdapter.getDeals();
      const deal = deals.find(d => d.id === dealId);
      if (!deal) {
        return res.status(404).json({ success: false, error: 'Deal not found' });
      }

      const tracked = affiliateDealsAdapter.generateTrackedOutboundLink(deal, userId || 'guest_user');
      res.json({ success: true, ...tracked });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Affiliate S2S conversion postback (Awin, CJ, Impact)
  const handleAffiliatePostback = async (req: express.Request, res: express.Response) => {
    const payload = {
      network: (req.body.network || req.query.network || 'Awin') as any,
      orderId: (req.body.orderId || req.query.orderId || `ord_${Date.now()}`) as string,
      clickId: (req.body.clickId || req.query.clickId || `clk_${Date.now()}`) as string,
      userId: (req.body.userId || req.query.userId || 'guest_user') as string,
      merchantName: (req.body.merchantName || req.query.merchantName || 'Amazon') as string,
      saleAmountUsd: parseFloat((req.body.saleAmountUsd || req.query.saleAmountUsd || '45.00') as string),
      commissionUsd: parseFloat((req.body.commissionUsd || req.query.commissionUsd || '3.60') as string),
      coinsAwarded: parseInt((req.body.coinsAwarded || req.query.coinsAwarded || '500') as string, 10),
      status: (req.body.status || req.query.status || 'approved') as any,
      eventDate: new Date().toISOString(),
    };

    const result = await affiliateDealsAdapter.processPostback(payload);
    res.json(result);
  };

  app.post('/api/postbacks/affiliate', handleAffiliatePostback);
  app.get('/api/postbacks/affiliate', handleAffiliatePostback);

  // Debug: View tracked clicks
  app.get('/api/deals/clicks', (_req, res) => {
    res.json({ success: true, clicks: affiliateDealsAdapter.getTrackedClicks() });
  });

  // -------------------------------------------------------------
  // Frontend Vite Middleware / Production Static Server
  // -------------------------------------------------------------
  if (!isProd) {
    const vite = await createViteServer({
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
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
