import type { TheoremReachLaunchResponse } from '../services/cloudFunctions';

export interface TheoremReachLaunchSession extends TheoremReachLaunchResponse {
  provider: 'theoremreach';
  userId: string;
  verifiedUserId: string;
  verifiedExternalId: string;
}

export type TheoremReachUrlRequester = () => Promise<{ data: TheoremReachLaunchResponse }>;

/**
 * Dedicated TheoremReach frontend survey adapter.
 *
 * Security model:
 * - Never embeds or receives THEOREMREACH_SECRET or signs URLs in browser code.
 * - Requests a freshly signed respondent_entry/direct URL from the Cloud Function
 *   `getTheoremReachLaunchUrl`, which authenticates the Firebase user UID server-side.
 * - Verifies on the client that both `user_id` and `external_id` in the launch URL
 *   strictly match the authenticated user's UID before embedding.
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

    if (!data || typeof data.launchUrl !== 'string') {
      throw new Error('Server returned an invalid TheoremReach launch URL.');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(data.launchUrl);
    } catch {
      throw new Error('Server returned an invalid TheoremReach launch URL.');
    }

    if (
      parsedUrl.origin !== 'https://theoremreach.com' ||
      parsedUrl.pathname !== '/respondent_entry/direct'
    ) {
      throw new Error('Server returned an invalid TheoremReach launch URL.');
    }

    const urlUserId = parsedUrl.searchParams.get('user_id') ?? '';
    const urlExternalId = parsedUrl.searchParams.get('external_id') ?? '';
    const urlTransactionId = parsedUrl.searchParams.get('transaction_id') ?? '';

    if (urlUserId !== cleanUid || urlExternalId !== cleanUid) {
      throw new Error('TheoremReach launch URL user identity mismatch.');
    }

    if (data.transactionId && urlTransactionId !== data.transactionId) {
      throw new Error('TheoremReach launch URL transaction mismatch.');
    }

    return {
      provider: 'theoremreach',
      userId: cleanUid,
      verifiedUserId: urlUserId,
      verifiedExternalId: urlExternalId,
      launchUrl: data.launchUrl,
      transactionId: data.transactionId,
      appId: data.appId || this.appId,
      currency: data.currency || this.currency,
      exchangeRate: data.exchangeRate || this.exchangeRate,
    };
  }
}

export const theoremReachAdapter = new TheoremReachAdapter();
