export type LedgerType = 'coin' | 'cash';
export type TransactionType = 
  | 'credit'
  | 'debit'
  | 'reversal'
  | 'adjustment'
  | 'conversion'
  | 'fee'
  | 'refund';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface LedgerTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  ledgerType: LedgerType;
  provider?: string;
  providerTransactionId?: string;
  amount: number; // integer coins or minor units
  currency?: string; // ISO 4217
  relatedTransactionId?: string;
  status: TransactionStatus;
  createdAt: string;
  processedAt?: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
  audit?: {
    createdBy?: string;
    notes?: string;
  };
}

export interface CoinBalanceProjection {
  availableCoins: number;
  pendingCoins: number;
  lifetimeEarned: number;
  reversedCoins: number;
  reservedCoins: number;
}

export interface CashConversionSnapshot {
  coinsConverted: number;
  currency: string;
  rate: number; // coins per currency unit? stored as integer ratio
  rateVersion: string;
  grossAmountMinor: number;
  feeMinor: number;
  netAmountMinor: number;
  conversionTimestamp: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  status: 'requested' | 'under_review' | 'approved' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'reversed';
  coinsReserved: number;
  currency: string;
  conversionSnapshot: CashConversionSnapshot;
  payoutMethodId: string;
  accountDetails: string;
  requestedAt: string;
  approvedAt?: string;
  paidAt?: string;
  providerTransactionId?: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface CoinToCurrencyRate {
  currency: string;
  coinsPerUnitMinor: number; // e.g., coins per 1 INR = 1 minor unit? Define clearly
  rateVersion: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface WithdrawalConfig {
  currency: string;
  minCoins: number;
  maxCoins: number;
  feeFixedMinor: number;
  feePercent: number;
  allowedMethods: string[];
}
