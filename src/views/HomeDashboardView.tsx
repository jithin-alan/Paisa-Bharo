import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Edit2,
  Play,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Maximize2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { WalletIllustration, MascotReferIllustration, QuestConquerorBadge, PaisaBharoCoin } from '../components/Illustrations';
import { formatCoinsValue } from '../services/currencies';
import { PWAInstallButton } from '../components/PWAInstallButton';
import {
  theoremReachAdapter,
  TheoremReachLaunchSession,
} from '../providers/theoremReachAdapter';

interface Props {
  onNavigateTab: (tab: 'home' | 'polls' | 'offers' | 'cashout' | 'refer' | 'settings') => void;
  onOpenTheoremReach?: () => void;
}

export const HomeDashboardView: React.FC<Props> = ({
  onNavigateTab,
  onOpenTheoremReach,
}) => {
  const { user, firebaseUser, selectedCurrency, setActiveSurvey, surveys, votePoll } = useApp();

  // Defensive check: user should always exist when this view is rendered
  // but handle null/undefined gracefully to prevent crashes
  const coins = user?.coinsBalance ?? 0;
  const lifetime = user?.lifetimeEarnings ?? 0;
  const authUid = firebaseUser?.uid || '';

  const [trSession, setTrSession] = useState<TheoremReachLaunchSession | null>(null);
  const [trLoading, setTrLoading] = useState<boolean>(false);
  const [trError, setTrError] = useState<string | null>(null);
  const [trFrameStatus, setTrFrameStatus] = useState<'idle' | 'loading' | 'loaded' | 'blocked'>('idle');
  const [trFrameKey, setTrFrameKey] = useState<number>(0);
  const trRequestSeqRef = useRef<number>(0);

  const loadTheoremReachPreview = useCallback(async () => {
    const requestSeq = ++trRequestSeqRef.current;

    if (!authUid || authUid === 'guest_user') {
      setTrSession(null);
      setTrError('Sign in with an authenticated account to view live TheoremReach surveys.');
      setTrFrameStatus('idle');
      setTrLoading(false);
      return;
    }

    setTrSession(null);
    setTrLoading(true);
    setTrError(null);
    setTrFrameStatus('idle');
    try {
      const nextSession = await theoremReachAdapter.createLaunchSession(authUid);
      if (requestSeq !== trRequestSeqRef.current) return;
      setTrSession(nextSession);
      setTrFrameStatus('loading');
      setTrFrameKey((prev) => prev + 1);
    } catch (err: any) {
      if (requestSeq !== trRequestSeqRef.current) return;
      console.warn('TheoremReach home preview notice:', err?.message || err);
      setTrSession(null);
      setTrError(err?.message || 'Unable to load TheoremReach surveys right now.');
      setTrFrameStatus('idle');
    } finally {
      if (requestSeq === trRequestSeqRef.current) {
        setTrLoading(false);
      }
    }
  }, [authUid]);

  useEffect(() => {
    loadTheoremReachPreview();
    return () => {
      trRequestSeqRef.current += 1;
    };
  }, [loadTheoremReachPreview]);

  useEffect(() => {
    if (trFrameStatus !== 'loading') return;
    const timer = window.setTimeout(() => {
      setTrFrameStatus((prev) => (prev === 'loading' ? 'blocked' : prev));
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [trFrameStatus, trFrameKey]);

  const [questTasks, setQuestTasks] = useState([
    { id: 't1', title: 'Vote in a daily poll', completed: false },
    { id: 't2', title: 'Complete a TheoremReach survey', completed: false },
    { id: 't3', title: 'Claim your daily check-in streak', completed: false },
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
      id: 'theoremreach',
      name: 'TheoremReach Surveys',
      subtitle: 'High-fill global surveys · 1,000 coins per $1 USD · Auto-credited',
      icon: (
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3c098d] to-[#072ac8] flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
          TR
        </div>
      ),
      iconColor: 'text-[#3c098d]',
      minMax: '50–2,000+',
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

      {/* Active Survey Provider Strip */}
      {onOpenTheoremReach && (
        <div className="bg-white rounded-2xl border border-[#bde0fe] p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider hidden sm:inline">
              Active Provider:
            </span>
            <button
              onClick={onOpenTheoremReach}
              className="px-3.5 py-1.5 rounded-xl bg-[#f3ecff] hover:bg-[#e8d9ff] text-[#3c098d] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-[#d6c2ff]"
            >
              <span>📋 TheoremReach Surveys</span>
            </button>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Auto-credited · 1,000 coins per $1 USD
          </span>
        </div>
      )}

      {/* Available Surveys by Active Provider - Moved below Active Provider strip */}
      {/* Available Surveys by Active Provider */}
      <section className="space-y-5" aria-label="Available Surveys by Provider">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-900">
              Available Surveys
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Live surveys grouped by active provider
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('polls')}
            className="text-xs font-bold text-[#072ac8] hover:text-[#05219e] flex items-center gap-0.5 cursor-pointer shrink-0"
          >
            <span>All Polls &amp; Surveys</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Provider 1: TheoremReach Live Surveys */}
        <div className="bg-white rounded-[26px] border border-[#bde0fe] shadow-[0_4px_20px_rgba(7,42,200,0.05)] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3c098d] to-[#072ac8] flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
                TR
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-gray-900 truncate">
                  TheoremReach
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  50–2,000+ Coins · 1,000 coins per $1 USD · Auto-credited
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadTheoremReachPreview}
                disabled={trLoading}
                className="min-h-[40px] min-w-[40px] px-3 rounded-xl border border-[#bde0fe] bg-white hover:bg-[#e6f4fa] text-gray-700 hover:text-[#072ac8] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                title="Refresh TheoremReach surveys"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    trLoading || trFrameStatus === 'loading' ? 'animate-spin text-[#072ac8]' : ''
                  }`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {onOpenTheoremReach && (
                <button
                  type="button"
                  onClick={onOpenTheoremReach}
                  className="min-h-[40px] px-3.5 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full View</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative w-full h-[460px] bg-white">
            {trLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2.5 bg-white">
                <RefreshCw className="w-7 h-7 text-[#072ac8] animate-spin" />
                <p className="text-xs font-bold text-gray-700">
                  Loading available TheoremReach surveys…
                </p>
              </div>
            )}

            {!trLoading && trError && (
              <div className="absolute inset-0 flex items-center justify-center p-6 bg-white">
                <div className="max-w-md w-full rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3 text-xs text-amber-900">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-extrabold text-gray-900">
                        TheoremReach Surveys Unavailable
                      </p>
                      <p className="text-amber-800 leading-relaxed">{trError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={loadTheoremReachPreview}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            )}

            {!trLoading && !trError && trSession && trSession.verifiedUserId === authUid && (
              <>
                <iframe
                  key={`${authUid}-${trFrameKey}`}
                  title="TheoremReach Available Surveys"
                  src={trSession.launchUrl}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
                  onLoad={() => setTrFrameStatus('loaded')}
                  onError={() => setTrFrameStatus('blocked')}
                />

                {trFrameStatus === 'loading' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2.5 bg-white/95 pointer-events-none">
                    <RefreshCw className="w-6 h-6 text-[#072ac8] animate-spin" />
                    <p className="text-xs font-semibold text-gray-600">
                      Connecting to TheoremReach…
                    </p>
                  </div>
                )}

                {trFrameStatus === 'blocked' && (
                  <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2 text-xs text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-gray-900">
                          Survey frame took too long or was blocked
                        </p>
                        <p className="text-amber-800 mt-0.5">
                          Retry loading inline or open TheoremReach directly in a full tab.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={loadTheoremReachPreview}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                      <a
                        href={trSession.launchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white font-bold text-xs inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <span>Open in New Tab</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {trSession && (
            <div className="px-5 py-2.5 bg-[#f7f8fc] border-t border-gray-100 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
              <span>Completed surveys credit automatically to your wallet.</span>
              <a
                href={trSession.launchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#072ac8] hover:text-[#05219e] inline-flex items-center gap-1 hover:underline"
              >
                <span>Open in full tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Provider 2: Paisa Bharo Direct Research Surveys */}
        {surveys.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#e6f4fa] border border-[#bde0fe] flex items-center justify-center text-[#072ac8] font-black text-xs shrink-0">
                PB
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900">
                  Paisa Bharo Direct Surveys
                </h3>
                <p className="text-xs text-gray-500">
                  In-app research studies · Instant coin reward
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {surveys.map((survey, idx) => (
                <div
                  key={`home-survey-${survey.id}-${idx}`}
                  className={`rounded-[24px] border p-5 flex flex-col justify-between transition-all ${
                    survey.completed
                      ? 'bg-gray-50 border-gray-200 opacity-65'
                      : 'bg-white border-[#bde0fe] hover:border-[#072ac8] shadow-[0_4px_20px_rgba(7,42,200,0.05)]'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      {survey.category} · ~{survey.estimatedMinutes} mins · {survey.questionsCount} questions
                    </p>
                    <h4 className="font-extrabold text-sm text-gray-900 line-clamp-2 leading-snug">
                      {survey.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                      {survey.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <PaisaBharoCoin className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-black text-gray-900 tabular-nums">
                        +{survey.rewardCoins}
                      </span>
                      <span className="text-[11px] text-gray-400 truncate">
                        ({formatCoinsValue(survey.rewardCoins, selectedCurrency)})
                      </span>
                    </div>

                    {survey.completed ? (
                      <span className="text-xs font-semibold text-[#072ac8] flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveSurvey(survey)}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white font-extrabold text-xs transition cursor-pointer active:scale-95 shadow-sm shrink-0"
                      >
                        Start Survey
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

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

        {/* Active Survey Partner Spotlight (Right) */}
        <div className="md:col-span-6 flex flex-col gap-3.5">
          {surveyPartners.map((p, idx) => (
            <div
              key={`partner-${p.id}-${idx}`}
              onClick={() => onOpenTheoremReach?.()}
              className="flex-1 bg-white rounded-[26px] border border-[#bde0fe] hover:border-[#072ac8] p-5 sm:p-6 shadow-[0_4px_20px_rgba(7,42,200,0.05)] hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {p.icon}
                    <div>
                      <h3 className={`text-base font-black tracking-tight ${p.iconColor}`}>
                        {p.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-gray-400 font-medium block">
                    Earn upto
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <PaisaBharoCoin className="w-5 h-5 shrink-0" />
                    <span className="text-lg font-black text-gray-900 tabular-nums">
                      {p.minMax} Coins
                    </span>
                  </div>
                </div>
                <span className="px-4 py-2.5 rounded-xl bg-[#072ac8] group-hover:bg-[#05219e] text-white text-xs font-extrabold transition shadow-sm shrink-0">
                  Open Surveys &rsaquo;
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
