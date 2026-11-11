export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  coinsBalance?: number;
  lifetimeEarnings?: number;
  streakDays?: number;
  lastCheckInDate?: string; // YYYY-MM-DD
  referralCode?: string;
  referredBy?: string;
  country: string;
  currency: string;
  language: string;
  timezone?: string;
  createdAt?: string;
  updatedAt?: string;
  // CRITICAL: isAdmin is a runtime-only field determined by Firebase Auth custom claims.
  // It is NOT stored in Firestore. Use the useIsAdmin() hook to get admin status.
  isAdmin?: boolean;
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  title: string;
  category: 'Tech' | 'Lifestyle' | 'Finance' | 'Entertainment' | 'Gaming' | 'Shopping' | 'General';
  options: PollOption[];
  rewardCoins: number;
  totalVotes: number;
  country?: string; // If set, tailored for region or 'GLOBAL'
  expiresIn?: string;
  userVotedIndex?: number;
}

export interface PollVoteRecord {
  id: string;
  pollId: string;
  userId: string;
  selectedOptionIndex: number;
  earnedCoins: number;
  createdAt: string;
}

export interface SurveyQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'rating';
  options?: string[];
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  category: string;
  rewardCoins: number;
  estimatedMinutes: number;
  questionsCount: number;
  questions: SurveyQuestion[];
  country?: string;
  sponsor: string;
  completed?: boolean;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  category: 'app' | 'survey' | 'quiz' | 'gaming' | 'finance' | 'shopping';
  rewardCoins: number;
  provider: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeEstimate: string;
  country?: string;
  actionUrl?: string;
  badge?: string;
  steps: string[];
  icon: string;
}

export interface UserTask {
  id: string;
  userId: string;
  offerId: string;
  status: 'in_progress' | 'completed' | 'verified';
  rewardCoins: number;
  completedAt?: string;
}

export interface PayoutMethod {
  id: string;
  name: string;
  iconName: string;
  brandColor: string;
  category: 'direct' | 'giftcard' | 'crypto';
  currency: string;
  minCoins: number;
  conversionRateText: string;
  placeholder: string;
  helpText: string;
  denominations: {
    coins: number;
    amount: number;
  }[];
}

export interface RedemptionRecord {
  id: string;
  userId: string;
  payoutMethod: string;
  amountCurrency: number;
  currency: string;
  coinsSpent: number;
  accountDetails: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  avatar: string;
  coins: number;
  countryCode: string;
  badge?: string;
}

export interface SystemSettingsState {
  offerwallProvider: 'adgem' | 'bitlabs';
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maxDailyCoins: number;
  streakMultiplier: number;
  referralBonus: number;
  updatedAt?: string;
  updatedBy?: string;
}
