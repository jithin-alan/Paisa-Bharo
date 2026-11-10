import { CashConversionSnapshot, CoinToCurrencyRate } from '../../types/wallet';

export class ConversionService {
  static roundMinor(amount: number, currency: string): number {
    // All currencies supported use 2 decimal minor units
    return Math.round(amount);
  }

  static convertCoinsToCash(coins: number, rate: CoinToCurrencyRate): CashConversionSnapshot {
    // rate.coinsPerUnitMinor = coins per 1 currency minor unit
    // e.g., 500 coins per ₹1 => coinsPerUnitMinor = 500
    const grossMinor = Math.floor(coins / rate.coinsPerUnitMinor);
    const remainderCoins = coins % rate.coinsPerUnitMinor;
    const feeMinor = 0; // fee applied later
    const netMinor = grossMinor - feeMinor;

    return {
      coinsConverted: coins - remainderCoins,
      currency: rate.currency,
      rate: rate.coinsPerUnitMinor,
      rateVersion: rate.rateVersion,
      grossAmountMinor: grossMinor,
      feeMinor,
      netAmountMinor: netMinor,
      conversionTimestamp: new Date().toISOString(),
    };
  }

  static applyFees(snapshot: CashConversionSnapshot, feeFixedMinor: number, feePercent: number): CashConversionSnapshot {
    const percentFee = Math.floor(snapshot.grossAmountMinor * feePercent / 100);
    const feeMinor = feeFixedMinor + percentFee;
    const netAmountMinor = Math.max(0, snapshot.grossAmountMinor - feeMinor);
    return { ...snapshot, feeMinor, netAmountMinor };
  }
}
