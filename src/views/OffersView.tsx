import React, { useState } from 'react';
import { Target, CheckCircle2, ChevronRight, Zap, ExternalLink, ShieldCheck, X, Gamepad2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../services/i18n';
import { formatCoinsValue } from '../services/currencies';
import { Offer } from '../types';
import { PollPeCoin } from '../components/Illustrations';
import { OfferwallModal } from '../components/OfferwallModal';

export const OffersView: React.FC = () => {
  const { offers, selectedLanguage, selectedCurrency, votePoll, activeOfferwallProvider } = useApp();
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isOfferwallOpen, setIsOfferwallOpen] = useState(false);
  const [claimedTasks, setClaimedTasks] = useState<string[]>(() => {
    const saved = localStorage.getItem('paisabhar_claimed_offers');
    return saved ? JSON.parse(saved) : [];
  });
  const [verifying, setVerifying] = useState(false);

  const categories = [
    { id: 'all', label: 'All Tasks' },
    { id: 'quiz', label: 'Quizzes' },
    { id: 'finance', label: 'Fintech & Wallets' },
    { id: 'gaming', label: 'Games' },
    { id: 'app', label: 'App Installs' },
  ];

  const filteredOffers = offers.filter(o => {
    if (activeCategory === 'all') return true;
    return o.category === activeCategory;
  });

  const handleCompleteOffer = async (offer: Offer) => {
    setVerifying(true);
    setTimeout(() => {
      const updated = [...claimedTasks, offer.id];
      setClaimedTasks(updated);
      localStorage.setItem('paisabhar_claimed_offers', JSON.stringify(updated));

      votePoll('offer_' + offer.id, 0);
      setVerifying(false);
      setSelectedOffer(null);
    }, 1500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header banner in PollPe Clean Purple Theme */}
      <div className="rounded-[26px] bg-white border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] text-gray-900">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f0ebfc] flex items-center justify-center text-[#7848f4]">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900">
              {getTranslation(selectedLanguage, 'offersTab')}
            </h2>
            <p className="text-xs text-gray-500">
              Complete verified partner tasks, install trending apps, or take quizzes for big rewards.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#7848f4] font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Verified Partners & Instant Coin Crediting</span>
          </div>
          <span className="text-gray-400 font-medium">Daily Refresh</span>
        </div>
      </div>

      {/* Offerwall Hub Card: AdGem & BitLabs */}
      <div className="bg-gradient-to-r from-[#7848f4] to-[#9d65fc] rounded-[24px] p-5 sm:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-purple-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
              Featured Offerwall: {activeOfferwallProvider.toUpperCase()}
            </span>
            <span className="text-amber-300 text-xs font-black">Up to 5,000 🪙</span>
          </div>
          <h3 className="text-lg font-black tracking-tight">
            Play Trending Games & Unlock Mega Rewards
          </h3>
          <p className="text-xs text-white/80 max-w-md">
            Rise of Kingdoms, Coin Master, Bingo Blitz, and top apps with instant S2S postback tracking.
          </p>
        </div>

        <button
          onClick={() => setIsOfferwallOpen(true)}
          className="bg-white hover:bg-gray-100 text-[#7848f4] font-black text-xs px-5 py-3 rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
        >
          <Gamepad2 className="w-4 h-4 text-[#7848f4]" />
          <span>Launch Offerwall</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-[#7848f4] text-white shadow-sm'
                : 'bg-white hover:bg-[#f0ebfc] text-gray-600 border border-[#e5dcfa]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOffers.map((offer) => {
          const isDone = claimedTasks.includes(offer.id);

          return (
            <div
              key={offer.id}
              onClick={() => setSelectedOffer(offer)}
              className={`bg-white rounded-[24px] border p-5 flex items-center justify-between gap-4 transition-all cursor-pointer shadow-[0_4px_20px_rgba(120,72,244,0.05)] hover:shadow-md ${
                isDone
                  ? 'border-gray-200 opacity-60'
                  : 'border-[#e5dcfa] hover:border-[#7848f4]'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#f0ebfc] flex items-center justify-center shrink-0 text-[#7848f4]">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#7848f4] bg-[#f0ebfc] px-2 py-0.5 rounded-md">
                      {offer.provider}
                    </span>
                    {offer.badge && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded-md border border-amber-200">
                        {offer.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-900 truncate mt-1">
                    {offer.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                    {offer.description}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-sm font-black text-gray-900">+{offer.rewardCoins}</span>
                  <PollPeCoin className="w-4 h-4" />
                </div>
                <div className="text-[10px] text-gray-400">
                  {formatCoinsValue(offer.rewardCoins, selectedCurrency)}
                </div>

                {isDone ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7848f4] mt-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Done</span>
                  </span>
                ) : (
                  <div className="mt-1.5 text-xs font-bold text-[#7848f4] flex items-center justify-end gap-1">
                    <span>Start</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Offer Detail Modal */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-[28px] bg-white border border-[#e5dcfa] shadow-2xl p-6 text-gray-900 relative space-y-5">
            <button
              onClick={() => setSelectedOffer(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-xl hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#f0ebfc] flex items-center justify-center text-[#7848f4]">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#7848f4] bg-[#f0ebfc] px-2 py-0.5 rounded-md">
                  {selectedOffer.provider}
                </span>
                <h3 className="text-base font-black text-gray-900 mt-1">
                  {selectedOffer.title}
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f0ebfc] flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Task Reward</span>
              <div className="text-right flex items-center gap-1.5">
                <PollPeCoin className="w-5 h-5" />
                <span className="text-base font-black text-gray-900">
                  +{selectedOffer.rewardCoins} Coins
                </span>
                <span className="text-gray-500 text-[11px]">
                  ({formatCoinsValue(selectedOffer.rewardCoins, selectedCurrency)})
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Instructions to Complete:
              </h4>
              <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs text-gray-700">
                {selectedOffer.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#7848f4] text-white font-black flex items-center justify-center shrink-0 text-xs">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              {claimedTasks.includes(selectedOffer.id) ? (
                <div className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs text-center border border-gray-200 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#7848f4]" />
                  <span>Task Already Completed</span>
                </div>
              ) : (
                <button
                  disabled={verifying}
                  onClick={() => handleCompleteOffer(selectedOffer)}
                  className="w-full py-3.5 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {verifying ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Task Completion...</span>
                    </span>
                  ) : (
                    <>
                      <span>Complete Task & Claim Reward</span>
                      <ExternalLink className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Offerwall Modal */}
      <OfferwallModal
        isOpen={isOfferwallOpen}
        onClose={() => setIsOfferwallOpen(false)}
      />
    </div>
  );
};
