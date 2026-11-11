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