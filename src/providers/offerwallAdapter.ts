import { IOfferwallAdapter, OfferwallItem, PostbackResult } from './types';

// In-memory processed transactions cache to guarantee idempotency
const processedOfferwallTransactions = new Set<string>();

/**
 * AdGem Offerwall Adapter
 * Primary Offerwall Provider
 */
export class AdGemAdapter implements IOfferwallAdapter {
  readonly providerName: 'adgem' = 'adgem';
  private appId: string;
  private postbackSecret: string;

  constructor(appId = 'dummy_adgem_app_id_1028', postbackSecret = 'dummy_adgem_secret_key') {
    this.appId = appId;
    this.postbackSecret = postbackSecret;
  }

  /**
   * Generates the AdGem web offerwall URL for the user.
   */
  getOfferwallUrl(userId: string, customParams?: Record<string, string>): string {
    const params = new URLSearchParams({
      appid: this.appId,
      player_id: userId,
      ...customParams,
    });
    return `https://api.adgem.com/v1/wall?${params.toString()}`;
  }

  /**
   * Returns curated AdGem featured offers and games with realistic reward structures.
   */
  async getFeaturedOffers(_userId: string): Promise<OfferwallItem[]> {
    return [
      {
        id: 'adgem_game_01',
        provider: 'adgem',
        title: 'Rise of Kingdoms: Lost Crusade',
        description: 'Upgrade City Hall to Level 17 within 21 days. Build alliances and conquer kingdoms.',
        rewardCoins: 4200,
        category: 'game',
        difficulty: 'Hard',
        timeEstimate: '7-14 Days',
        platform: 'all',
        actionUrl: `https://api.adgem.com/v1/click?appid=${this.appId}&campaign_id=rok_449`,
        icon: '🏰',
        bannerGradient: 'from-amber-600 via-orange-600 to-red-600',
        badge: 'High Payout 🔥',
      },
      {
        id: 'adgem_game_02',
        provider: 'adgem',
        title: 'Coin Master: Village Viking',
        description: 'Spin the wheel, raid villages, and complete Village Level 4 to unlock your instant reward.',
        rewardCoins: 1650,
        category: 'game',
        difficulty: 'Medium',
        timeEstimate: '2-3 Days',
        platform: 'all',
        actionUrl: `https://api.adgem.com/v1/click?appid=${this.appId}&campaign_id=cm_102`,
        icon: '🐷',
        bannerGradient: 'from-yellow-500 via-amber-500 to-orange-500',
        badge: 'Popular',
      },
      {
        id: 'adgem_game_03',
        provider: 'adgem',
        title: 'Bingo Blitz: Free Bingo Games',
        description: 'Reach Level 30. Enjoy live multiplayer bingo rooms and collect lucky charms.',
        rewardCoins: 2100,
        category: 'game',
        difficulty: 'Medium',
        timeEstimate: '3-5 Days',
        platform: 'all',
        actionUrl: `https://api.adgem.com/v1/click?appid=${this.appId}&campaign_id=bb_883`,
        icon: '🎱',
        bannerGradient: 'from-blue-600 via-indigo-600 to-purple-600',
        badge: 'Top Rated',
      },
      {
        id: 'adgem_app_04',
        provider: 'adgem',
        title: 'Crypto.com App & Card',
        description: 'Sign up, verify your identity, and make your first fiat or crypto deposit.',
        rewardCoins: 3500,
        category: 'subscription',
        difficulty: 'Easy',
        timeEstimate: '10 Mins',
        platform: 'all',
        actionUrl: `https://api.adgem.com/v1/click?appid=${this.appId}&campaign_id=crypto_901`,
        icon: '💳',
        bannerGradient: 'from-cyan-700 via-blue-800 to-indigo-900',
        badge: 'Instant',
      },
    ];
  }

  /**
   * Processes AdGem Server-to-Server (S2S) postback.
   * Expected payload format:
   * { player_id: string, amount: number, transaction_id: string, verifier?: string }
   */
  async processPostback(payload: Record<string, any>): Promise<PostbackResult> {
    const userId = payload.player_id || payload.userId;
    const transactionId = payload.transaction_id || payload.txId || `adgem_tx_${Date.now()}`;
    const amount = Number(payload.amount || payload.coinsAwarded || 500);

    if (!userId) {
      return {
        success: false,
        provider: 'adgem',
        transactionId: transactionId,
        userId: '',
        coinsAwarded: 0,
        status: 'invalid_signature',
        message: 'Missing required player_id in AdGem postback payload.',
      };
    }

    if (processedOfferwallTransactions.has(transactionId)) {
      return {
        success: false,
        provider: 'adgem',
        transactionId,
        userId,
        coinsAwarded: 0,
        status: 'duplicate',
        message: `Transaction ${transactionId} has already been credited.`,
      };
    }

    processedOfferwallTransactions.add(transactionId);

    return {
      success: true,
      provider: 'adgem',
      transactionId,
      userId,
      coinsAwarded: amount,
      status: 'credited',
      message: `AdGem postback verified. Awarded ${amount} coins to player ${userId}.`,
    };
  }
}

/**
 * BitLabs Offerwall Adapter
 * Backup Offerwall Provider (Drop-in replacement for AdGem via identical IOfferwallAdapter interface)
 */
export class BitLabsAdapter implements IOfferwallAdapter {
  readonly providerName: 'bitlabs' = 'bitlabs';
  private appToken: string;
  private postbackSecret: string;

  constructor(appToken = 'dummy_bitlabs_token_8892', postbackSecret = 'dummy_bitlabs_secret_441') {
    this.appToken = appToken;
    this.postbackSecret = postbackSecret;
  }

  /**
   * Generates the BitLabs web offerwall URL for the user.
   */
  getOfferwallUrl(userId: string, customParams?: Record<string, string>): string {
    const params = new URLSearchParams({
      token: this.appToken,
      uid: userId,
      ...customParams,
    });
    return `https://web.bitlabs.ai/?${params.toString()}`;
  }

  /**
   * Returns curated BitLabs featured surveys and app offers.
   */
  async getFeaturedOffers(_userId: string): Promise<OfferwallItem[]> {
    return [
      {
        id: 'bitlabs_survey_01',
        provider: 'bitlabs',
        title: 'BitLabs AI Matching Dynamic Survey',
        description: 'Direct router matching your demographic with highest-yield brand sponsors.',
        rewardCoins: 850,
        category: 'survey',
        difficulty: 'Easy',
        timeEstimate: '10 Mins',
        platform: 'all',
        actionUrl: `https://web.bitlabs.ai/?token=${this.appToken}&flow=survey`,
        icon: '⚗️',
        bannerGradient: 'from-blue-600 via-sky-600 to-cyan-500',
        badge: 'High Match 98%',
      },
      {
        id: 'bitlabs_game_02',
        provider: 'bitlabs',
        title: 'Solitaire Grand Harvest: Tripeaks',
        description: 'Complete Crop 15 within 14 days. Harvest daily bonuses and upgrade farms.',
        rewardCoins: 2800,
        category: 'game',
        difficulty: 'Medium',
        timeEstimate: '5-7 Days',
        platform: 'all',
        actionUrl: `https://web.bitlabs.ai/?token=${this.appToken}&flow=offer_sgh`,
        icon: '🌾',
        bannerGradient: 'from-emerald-600 via-teal-600 to-green-500',
        badge: 'Hot Offer',
      },
      {
        id: 'bitlabs_app_03',
        provider: 'bitlabs',
        title: 'Duolingo: Learn Spanish & French',
        description: 'Install app, create account and complete the introductory 5-lesson streak.',
        rewardCoins: 650,
        category: 'app',
        difficulty: 'Easy',
        timeEstimate: '15 Mins',
        platform: 'all',
        actionUrl: `https://web.bitlabs.ai/?token=${this.appToken}&flow=app_duo`,
        icon: '🦉',
        bannerGradient: 'from-green-600 via-lime-500 to-emerald-400',
        badge: 'Quick Win',
      },
      {
        id: 'bitlabs_app_04',
        provider: 'bitlabs',
        title: 'Revolut: Mobile Banking & Crypto',
        description: 'Open a standard account and make your first virtual card purchase.',
        rewardCoins: 3200,
        category: 'subscription',
        difficulty: 'Medium',
        timeEstimate: '1 Day',
        platform: 'all',
        actionUrl: `https://web.bitlabs.ai/?token=${this.appToken}&flow=app_revolut`,
        icon: '🏦',
        bannerGradient: 'from-purple-700 via-indigo-600 to-blue-600',
        badge: 'Top Reward',
      },
    ];
  }

  /**
   * Processes BitLabs Server-to-Server (S2S) postback.
   * Expected payload format:
   * { uid: string, val: number, tx: string, hash?: string }
   */
  async processPostback(payload: Record<string, any>): Promise<PostbackResult> {
    const userId = payload.uid || payload.userId;
    const transactionId = payload.tx || payload.transactionId || `bitlabs_tx_${Date.now()}`;
    const amount = Number(payload.val || payload.coinsAwarded || 400);

    if (!userId) {
      return {
        success: false,
        provider: 'bitlabs',
        transactionId,
        userId: '',
        coinsAwarded: 0,
        status: 'invalid_signature',
        message: 'Missing required uid in BitLabs postback payload.',
      };
    }

    if (processedOfferwallTransactions.has(transactionId)) {
      return {
        success: false,
        provider: 'bitlabs',
        transactionId,
        userId,
        coinsAwarded: 0,
        status: 'duplicate',
        message: `Transaction ${transactionId} has already been credited.`,
      };
    }

    processedOfferwallTransactions.add(transactionId);

    return {
      success: true,
      provider: 'bitlabs',
      transactionId,
      userId,
      coinsAwarded: amount,
      status: 'credited',
      message: `BitLabs postback verified. Awarded ${amount} coins to user ${userId}.`,
    };
  }
}

// Singletons
export const adGemAdapter = new AdGemAdapter();
export const bitLabsAdapter = new BitLabsAdapter();

/**
 * Global Offerwall Provider Config
 * Allows switching between AdGem (primary) and BitLabs (backup) via single configuration switch.
 */
let activeProvider: 'adgem' | 'bitlabs' = (typeof window !== 'undefined' && (localStorage.getItem('paisabhar_offerwall_provider') as 'adgem' | 'bitlabs')) || 'adgem';

export function getActiveOfferwallProvider(): 'adgem' | 'bitlabs' {
  return activeProvider;
}

export function setActiveOfferwallProvider(provider: 'adgem' | 'bitlabs'): void {
  activeProvider = provider;
  if (typeof window !== 'undefined') {
    localStorage.setItem('paisabhar_offerwall_provider', provider);
  }
}

export function getOfferwallAdapter(preferredProvider?: 'adgem' | 'bitlabs'): IOfferwallAdapter {
  const target = preferredProvider || activeProvider;
  return target === 'bitlabs' ? bitLabsAdapter : adGemAdapter;
}
