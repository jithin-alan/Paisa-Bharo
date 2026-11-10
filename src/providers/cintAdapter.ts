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
 * Cint Survey Supply Adapter
 * Manages survey inventory, user-specific survey routing, and completion/reversal callbacks.
 */
export class CintSurveyAdapter {
  private apiKey: string;
  private apiBaseUrl: string;
  private coinExchangeRate: number; // Coins per USD

  constructor(apiKey = 'dummy_cint_api_key_sandbox', apiBaseUrl = 'https://api.cint.com/v1', coinExchangeRate = 1000) {
    this.apiKey = apiKey;
    this.apiBaseUrl = apiBaseUrl;
    this.coinExchangeRate = coinExchangeRate;
  }

  /**
   * Fetches eligible surveys for a given user profile.
   * In sandbox mode, returns curated high-match surveys with realistic LOI and rewards.
   */
  async getEligibleSurveys(userId: string, userProfile?: { country?: string; age?: number; gender?: string }): Promise<CintSurvey[]> {
    // When live credentials are supplied, this will call `fetch(`${this.apiBaseUrl}/fulfillment/respondents/${userId}/surveys`...)`
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

  /**
   * Generates a tracked Cint survey redirect URL for the respondent.
   */
  generateSurveyRedirectUrl(surveyId: string, userId: string, subId?: string): string {
    const params = new URLSearchParams({
      survey_id: surveyId,
      respondent_id: userId,
      sub_id: subId || 'paisabhar_web',
      callback_url: `/api/callbacks/cint?respondentId=${userId}&surveyId=${surveyId}`,
    });

    return `https://s.cint.com/survey/entry?${params.toString()}`;
  }

  /**
   * Processes incoming Cint completion or reversal callbacks (S2S or redirect return).
   */
  processCallback(payload: CintCallbackPayload): CintCallbackResult {
    const txKey = `cint_${payload.surveyId}_${payload.respondentId}_${payload.status}`;

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

    // Screenout or Quotafull: award small consolation (e.g. 10 coins)
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
