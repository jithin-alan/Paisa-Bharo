import React, { useState } from 'react';
import { ChevronRight, Edit2, Play, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { WalletIllustration, MascotReferIllustration, QuestConquerorBadge, PaisaBharoCoin } from '../components/Illustrations';
import { formatCoinsValue } from '../services/currencies';
import { PWAInstallButton } from '../components/PWAInstallButton';

interface Props {
  onNavigateTab: (tab: 'home' | 'polls' | 'offers' | 'cashout' | 'refer' | 'settings' | 'deals') => void;
  onOpenOfferwall: (provider?: 'adgem' | 'bitlabs') => void;
  onOpenCintSurvey: (survey?: any) => void;
  onOpenWebhookTester: () => void;
}

export const HomeDashboardView: React.FC<Props> = ({
  onNavigateTab,
  onOpenOfferwall,
  onOpenCintSurvey,
  onOpenWebhookTester,
}) => {
  const { user, selectedCurrency, setActiveSurvey, surveys, votePoll } = useApp();

  // Defensive check: user should always exist when this view is rendered
  // but handle null/undefined gracefully to prevent crashes
  const coins = user?.coinsBalance ?? 0;
  const lifetime = user?.lifetimeEarnings ?? 0;

  const [questTasks, setQuestTasks] = useState([
    { id: 't1', title: 'Earn from Playtime', completed: false },
    { id: 't2', title: 'Complete a Pubscale task', completed: false },
    { id: 't3', title: 'Earn from Prime Offers', completed: false },
  ]);
  const [claimedOffers, setClaimedOffers] = useState<string[]>([]);

  const handleToggleTask = (id: string) => {
    setQuestTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleGetReward = (offerId: string, coins: number) => {
    if (claimedOffers.includes(offerId)) return;
    setClaimedOffers(prev => [...prev, offerId]);
    votePoll('rec_' + offerId, 0); // awards coins, triggers sound & confetti
  };

  const surveyPartners = [
    {
      id: 'bitlabs',
      name: 'Bitlabs',
      icon: (
        <div className="w-5 h-5 rounded-md bg-[#0066FF] flex items-center justify-center text-white font-black text-[10px]">
          ⚗️
        </div>
      ),
      iconColor: 'text-[#0066FF]',
      minMax: '250-700',
    },
    {
      id: 'cpx',
      name: 'CPX RESEARCH',
      icon: (
        <div className="w-5 h-5 rounded-full border-2 border-[#10B981] flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
        </div>
      ),
      iconColor: 'text-[#10B981]',
      minMax: '250-700',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* PWA Install Banner */}
      <PWAInstallButton variant="banner" />

      {/* Top Hero Section: Wallet Card + Refer Card (matches reference image top row) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Total Coins / Wallet Card */}
        <div className="bg-white rounded-[26px] border border-[#bde0fe] p-5 sm:p-6 shadow-[0_4px_20px_rgba(7,42,200,0.05)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <div className="shrink-0">
              <WalletIllustration className="w-20 h-20 sm:w-24 sm:h-24" />
            </div>

            <div className="min-w-0">
              <span className="text-xs font-semibold text-gray-500 block">
                Total Coins
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <PaisaBharoCoin className="w-6 h-6 shrink-0" />
                <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {coins.toLocaleString()}
                </span>
              </div>

              {/* Currency conversion progress pill */}
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex items-center gap-2 bg-[#e6f4fa] px-2.5 py-1 rounded-full text-xs font-bold text-[#072ac8]">
                  <span>{formatCoinsValue(coins, selectedCurrency)}</span>
                </div>
                <div className="w-24 sm:w-32 h-2 bg-[#e6f4fa] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#072ac8] to-[#0096c7] rounded-full"
                    style={{ width: `${Math.min(100, (coins / 1000) * 100)}%` }}
                  />
                </div>
                <button
                  onClick={() => onNavigateTab('settings')}
                  className="text-gray-400 hover:text-[#072ac8] p-1 transition"
                  title="Edit currency"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Withdraw Button */}
          <div className="shrink-0">
            <button
              onClick={() => onNavigateTab('cashout')}
              className="bg-gradient-to-r from-[#0096c7] to-[#072ac8] hover:from-[#072ac8] hover:to-[#023e8a] text-white font-extrabold text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl shadow-[0_4px_14px_rgba(7,42,200,0.35)] transition cursor-pointer active:scale-95"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Refer & Earn Mascot Card */}
        <div className="bg-white rounded-[26px] border border-[#bde0fe] p-5 sm:p-6 shadow-[0_4px_20px_rgba(7,42,200,0.05)] flex items-center gap-4 sm:gap-6">
          <div className="shrink-0">
            <MascotReferIllustration className="w-20 h-20 sm:w-24 sm:h-24" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#072ac8] block">
              REFER & EARN
            </span>
            <h3 className="text-base sm:text-lg font-black text-gray-900 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Invite Your Friend & get 500</span>
              <PaisaBharoCoin className="w-5 h-5 shrink-0 inline" />
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              + 10% of their earnings forever
            </p>

            <button
              onClick={() => onNavigateTab('refer')}
              className="mt-3 text-xs font-bold text-[#072ac8] hover:text-[#05219e] flex items-center gap-1 transition cursor-pointer group"
            >
              <span>Invite Now</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* 3rd Party Providers Strip: Cint, AdGem/BitLabs, Affiliate Deals */}
      <div className="bg-white rounded-2xl border border-[#bde0fe] p-3 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider hidden sm:inline">
            Active Providers:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onOpenCintSurvey()}
              className="px-3 py-1.5 rounded-xl bg-[#e6f4fa] hover:bg-[#d6eef8] text-[#072ac8] text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>📊 Cint Surveys</span>
            </button>
            <button
              onClick={() => onOpenOfferwall()}
              className="px-3 py-1.5 rounded-xl bg-[#fff0db] hover:bg-[#ffe5c7] text-[#b05d00] text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-[#ffd099]"
            >
              <span>🎮 Offerwall (AdGem / BitLabs)</span>
            </button>
            <button
              onClick={() => onNavigateTab('deals')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-emerald-200"
            >
              <span>🛍️ Deals & Cashback</span>
            </button>
          </div>
        </div>

        <button
          onClick={onOpenWebhookTester}
          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ml-auto"
          title="Open Postback & Webhook Simulator"
        >
          <span>⚡ Webhook Tester</span>
        </button>
      </div>

      {/* Middle Row: Quest for you (Left) + Partner Surveys Grid (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Woohoo! Quest for you (matches screenshot left) */}
        <div className="md:col-span-6 bg-white rounded-[26px] border border-[#bde0fe] p-5 sm:p-6 shadow-[0_4px_20px_rgba(7,42,200,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-gray-900">
                  Woohoo! Quest for you
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Earn Quest conqueror badge & ₹10 (🪙 1000)
                </p>
              </div>

              <div className="shrink-0 -mt-2 -mr-2">
                <QuestConquerorBadge className="w-16 h-16" />
              </div>
            </div>

            {/* Expired / Active banner */}
            <div className="my-3 py-1 px-4 rounded-xl bg-red-50 text-red-500 font-black text-xs tracking-wider text-center border border-red-100">
              EXPIRED!
            </div>

            {/* Quest items list */}
            <div className="space-y-3 pt-1">
              {questTasks.map((t, idx) => (
                <div
                  key={`task-${t.id}-${idx}`}
                  onClick={() => handleToggleTask(t.id)}
                  className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 cursor-pointer group"
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 transition flex items-center justify-center shrink-0 ${
                      t.completed
                        ? 'bg-[#072ac8] border-[#072ac8] text-white'
                        : 'border-gray-300 group-hover:border-[#072ac8]'
                    }`}
                  >
                    {t.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`text-xs font-semibold ${t.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2x2 Grid of Survey Partners (matches screenshot right) */}
        <div className="md:col-span-6 grid grid-cols-2 gap-3.5">
          {surveyPartners.map((p, idx) => (
            <div
              key={`partner-${p.id}-${idx}`}
              onClick={() => {
                if (p.id === 'bitlabs') {
                  onOpenOfferwall('bitlabs');
                } else {
                  onOpenCintSurvey();
                }
              }}
              className="bg-white rounded-[22px] border border-[#bde0fe] hover:border-[#072ac8] p-4 shadow-[0_4px_14px_rgba(7,42,200,0.04)] hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center gap-2">
                {p.icon}
                <span className={`text-xs font-black tracking-tight ${p.iconColor}`}>
                  {p.name}
                </span>
              </div>

              <div className="mt-4 pt-2 border-t border-gray-100 flex items-end justify-between">
                <div>
                  <span className="text-[11px] text-gray-400 font-medium block">
                    Earn upto
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <PaisaBharoCoin className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-black text-gray-900">
                      {p.minMax}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#072ac8] group-hover:underline">
                  {p.id === 'bitlabs' ? 'Open Wall ›' : 'Start ›'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section: Recommended Offers (matches screenshot 3-column cards) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">
            Recommended Offers
          </h2>
          <button
            onClick={() => onNavigateTab('offers')}
            className="text-xs font-bold text-[#072ac8] hover:text-[#05219e] flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Offers Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1: Nykaa */}
          <div className="bg-white rounded-[24px] border border-[#bde0fe] overflow-hidden shadow-[0_4px_20px_rgba(7,42,200,0.06)] hover:shadow-lg transition flex flex-col justify-between group">
            {/* Top Banner Image with Android badge */}
            <div className="relative h-32 sm:h-36 bg-gradient-to-tr from-[#FC2779] via-[#e21b6d] to-[#9c0d48] flex items-center justify-center overflow-hidden">
              <span className="text-7xl font-black text-white/20 select-none transform -rotate-12">
                N
              </span>
              {/* Android badge top right */}
              <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg flex items-center">
                <span className="text-emerald-400 text-xs">🤖</span>
              </div>
              {/* Logo Bottom Left */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white p-1 flex items-center justify-center font-black text-[#FC2779] text-xs shadow">
                  N
                </div>
                <span className="font-extrabold text-sm text-white drop-shadow">
                  Nykaa
                </span>
              </div>
            </div>

            {/* Bottom Details */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-semibold block">Nykaa</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-black text-gray-900">300</span>
                  <PaisaBharoCoin className="w-4 h-4" />
                </div>
              </div>

              <button
                disabled={claimedOffers.includes('nykaa')}
                onClick={() => handleGetReward('nykaa', 300)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-md active:scale-95 ${
                  claimedOffers.includes('nykaa')
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#072ac8] hover:bg-[#05219e] text-white shadow-[0_4px_12px_rgba(7,42,200,0.3)]'
                }`}
              >
                {claimedOffers.includes('nykaa') ? 'Claimed' : 'Get Rewards'}
              </button>
            </div>
          </div>

          {/* Card 2: HappyYou */}
          <div className="bg-white rounded-[24px] border border-[#bde0fe] overflow-hidden shadow-[0_4px_20px_rgba(7,42,200,0.06)] hover:shadow-lg transition flex flex-col justify-between group">
            <div className="relative h-32 sm:h-36 bg-gradient-to-tr from-[#99F6E4] via-[#5EEAD4] to-[#2DD4BF] flex items-center justify-center overflow-hidden">
              <span className="text-7xl font-black text-teal-800/20 select-none">
                ☺
              </span>
              <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg flex items-center">
                <span className="text-emerald-400 text-xs">🤖</span>
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white p-1 flex items-center justify-center text-teal-600 text-xs shadow">
                  😊
                </div>
                <span className="font-extrabold text-sm text-gray-900 drop-shadow-sm">
                  HappyYou
                </span>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-semibold block">HappyYou</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-black text-gray-900">200</span>
                  <PaisaBharoCoin className="w-4 h-4" />
                </div>
              </div>

              <button
                disabled={claimedOffers.includes('happyyou')}
                onClick={() => handleGetReward('happyyou', 200)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-md active:scale-95 ${
                  claimedOffers.includes('happyyou')
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#072ac8] hover:bg-[#05219e] text-white shadow-[0_4px_12px_rgba(7,42,200,0.3)]'
                }`}
              >
                {claimedOffers.includes('happyyou') ? 'Claimed' : 'Get Rewards'}
              </button>
            </div>
          </div>

          {/* Card 3: StockGro */}
          <div className="bg-white rounded-[24px] border border-[#bde0fe] overflow-hidden shadow-[0_4px_20px_rgba(7,42,200,0.06)] hover:shadow-lg transition flex flex-col justify-between group">
            <div className="relative h-32 sm:h-36 bg-gradient-to-tr from-[#d66e00] via-[#fb8500] to-[#ffb703] flex items-center justify-center overflow-hidden">
              <span className="text-7xl font-black text-white/20 select-none transform rotate-6">
                ⚡
              </span>
              <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg flex items-center">
                <span className="text-emerald-400 text-xs">🤖</span>
              </div>
              {/* Floating Blue Play Icon */}
              <div className="absolute bottom-2 right-4 w-10 h-10 rounded-full bg-[#072ac8] shadow-lg flex items-center justify-center text-white">
                <Play className="w-4 h-4 fill-white ml-0.5" />
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white p-1 flex items-center justify-center text-[#d66e00] font-black text-xs shadow">
                  S
                </div>
                <span className="font-extrabold text-sm text-white drop-shadow">
                  StockGro
                </span>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-semibold block">StockGro</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-black text-gray-900">100</span>
                  <PaisaBharoCoin className="w-4 h-4" />
                </div>
              </div>

              <button
                disabled={claimedOffers.includes('stockgro')}
                onClick={() => handleGetReward('stockgro', 100)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-md active:scale-95 ${
                  claimedOffers.includes('stockgro')
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#072ac8] hover:bg-[#05219e] text-white shadow-[0_4px_12px_rgba(7,42,200,0.3)]'
                }`}
              >
                {claimedOffers.includes('stockgro') ? 'Claimed' : 'Get Rewards'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
