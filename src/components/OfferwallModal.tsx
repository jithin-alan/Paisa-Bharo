import React, { useState, useEffect } from 'react';
import { X, ExternalLink, RefreshCw, Smartphone, Play, Zap, Copy, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getOfferwallAdapter, setActiveOfferwallProvider } from '../providers/offerwallAdapter';
import { OfferwallItem } from '../providers/types';
import { PollPeCoin } from './Illustrations';
import { formatCoinsValue } from '../services/currencies';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultProvider?: 'adgem' | 'bitlabs';
}

export const OfferwallModal: React.FC<Props> = ({ isOpen, onClose, defaultProvider }) => {
  const { user, selectedCurrency, activeOfferwallProvider, setOfferwallProvider, awardCoins } = useApp();
  const [offers, setOffers] = useState<OfferwallItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [testingPostbackId, setTestingPostbackId] = useState<string | null>(null);

  const provider = defaultProvider || activeOfferwallProvider;
  const adapter = getOfferwallAdapter(provider);
  const wallUrl = adapter.getOfferwallUrl(user.uid);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    adapter.getFeaturedOffers(user.uid).then((items) => {
      setOffers(items);
      setLoading(false);
    });
  }, [isOpen, provider]);

  if (!isOpen) return null;

  const handleToggleProvider = (newProvider: 'adgem' | 'bitlabs') => {
    setActiveOfferwallProvider(newProvider);
    setOfferwallProvider(newProvider);
  };

  const handleCopyWallUrl = () => {
    navigator.clipboard.writeText(wallUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateS2SPostback = async (offer: OfferwallItem) => {
    setTestingPostbackId(offer.id);

    try {
      // Call S2S postback via backend endpoint or adapter
      const endpoint = provider === 'adgem' ? '/api/postbacks/adgem' : '/api/postbacks/bitlabs';
      const payload = provider === 'adgem'
        ? {
            player_id: user.uid,
            amount: offer.rewardCoins,
            transaction_id: `adgem_${offer.id}_${Date.now()}`,
          }
        : {
            uid: user.uid,
            val: offer.rewardCoins,
            tx: `bitlabs_${offer.id}_${Date.now()}`,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.coinsAwarded) {
        await awardCoins(data.coinsAwarded, `${provider.toUpperCase()} Postback: ${offer.title}`);
      }
    } catch {
      // Direct adapter fallback
      const result = await adapter.processPostback({
        player_id: user.uid,
        uid: user.uid,
        amount: offer.rewardCoins,
        val: offer.rewardCoins,
      });
      if (result.success) {
        await awardCoins(result.coinsAwarded, `${provider.toUpperCase()} Postback: ${offer.title}`);
      }
    } finally {
      setTestingPostbackId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-fade-in">
      <div className="w-full max-w-2xl max-h-[92vh] rounded-[28px] bg-white border border-[#e5dcfa] shadow-2xl flex flex-col overflow-hidden text-gray-900">
        {/* Top Header */}
        <div className="p-5 border-b border-[#eceaf5] flex items-center justify-between gap-3 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm ${
              provider === 'adgem' ? 'bg-gradient-to-tr from-amber-500 to-orange-600' : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
            }`}>
              {provider === 'adgem' ? 'AG' : 'BL'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-gray-900 capitalize">
                  {provider === 'adgem' ? 'AdGem Web Offerwall' : 'BitLabs Offerwall'}
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  provider === 'adgem' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {provider === 'adgem' ? 'Primary' : 'Backup'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Drop-in IOfferwallAdapter interface • Instant provider switching
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Switcher Bar & URL info */}
        <div className="px-5 py-3 bg-[#f7f8fc] border-b border-[#eceaf5] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600">Active Provider:</span>
            <div className="p-0.5 bg-white border border-[#e5dcfa] rounded-xl flex items-center shadow-sm">
              <button
                onClick={() => handleToggleProvider('adgem')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  provider === 'adgem' ? 'bg-[#7848f4] text-white shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                AdGem (Primary)
              </button>
              <button
                onClick={() => handleToggleProvider('bitlabs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  provider === 'bitlabs' ? 'bg-[#7848f4] text-white shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                BitLabs (Backup)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWallUrl}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#e5dcfa] hover:border-[#7848f4] text-xs font-bold text-gray-700 flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Copy offerwall URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Link' : 'Copy Wall URL'}</span>
            </button>
          </div>
        </div>

        {/* Offers List & Interactive Testing */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
              Live Available Campaigns ({offers.length}):
            </h4>
            <span className="text-xs text-gray-400">
              User ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[#7848f4] font-bold">{user.uid}</code>
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#7848f4] animate-spin mx-auto" />
              <p className="text-xs text-gray-500">Loading {provider} campaigns...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer, idx) => (
                <div
                  key={`offerwall-${offer.id}-${idx}`}
                  className="bg-white rounded-2xl border border-[#e5dcfa] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_2px_10px_rgba(120,72,244,0.04)] hover:border-[#7848f4] transition"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${offer.bannerGradient} text-white flex items-center justify-center text-xl shrink-0 shadow-sm`}>
                      {offer.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-gray-900">
                          {offer.title}
                        </span>
                        {offer.badge && (
                          <span className="text-[10px] bg-purple-50 text-[#7848f4] font-black px-2 py-0.5 rounded-md border border-[#e5dcfa]">
                            {offer.badge}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded capitalize">
                          {offer.difficulty} • {offer.timeEstimate}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {offer.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <PollPeCoin className="w-4 h-4 shrink-0" />
                      <span className="text-base font-black text-gray-900">+{offer.rewardCoins}</span>
                      <span className="text-xs text-gray-400">
                        ({formatCoinsValue(offer.rewardCoins, selectedCurrency)})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* S2S Postback Simulator */}
                      <button
                        disabled={testingPostbackId === offer.id}
                        onClick={() => handleSimulateS2SPostback(offer)}
                        className="px-3 py-1.5 rounded-xl bg-[#f0ebfc] hover:bg-[#e4dcf9] text-[#7848f4] text-xs font-extrabold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        title="Simulate Server-to-Server Postback from provider"
                      >
                        {testingPostbackId === offer.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5" />
                        )}
                        <span>Test Postback</span>
                      </button>

                      {/* Direct Link Action */}
                      <a
                        href={offer.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1"
                      >
                        <span>Start</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-4 bg-gray-50 border-t border-[#eceaf5] text-[11px] text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#7848f4]" />
            <span>Server postbacks will automatically credit coins using the unified <code>IOfferwallAdapter</code>.</span>
          </div>
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
