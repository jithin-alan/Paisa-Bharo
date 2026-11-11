import React, { useState } from 'react';
import { Copy, Check, Share2, Sparkles, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../services/i18n';
import { MascotReferIllustration, PollPeCoin } from '../components/Illustrations';

export const ReferView: React.FC = () => {
  const { user, selectedLanguage, applyReferralCode } = useApp();
  const [copied, setCopied] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Defensive check: user should always exist but handle null gracefully
  const referralCode = user?.referralCode ?? '';

  const referralUrl = typeof window !== 'undefined' ? `${window.location.origin}?ref=${referralCode}` : `https://paisabharopwa.com?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Paisa Bharo!',
          text: `Answer quick 5-second polls and get instant real payouts! Use my invite code: ${referralCode} for +100 Coins bonus!`,
          url: referralUrl,
        });
      } catch {
        // cancelled
      }
    } else {
      handleCopy();
    }
  };

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput.trim()) return;
    const res = await applyReferralCode(inviteInput);
    setStatusMsg({ text: res.message, success: res.success });
    if (res.success) {
      setInviteInput('');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner in PollPe Clean Theme */}
      <div className="rounded-[28px] bg-white border border-[#e5dcfa] p-6 sm:p-8 shadow-[0_4px_20px_rgba(120,72,244,0.06)] text-gray-900 text-center space-y-5">
        <div className="mx-auto flex justify-center">
          <MascotReferIllustration className="w-28 h-28" />
        </div>

        <div>
          <span className="text-xs font-black uppercase tracking-wider text-[#7848f4] block">
            REFER & EARN
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 flex items-center justify-center gap-2 flex-wrap">
            <span>Invite Your Friends & Get 500</span>
            <PollPeCoin className="w-6 h-6 inline shrink-0" />
            <span>Each!</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mt-1.5">
            {getTranslation(selectedLanguage, 'referDesc')}
          </p>
        </div>

        {/* Code Box */}
        <div className="max-w-xs mx-auto p-3.5 rounded-2xl bg-[#f0ebfc] border-2 border-dashed border-[#7848f4] flex items-center justify-between gap-3">
          <div className="text-left pl-2">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">
              {getTranslation(selectedLanguage, 'yourReferralCode')}
            </span>
            <span className="text-lg font-black tracking-widest text-[#7848f4]">
              {referralCode}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] text-white font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Share buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={handleNativeShare}
            className="px-5 py-2.5 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] text-white font-extrabold text-xs flex items-center gap-2 shadow-[0_4px_12px_rgba(120,72,244,0.3)] transition cursor-pointer active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Invite Link</span>
          </button>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Hey! I am making real money answering quick 5-second polls on Paisa Bharo PWA! Use my code ${referralCode} to get 100 free coins: ${referralUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Enter Invite Code Section */}
      <div className="rounded-[26px] bg-white border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] text-gray-900 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#7848f4]" />
          <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
            {getTranslation(selectedLanguage, 'enterReferralCode')}
          </h3>
        </div>
        <p className="text-xs text-gray-500">
          Enter an invite code from a friend to receive an instant +100 Coins welcome boost!
        </p>

        {user?.referredBy ? (
          <div className="p-3.5 rounded-xl bg-[#f0ebfc] text-xs text-[#7848f4] font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-[#7848f4]" />
            <span>You joined with referral code: <strong>{user.referredBy}</strong> (+100 Coins awarded).</span>
          </div>
        ) : (
          <form onSubmit={handleApplyCode} className="flex gap-2">
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="e.g. PB-789XYZ"
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#7848f4] uppercase font-bold tracking-wider"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] text-white font-extrabold text-xs transition cursor-pointer active:scale-95 shrink-0 shadow-sm"
            >
              {getTranslation(selectedLanguage, 'applyCode')}
            </button>
          </form>
        )}

        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMsg.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* How it Works 3 steps */}
      <div className="rounded-[26px] bg-white border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] text-gray-900 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Referral Program Rules & Benefits
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center space-y-2">
            <span className="w-8 h-8 rounded-full bg-[#f0ebfc] text-[#7848f4] font-black flex items-center justify-center mx-auto text-xs shadow-sm">
              1
            </span>
            <h5 className="font-extrabold text-xs text-gray-900">Share Your Link</h5>
            <p className="text-[11px] text-gray-500">Send your link or code via WhatsApp, Telegram, or social media.</p>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center space-y-2">
            <span className="w-8 h-8 rounded-full bg-[#f0ebfc] text-[#7848f4] font-black flex items-center justify-center mx-auto text-xs shadow-sm">
              2
            </span>
            <h5 className="font-extrabold text-xs text-gray-900">Friend Votes First Poll</h5>
            <p className="text-[11px] text-gray-500">Your friend votes on their first quick poll and gets 100 free coins.</p>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center space-y-2">
            <span className="w-8 h-8 rounded-full bg-[#f0ebfc] text-[#7848f4] font-black flex items-center justify-center mx-auto text-xs shadow-sm">
              3
            </span>
            <h5 className="font-extrabold text-xs text-gray-900">+500 Coins + 10% Forever</h5>
            <p className="text-[11px] text-gray-500">You unlock 500 Coins instantly plus 10% commission on all their earnings.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
