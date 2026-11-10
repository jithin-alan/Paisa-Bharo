export interface CintSurvey {
  id: string;
  name: string;
  category: string;
  cpiUsd: number;
  rewardCoins: number;
  loiMinutes: number; // Length of interview
  incidenceRate: number; // Expected qualification %
  matchScore: number;
  status: 'active' | 'paused';
  qualificationCriteria?: string[];
  redirectUrl: string;
}

export interface CintCallbackPayload {
  respondentId: string;
  surveyId: string;
  status: 'complete' | 'terminate' | 'screenout' | 'quotafull' | 'reversed';
  rewardUsd?: number;
  coinsAwarded?: number;
  subId?: string;
  secureHash?: string;
  timestamp: string;
}

export interface OfferwallItem {
  id: string;
  provider: 'adgem' | 'bitlabs';
  title: string;
  description: string;
  rewardCoins: number;
  category: 'game' | 'app' | 'survey' | 'subscription';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeEstimate: string;
  platform: 'android' | 'ios' | 'web' | 'all';
  actionUrl: string;
  icon: string;
  bannerGradient: string;
  badge?: string;
}

export interface PostbackResult {
  success: boolean;
  provider: string;
  transactionId: string;
  userId: string;
  coinsAwarded: number;
  status: 'credited' | 'duplicate' | 'invalid_signature' | 'reversed';
  message: string;
}

export interface IOfferwallAdapter {
  readonly providerName: 'adgem' | 'bitlabs';
  getOfferwallUrl(userId: string, customParams?: Record<string, string>): string;
  getFeaturedOffers(userId: string): Promise<OfferwallItem[]>;
  processPostback(payload: Record<string, any>): Promise<PostbackResult>;
}

export interface AffiliateDeal {
  id: string;
  merchantName: string;
  network: 'Awin' | 'CJ' | 'Impact';
  category: 'Shopping' | 'Travel' | 'Electronics' | 'Fashion' | 'Food';
  cashbackTag: string; // e.g. "Up to 10% Coins Cashback"
  estimatedDays: string;
  logo: string;
  description: string;
  destinationUrl: string;
  popularCoupons?: string[];
}

export interface AffiliatePostbackPayload {
  network: 'Awin' | 'CJ' | 'Impact';
  orderId: string;
  clickId: string;
  userId: string;
  merchantName: string;
  saleAmountUsd: number;
  commissionUsd: number;
  coinsAwarded: number;
  status: 'pending' | 'approved' | 'declined';
  eventDate: string;
}
