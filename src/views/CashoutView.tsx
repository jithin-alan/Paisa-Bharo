import React, { useState } from 'react';
import { Wallet, CheckCircle2, AlertCircle, ArrowUpRight, ShieldCheck, ChevronRight, X, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../services/i18n';
import { SUPPORTED_CURRENCIES, getCurrencyConfig, formatCoinsValue } from '../services/currencies';
import { PayoutMethod } from '../types';
import { WalletIllustration, PollPeCoin } from '../components/Illustrations';

export const CashoutView: React.FC = () => {
  const { user, selectedCurrency, setCurrency, selectedLanguage, redemptions, requestRedemption } = useApp();

  // Defensive check: user should always exist but handle null gracefully
  const coinsBalance = user?.coinsBalance ?? 0;

  const [selectedMethod, setSelectedMethod] = useState<PayoutMethod | null>(null);
  const [selectedDenom, setSelectedDenom] = useState<{ coins: number; amount: number } | null>(null);
  const [accountInput, setAccountInput] = useState('');
  const [activeTab, setActiveTab] = useState<'store' | 'history'>('store');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const currencyConfig = getCurrencyConfig(selectedCurrency);

  const handleOpenRedeem = (method: PayoutMethod) => {
    setSelectedMethod(method);
    setSelectedDenom(method.denominations[0] || null);
    setAccountInput('');
    setMessage(null);
  };

  const handleConfirmRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod || !selectedDenom) return;

    if (!accountInput.trim()) {
      setMessage({ text: 'Please enter your payout account details.', type: 'error' });
      return;
    }

    if (coinsBalance < selectedDenom.coins) {
      setMessage({ text: `Insufficient coins. You need ${selectedDenom.coins} Coins for this payout.`, type: 'error' });
      return;
    }

    setIsSubmitting(true);
    const res = await requestRedemption(
      selectedMethod.name,
      selectedDenom.amount,
      selectedDenom.coins,
      accountInput.trim()
    );
    setIsSubmitting(false);

    if (res.success) {
      setMessage({ text: getTranslation(selectedLanguage, 'successRedeem'), type: 'success' });
      setTimeout(() => {
        setSelectedMethod(null);
      }, 2000);
    } else {
      setMessage({ text: res.message || 'Redemption failed', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Wallet Balance Header matching PollPe Card */}
      <div className="bg-white rounded-[26px] border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-5">
          <WalletIllustration className="w-20 h-20 sm:w-24 sm:h-24 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-gray-500 block">
              {getTranslation(selectedLanguage, 'balance')}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <PollPeCoin className="w-6 h-6 shrink-0" />
              <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {coinsBalance.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1 flex items-center gap-1.5 font-medium">
              <span>≈ {formatCoinsValue(coinsBalance, selectedCurrency)} Real Value</span>
              <span className="text-[#7848f4] font-black">({selectedCurrency})</span>
            </div>
          </div>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-2 bg-[#f0ebfc] p-1.5 rounded-2xl border border-[#e5dcfa] self-start sm:self-auto">
          <span className="text-xs text-gray-600 px-2 font-bold">Currency:</span>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {Object.keys(SUPPORTED_CURRENCIES).map((currCode) => {
              const conf = SUPPORTED_CURRENCIES[currCode];
              return (
                <button
                  key={currCode}
                  onClick={() => setCurrency(currCode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                    selectedCurrency === currCode
                      ? 'bg-[#7848f4] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <span>{conf.flag}</span>
                  <span>{conf.code}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Store vs History */}
      <div className="flex items-center gap-2 p-1 bg-white rounded-2xl border border-[#e5dcfa] max-w-xs shadow-sm">
        <button
          onClick={() => setActiveTab('store')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === 'store'
              ? 'bg-[#7848f4] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Payout Store
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#7848f4] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          History ({redemptions.length})
        </button>
      </div>

      {activeTab === 'store' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <span>{getTranslation(selectedLanguage, 'payoutMethods')}</span>
              <span className="text-xs font-normal text-gray-500">
                ({currencyConfig.flag} {currencyConfig.name})
              </span>
            </h3>
            <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7848f4]" />
              <span>Instant Bank & Wallet Payouts</span>
            </span>
          </div>

          {/* Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currencyConfig.payoutMethods.map((method) => {
              const canAffordMin = coinsBalance >= method.minCoins;

              return (
                <div
                  key={method.id}
                  onClick={() => handleOpenRedeem(method)}
                  className={`bg-white rounded-[24px] border p-5 sm:p-6 flex flex-col justify-between transition-all cursor-pointer shadow-[0_4px_20px_rgba(120,72,244,0.05)] hover:shadow-lg ${
                    canAffordMin
                      ? 'border-[#7848f4]/40 hover:border-[#7848f4]'
                      : 'border-[#e5dcfa] hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                          style={{ backgroundColor: method.brandColor }}
                        >
                          <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-base text-gray-900">{method.name}</h4>
                          <span className="text-xs text-[#7848f4] font-black">
                            {method.conversionRateText}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-gray-600 bg-[#f0ebfc] px-2.5 py-0.5 rounded-lg">
                        Min {method.minCoins} Coins
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-3 line-clamp-2">
                      {method.helpText}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <span>Available:</span>
                      <strong className="text-gray-900 font-extrabold">
                        {method.denominations.map(d => `${currencyConfig.symbol}${d.amount}`).join(', ')}
                      </strong>
                    </div>

                    <button
                      className={`px-5 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        canAffordMin
                          ? 'bg-[#7848f4] hover:bg-[#6837e3] text-white shadow-[0_4px_12px_rgba(120,72,244,0.3)] active:scale-95'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <span>Redeem</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        /* Redemptions History */
        <section className="space-y-3">
          {redemptions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 bg-white rounded-[24px] border border-[#e5dcfa]">
              No redemptions requested yet. Earn coins and cash out above!
            </div>
          ) : (
            <div className="space-y-2.5">
              {redemptions.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-[22px] bg-white border border-[#e5dcfa] flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#f0ebfc] flex items-center justify-center text-[#7848f4]">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900">{item.payoutMethod}</h4>
                      <p className="text-[11px] text-gray-500">
                        To: {item.accountDetails} • {new Date(item.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-[#7848f4]">
                      {currencyConfig.symbol}{item.amountCurrency}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      -{item.coinsSpent} Coins
                    </div>
                    <span
                      className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1 ${
                        item.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Redemption Modal */}
      {selectedMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-[28px] bg-white border border-[#e5dcfa] shadow-2xl p-6 text-gray-900 relative space-y-5">
            <button
              onClick={() => setSelectedMethod(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-xl hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: selectedMethod.brandColor }}
              >
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">{selectedMethod.name}</h3>
                <span className="text-xs text-[#7848f4] font-black">{selectedMethod.conversionRateText}</span>
              </div>
            </div>

            {/* Select Denomination */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Select Payout Amount
              </label>
              <div className="grid grid-cols-2 gap-2">
                {selectedMethod.denominations.map((denom, idx) => {
                  const isChosen = selectedDenom?.coins === denom.coins;
                  const affordable = coinsBalance >= denom.coins;

                  return (
                    <button
                      key={`denom-${denom.coins}-${idx}`}
                      type="button"
                      onClick={() => setSelectedDenom(denom)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        isChosen
                          ? 'bg-[#f0ebfc] border-[#7848f4] text-[#7848f4] font-bold shadow-sm'
                          : affordable
                          ? 'bg-white border-gray-200 text-gray-800 hover:border-[#7848f4]'
                          : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'
                      }`}
                    >
                      <div className="text-base font-black text-gray-900">
                        {currencyConfig.symbol}{denom.amount}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {denom.coins.toLocaleString()} Coins
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account Details Form */}
            <form onSubmit={handleConfirmRedeem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {getTranslation(selectedLanguage, 'accountDetails')}
                </label>
                <input
                  type="text"
                  required
                  value={accountInput}
                  onChange={(e) => setAccountInput(e.target.value)}
                  placeholder={selectedMethod.placeholder}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#7848f4] transition"
                />
                <p className="text-[11px] text-gray-500">{selectedMethod.helpText}</p>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !selectedDenom || coinsBalance < (selectedDenom?.coins || 0)}
                className={`w-full py-3.5 rounded-xl font-black text-xs transition shadow-lg cursor-pointer flex items-center justify-center gap-2 ${
                  coinsBalance >= (selectedDenom?.coins || 0) && !isSubmitting
                    ? 'bg-[#7848f4] hover:bg-[#6837e3] text-white shadow-[0_4px_14px_rgba(120,72,244,0.35)] active:scale-95'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <span>Processing Payout...</span>
                ) : (
                  <>
                    <span>Confirm & Withdraw {currencyConfig.symbol}{selectedDenom?.amount}</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
