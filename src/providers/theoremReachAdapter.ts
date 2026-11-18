import type { TheoremReachLaunchResponse } from '../services/cloudFunctions';

export interface TheoremReachLaunchSession extends TheoremReachLaunchResponse {
  provider: 'theoremreach';
  userId: string;
}

export type TheoremReachUrlRequester = () => Promise<{ data: TheoremReachLaunchResponse }>;

/**
 * Dedicated TheoremReach frontend survey adapter.
 *
 * Security model:
 * - Never embeds or receives THEOREMREACH_SECRET or signs URLs in browser code.
 * - Requests a freshly signed respondent_entry/direct URL from the Cloud Function
 *   `getTheoremReachLaunchUrl`, which authenticates the Firebase user UID server-side.
 */
export class TheoremReachAdapter {
  readonly providerName = 'theoremreach' as const;
  readonly appId = '25991';
  readonly currency = 'coin';
  readonly exchangeRate = 1000;
  readonly callbackMode = 'server-side' as const;
  private readonly requestSignedUrl: TheoremReachUrlRequester;

  constructor(
    requestSignedUrl: TheoremReachUrlRequester = () =>
      import('../services/cloudFunctions').then((m) => m.getTheoremReachLaunchUrlFn())
  ) {
    this.requestSignedUrl = requestSignedUrl;
  }

  async createLaunchSession(userId: string): Promise<TheoremReachLaunchSession> {
    const cleanUid = typeof userId === 'string' ? userId.trim() : '';
    if (!cleanUid || cleanUid === 'guest_user') {
      throw new Error('Please sign in with an authenticated account to launch TheoremReach surveys.');
    }

    const response = await this.requestSignedUrl();
    const data = response?.data;

    if (!data || typeof data.launchUrl !== 'string' || !data.launchUrl.startsWith('https://theoremreach.com/')) {
      throw new Error('Server returned an invalid TheoremReach launch URL.');
    }

    return {
      provider: 'theoremreach',
      userId: cleanUid,
      launchUrl: data.launchUrl,
      transactionId: data.transactionId,
      appId: data.appId || this.appId,
      currency: data.currency || this.currency,
      exchangeRate: data.exchangeRate || this.exchangeRate,
    };
  }
}

export const theoremReachAdapter = new TheoremReachAdapter();
