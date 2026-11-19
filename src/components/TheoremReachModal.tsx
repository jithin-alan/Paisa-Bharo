import React, { useEffect, useState } from 'react';
import { X, RefreshCw, ShieldCheck, AlertCircle, Monitor } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { theoremReachAdapter, TheoremReachLaunchSession } from '../providers/theoremReachAdapter';
import { PaisaBharoCoin } from './Illustrations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoremReachModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, firebaseUser } = useApp();
  const [session, setSession] = useState<TheoremReachLaunchSession | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [embedWall, setEmbedWall] = useState<boolean>(true);

  const authUid = firebaseUser?.uid || user?.uid || '';

  const loadSignedSession = async () => {
    if (!authUid || authUid === 'guest_user') {
      setError('Sign in required to start TheoremReach surveys.');
      setSession(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('Loading TheoremReach session for user:', authUid);
      const nextSession = await theoremReachAdapter.createLaunchSession(authUid);
      console.log('TheoremReach session created:', nextSession);
      setSession(nextSession);
    } catch (err: any) {
      console.error('TheoremReach session error:', err);
      const message =
        err?.message ||
        'Unable to prepare a TheoremReach survey session right now. Please try again.';
      setError(message);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setEmbedWall(false);
      return;
    }
    setEmbedWall(true);
    loadSignedSession();
  }, [isOpen, authUid]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-fade-in">
      <div className="w-full max-w-2xl max-h-[92vh] rounded-[28px] bg-white border border-[#bde0fe] shadow-2xl flex flex-col overflow-hidden text-gray-900">
        {/* Header */}
        <div className="p-5 border-b border-[#d0e8f7] flex items-center justify-between gap-3 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3c098d] to-[#072ac8] flex items-center justify-center text-white font-black text-sm shadow-sm">
              TR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-gray-900">
                  Embedded Survey Wall
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#e6f4fa] text-[#072ac8] border border-[#bde0fe]">
                  Server Verified
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                High-fill global surveys • 1,000 coins per $1 USD
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer"
            aria-label="Close TheoremReach modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Reward Rate & Security Summary */}
          <div className="rounded-2xl bg-[#f7f8fc] border border-[#d0e8f7] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <PaisaBharoCoin className="w-6 h-6 shrink-0" />
              <div>
                <p className="text-xs font-extrabold text-gray-900">
                  Earn 50 – 2,000+ Coins per Survey
                </p>
                <p className="text-[11px] text-gray-500">
                  Rewards credit automatically via TheoremReach S2S postback
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#072ac8] bg-white px-3 py-1.5 rounded-xl border border-[#bde0fe]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>HMAC Signed Session</span>
            </div>
          </div>

          {loading && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#072ac8] animate-spin mx-auto" />
              <p className="text-xs font-semibold text-gray-600">
                Generating signed TheoremReach survey session…
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3 text-xs text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold">TheoremReach Session Unavailable</p>
                  <p className="text-amber-800">{error}</p>
                </div>
              </div>
              <button
                onClick={loadSignedSession}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {!loading && session && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#bde0fe] bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-gray-500 font-semibold">
                    Session ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[#072ac8] font-bold">{session.transactionId}</code>
                  </span>
                  <span className="text-gray-400">
                    UID: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-bold">{session.userId}</code>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <div className="flex-1 text-center">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#072ac8] bg-[#e6f4fa] px-4 py-2 rounded-xl border border-[#bde0fe]">
                      <Monitor className="w-4 h-4" />
                      Embedded Survey Wall Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-[#bde0fe] bg-white h-[500px]">
                  <iframe
                    title="TheoremReach Survey Wall"
                    src={session.launchUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
                    onLoad={() => console.log('TheoremReach iframe loaded')}
                    onError={() => console.error('TheoremReach iframe error')}
                  />
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-[#d0e8f7] text-[11px] text-gray-500 flex items-center justify-between shrink-0">
          <span>Completed surveys verify and credit automatically through the server callback.</span>
          <button
            onClick={onClose}
            className="text-xs font-bold text-gray-700 hover:text-gray-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
