import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  theoremReachAdapter,
  TheoremReachLaunchSession,
} from '../providers/theoremReachAdapter';
import { PaisaBharoCoin } from '../components/Illustrations';

interface Props {
  onBack: () => void;
}

type FrameStatus = 'idle' | 'loading' | 'loaded' | 'blocked';

const FRAME_LOAD_TIMEOUT_MS = 12000;

export const TheoremReachView: React.FC<Props> = ({ onBack }) => {
  const { user, firebaseUser } = useApp();
  const [session, setSession] = useState<TheoremReachLaunchSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [frameStatus, setFrameStatus] = useState<FrameStatus>('idle');
  const [frameKey, setFrameKey] = useState<number>(0);
  const requestSeqRef = useRef<number>(0);

  const authUid = firebaseUser?.uid || '';
  const coinsBalance = user?.coinsBalance ?? 0;

  const loadSignedSession = useCallback(async () => {
    const requestSeq = ++requestSeqRef.current;

    if (!authUid || authUid === 'guest_user') {
      setError('Please sign in to access surveys.');
      setSession(null);
      setFrameStatus('idle');
      setLoading(false);
      return;
    }

    setSession(null);
    setLoading(true);
    setError(null);
    setFrameStatus('idle');
    try {
      const nextSession = await theoremReachAdapter.createLaunchSession(authUid);
      if (requestSeq !== requestSeqRef.current) return;
      setSession(nextSession);
      setFrameStatus('loading');
      setFrameKey((prev) => prev + 1);
    } catch (err: any) {
      if (requestSeq !== requestSeqRef.current) return;
      console.warn('TheoremReach session unavailable:', err?.message || err);
      const message =
        err?.message ||
        'Unable to load TheoremReach surveys right now. Please try again.';
      setError(message);
      setSession(null);
      setFrameStatus('idle');
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [authUid]);

  useEffect(() => {
    loadSignedSession();
    return () => {
      requestSeqRef.current += 1;
    };
  }, [loadSignedSession]);

  // Watchdog timer so blocked or stalled third-party embeds offer a clear fallback
  useEffect(() => {
    if (frameStatus !== 'loading') return;

    const timer = window.setTimeout(() => {
      setFrameStatus((prev) => (prev === 'loading' ? 'blocked' : prev));
    }, FRAME_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [frameStatus, frameKey]);

  const handleFrameLoad = () => {
    setFrameStatus('loaded');
  };

  const handleFrameError = () => {
    setFrameStatus('blocked');
  };

  return (
    <section
      className="space-y-4 animate-fade-in"
      aria-label="TheoremReach Surveys"
    >
      {/* Compact Native App Header Bar */}
      <div className="bg-white rounded-[24px] border border-[#bde0fe] px-4 py-3 sm:px-5 sm:py-3.5 shadow-[0_4px_20px_rgba(7,42,200,0.05)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-[#bde0fe] bg-[#f7f8fc] hover:bg-[#e6f4fa] text-[#072ac8] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#072ac8]"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3c098d] to-[#072ac8] flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
            TR
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-gray-900 truncate">
              TheoremReach Surveys
            </h1>
            <p className="text-xs text-gray-500 truncate">
              1,000 coins per $1 USD · Auto-credited
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f7f8fc] border border-[#d0e8f7]"
            title="Current coin balance"
          >
            <PaisaBharoCoin className="w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-black text-gray-900 tabular-nums">
              {coinsBalance.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={loadSignedSession}
            disabled={loading}
            className="min-h-[44px] min-w-[44px] rounded-xl border border-[#bde0fe] bg-white hover:bg-[#e6f4fa] text-gray-600 hover:text-[#072ac8] flex items-center justify-center transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#072ac8]"
            title="Refresh surveys"
            aria-label="Refresh surveys"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading || frameStatus === 'loading' ? 'animate-spin text-[#072ac8]' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Seamless In-App Survey Surface */}
      <div className="bg-white rounded-[24px] border border-[#bde0fe] shadow-[0_4px_20px_rgba(7,42,200,0.05)] overflow-hidden flex flex-col">
        <div className="relative w-full h-[calc(100dvh-260px)] min-h-[520px] bg-white">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-white">
              <RefreshCw className="w-8 h-8 text-[#072ac8] animate-spin" />
              <p className="text-sm font-bold text-gray-800">
                Loading your survey wall…
              </p>
              <p className="text-xs text-gray-500">
                Matching available surveys for your profile
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="absolute inset-0 flex items-center justify-center p-6 bg-white">
              <div className="max-w-md w-full rounded-2xl bg-amber-50 border border-amber-200 p-5 space-y-4 text-xs text-amber-900">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-extrabold text-gray-900">
                      Surveys Couldn&apos;t Load
                    </p>
                    <p className="text-amber-800 leading-relaxed">{error}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={loadSignedSession}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white font-bold text-xs transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                  <button
                    type="button"
                    onClick={onBack}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold text-xs transition cursor-pointer"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && session && session.verifiedUserId === authUid && (
            <>
              <iframe
                key={`${authUid}-${frameKey}`}
                title="TheoremReach Surveys"
                src={session.launchUrl}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
                onLoad={handleFrameLoad}
                onError={handleFrameError}
              />

              {frameStatus === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-white/95 pointer-events-none">
                  <RefreshCw className="w-7 h-7 text-[#072ac8] animate-spin" />
                  <p className="text-xs font-semibold text-gray-600">
                    Connecting to TheoremReach…
                  </p>
                </div>
              )}

              {frameStatus === 'blocked' && (
                <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-gray-900">
                        Embedded view took too long or was blocked
                      </p>
                      <p className="text-amber-800 mt-0.5">
                        Some browsers block embedded partner cookies. Retry below or open surveys directly in a full tab.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={loadSignedSession}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                    <a
                      href={session.launchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white font-bold text-xs inline-flex items-center gap-1.5 transition whitespace-nowrap"
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

        {/* Quiet Footer Strip */}
        <div className="px-4 py-3 bg-[#f7f8fc] border-t border-[#d0e8f7] text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
          <span>Completed surveys credit automatically to your wallet.</span>
          {session && (
            <a
              href={session.launchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#072ac8] hover:text-[#05219e] inline-flex items-center gap-1 hover:underline"
            >
              <span>Open in full tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
