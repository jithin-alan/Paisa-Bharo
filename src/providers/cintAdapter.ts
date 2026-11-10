import { CintSurvey, CintCallbackPayload } from './types';

export interface CintCallbackResult {
  success: boolean;
  status: 'complete' | 'terminate' | 'screenout' | 'quotafull' | 'reversed';
  coinsAwarded: number;
  message: string;
  transactionId: string;
}

// In-memory set of processed transactions to prevent duplicate crediting
const processedTransactions = new Set<string>();

/**
 * Helper: Convert string to ArrayBuffer for Web Crypto API
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const result = encoder.encode(str);
  return result.buffer.slice(0, result.byteLength) as ArrayBuffer;
}

/**
 * Helper: Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * HMAC-SHA256 using Web Crypto API
 */
async function hmacSha256(key: string, data: string): Promise<string> {
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : (await import('crypto')).webcrypto;
  const keyBuffer = stringToArrayBuffer(key);
  const dataBuffer = stringToArrayBuffer(data);

  const cryptoKey = await cryptoObj.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await cryptoObj.subtle.sign('HMAC', cryptoKey, dataBuffer);
  return arrayBufferToHex(signature);
}

/**
 * Timing-safe comparison for hex strings
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies Cint callback signature using HMAC-SHA256
 * Cint provides a secureHash field that should be verified
 */
async function verifyCintSignature(payload: CintCallbackPayload, apiKey: string): Promise<boolean> {
  const hash = payload.secureHash;
  if (!hash || typeof hash !== 'string') {
    return false;
  }

  // Cint signature verification: timestamp|respondentId|surveyId|status|subId
  const verifyString = [
    payload.timestamp,
    payload.respondentId,
    payload.surveyId,
    payload.status,
    payload.subId || 'paisabhar_web',
  ].join('|');

  const expectedHash = await hmacSha256(apiKey, verifyString);
  return timingSafeEqual(hash, expectedHash);
}

/**
 * Cint Survey Supply Adapter
 */
export class CintSurveyAdapter {
  private apiKey: string;
  private apiBaseUrl: string;
  private coinExchangeRate: number;

  constructor(apiKey = 'dummy_cint_api_key_sandbox', apiBaseUrl = 'https://api.cint.com/v1', coinExchangeRate = 1000) {
    this.apiKey = apiKey;
    this.apiBaseUrl = apiBaseUrl;
    this.coinExchangeRate = coinExchangeRate;
  }

  async getEligibleSurveys(userId: string, userProfile?: { country?: string; age?: number; gender?: string }): Promise<CintSurvey[]> {
    const isIndia = (userProfile?.country || 'INR') === 'INR';

    return [
      {
        id: 'cint_srv_901',
        name: 'Consumer Tech & Smartphone Buying Habits 2026',
        category: 'Technology & Gadgets',
        cpiUsd: 1.25,
        rewardCoins: 450,
        loiMinutes: 8,
        incidenceRate: 85,
        matchScore: 98,
        status: 'active',
        qualificationCriteria: ['Owns a smartphone', 'Age 18-45', 'Makes online purchases'],
        redirectUrl: this.generateSurveyRedirectUrl('cint_srv_901', userId),
      },
      {
        id: 'cint_srv_902',
        name: 'Fast Moving Goods & Supermarket Brand Loyalty',
        category: 'FMCG & Groceries',
        cpiUsd: 0.80,
        rewardCoins: 300,
        loiMinutes: 6,
        incidenceRate: 92,
        matchScore: 95,
        status: 'active',
        qualificationCriteria: ['Household grocery decision maker'],
        redirectUrl: this.generateSurveyRedirectUrl('cint_srv_902', userId),
      },
      {
        id: 'cint_srv_903',
        name: isIndia ? 'Digital Payments, UPI & Wallet Usage in India' : 'Mobile Banking & Fintech Solutions',
        category: 'Finance & Banking',
        cpiUsd: 2.10,
        rewardCoins: 750,
        loiMinutes: 12,
        incidenceRate: 70,
        matchScore: 91,
        status: 'active',
        qualificationCriteria: ['Has active bank account', 'Uses UPI or mobile wallet daily'],
        redirectUrl: this.generateSurveyRedirectUrl('cint_srv_903', userId),
      },
      {
        id: 'cint_srv_904',
        name: 'Streaming Video & OTT Entertainment Preferences',
        category: 'Media & Entertainment',
        cpiUsd: 0.65,
        rewardCoins: 250,
        loiMinutes: 5,
        incidenceRate: 95,
        matchScore: 88,
        status: 'active',
        qualificationCriteria: ['Watches streaming content weekly'],
        redirectUrl: this.generateSurveyRedirectUrl('cint_srv_904', userId),
      },
      {
        id: 'cint_srv_905',
        name: 'Global Travel & Holiday Destination Trends',
        category: 'Travel & Tourism',
        cpiUsd: 1.80,
        rewardCoins: 600,
        loiMinutes: 10,
        incidenceRate: 65,
        matchScore: 84,
        status: 'active',
        qualificationCriteria: ['Traveled for leisure in past 12 months'],
        redirectUrl: this.generateSurveyRedirectUrl('cint_srv_905', userId),
      },
    ];
  }

  generateSurveyRedirectUrl(surveyId: string, userId: string, subId?: string): string {
    const params = new URLSearchParams({
      survey_id: surveyId,
      respondent_id: userId,
      sub_id: subId || 'paisabhar_web',
      callback_url: `/api/callbacks/cint?respondentId=${userId}&surveyId=${surveyId}`,
    });

    return `https://s.cint.com/survey/entry?${params.toString()}`;
  }

  async processCallback(payload: CintCallbackPayload): Promise<CintCallbackResult> {
    const txKey = `cint_${payload.surveyId}_${payload.respondentId}_${payload.status}`;

    // SECURITY: Verify signature before processing
    if (this.apiKey && this.apiKey !== 'dummy_cint_api_key_sandbox') {
      const isValid = await verifyCintSignature(payload, this.apiKey);
      if (!isValid) {
        console.warn(`[SECURITY] Cint callback signature verification failed for survey ${payload.surveyId}, respondent ${payload.respondentId}`);
        return {
          success: false,
          status: payload.status,
          coinsAwarded: 0,
          message: `Invalid Cint callback signature. Security verification failed for survey ${payload.surveyId}.`,
          transactionId: txKey,
        };
      }
    } else {
      console.warn('[SECURITY] Cint callback using unverified dummy API key');
    }

    if (processedTransactions.has(txKey)) {
      return {
        success: false,
        status: payload.status,
        coinsAwarded: 0,
        message: 'Duplicate callback detected; already processed.',
        transactionId: txKey,
      };
    }

    if (payload.status === 'complete') {
      const rewardCoins = payload.coinsAwarded || (payload.rewardUsd ? Math.round(payload.rewardUsd * this.coinExchangeRate) : 400);
      processedTransactions.add(txKey);

      return {
        success: true,
        status: 'complete',
        coinsAwarded: rewardCoins,
        message: `Cint survey successfully completed. Awarded ${rewardCoins} coins!`,
        transactionId: txKey,
      };
    }

    if (payload.status === 'reversed') {
      const penaltyCoins = payload.coinsAwarded || 400;
      processedTransactions.add(txKey);

      return {
        success: true,
        status: 'reversed',
        coinsAwarded: -penaltyCoins,
        message: `Cint survey reversed by sponsor (speeding/inconsistent answers). Deducted ${penaltyCoins} coins.`,
        transactionId: txKey,
      };
    }

    if (payload.status === 'screenout' || payload.status === 'quotafull') {
      const consolationCoins = 15;
      processedTransactions.add(txKey);

      return {
        success: true,
        status: payload.status,
        coinsAwarded: consolationCoins,
        message: `Survey ${payload.status === 'quotafull' ? 'quota was reached' : 'criteria did not match'}. +${consolationCoins} consolation coins credited.`,
        transactionId: txKey,
      };
    }

    return {
      success: false,
      status: payload.status,
      coinsAwarded: 0,
      message: 'Survey was terminated without completion.',
      transactionId: txKey,
    };
  }
}

// Singleton export
export const cintAdapter = new CintSurveyAdapter();