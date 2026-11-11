import React, { useState, useEffect } from 'react';
import { ShoppingBag, ExternalLink, Zap, Clock, ShieldCheck, Tag, Copy, Check, Filter, ArrowUpRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { affiliateDealsAdapter } from '../providers/affiliateDealsAdapter';
import { AffiliateDeal } from '../providers/types';
import { PollPeCoin } from '../components/Illustrations';

export const DealsCashbackView: React.FC = () => {
  const { user, awardCoins } = useApp();
  const [deals, setDeals] = useState<AffiliateDeal[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [lastTrackedLink, setLastTrackedLink] = useState<{ merchant: string; clickId: string; url: string } | null>(null);
  const [simulatingDealId, setSimulatingDealId] = useState<string | null>(null);

  const categories = ['All', 'Shopping', 'Fashion', 'Travel', 'Food'];

  useEffect(() => {
    affiliateDealsAdapter.getDeals(activeCategory).then(setDeals);
  }, [activeCategory]);

  const handleOutboundClick = (deal: AffiliateDeal) => {
    const { trackedUrl, clickId } = affiliateDealsAdapter.generateTrackedOutboundLink(deal, user.uid);
    setLastTrackedLink({ merchant: deal.merchantName, clickId, url: trackedUrl });
    // In production this navigates or opens tab; here we also provide test postback trigger
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const handleSimulateConversion = async (deal: AffiliateDeal) => {
    setSimulatingDealId(deal.id);

    try {
      // Simulate conversion postback from the network
      const payload = {
        network: deal.network,
        orderId: `ord_${deal.network.toLowerCase()}_${Date.now()}`,
        clickId: lastTrackedLink?.clickId || `clk_auto_${Date.now()}`,
        userId: user.uid,
        merchantName: deal.merchantName,
        saleAmountUsd: 65.0,
        commissionUsd: 5.2,
        coinsAwarded: 520,
        status: 'approved' as const,
        eventDate: new Date().toISOString(),
      };

      const result = await affiliateDealsAdapter.processPostback(payload);

      if (result.success && result.coinsAwarded > 0) {
        await awardCoins(result.coinsAwarded, `${deal.network} Cashback: ${deal.merchantName}`);
      }
    } finally {
      setSimulatingDealId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner in PollPe Clean Purple Theme */}
      <div className="rounded-[26px] bg-white border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] text-gray-900">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f0ebfc] flex items-center justify-center text-[#7848f4]">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900">
                Deals & Cashback Hub
              </h2>
              <span className="text-[10px] font-black uppercase bg-[#f0ebfc] text-[#7848f4] px-2 py-0.5 rounded-md border border-[#e5dcfa]">
                Affiliate Networks: Awin • CJ • Impact
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Shop through tracked outbound links and earn guaranteed coins cashback once the network posts back.
            </p>
          </div>
        </div>

        {/* Info pills */}
        <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Tracked Outbound Links with SubID & S2S Postback Reconciliation</span>
          </div>
          <span className="text-gray-400 font-medium">Stubbed Adapter for Network Selection</span>
        </div>
      </div>

      {/* Active Tracked Link Notice if recently generated */}
      {lastTrackedLink && (
        <div className="p-4 rounded-2xl bg-[#f0ebfc] border border-[#e5dcfa] text-xs text-gray-800 flex items-center justify-between gap-3 animate-fade-in">
          <div>
            <span className="font-extrabold text-[#7848f4]">Tracked Outbound Link Active:</span>{' '}
            <span className="text-gray-700">{lastTrackedLink.merchant}</span> •{' '}
            <span className="text-gray-500">Click ID: <code>{lastTrackedLink.clickId}</code></span>
          </div>
          <button
            onClick={() => setLastTrackedLink(null)}
            className="text-gray-400 hover:text-gray-700 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 mr-2">
          <Filter className="w-3.5 h-3.5" />
          <span>Category:</span>
        </div>
        {categories.map((cat, idx) => (
          <button
            key={`dealcat-${idx}-${cat}`}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition cursor-pointer ${
              activeCategory === cat
                ? 'bg-[#7848f4] text-white shadow-sm'
                : 'bg-white hover:bg-[#f0ebfc] text-gray-600 border border-[#e5dcfa]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {deals.map((deal, idx) => (
          <div
            key={`deal-${deal.id}-${idx}`}
            className="bg-white rounded-[24px] border border-[#e5dcfa] p-5 shadow-[0_4px_20px_rgba(120,72,244,0.05)] hover:border-[#7848f4] hover:shadow-lg transition flex flex-col justify-between space-y-4"
          >
            {/* Top Info */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#f7f8fc] border border-gray-100 flex items-center justify-center text-2xl shadow-sm">
                    {deal.logo}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-gray-900">
                        {deal.merchantName}
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7848f4] bg-[#f0ebfc] px-1.5 py-0.5 rounded">
                      Network: {deal.network}
                    </span>
                  </div>
                </div>

                {/* Cashback rate badge */}
                <div className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl text-right">
                  <span className="text-xs font-black text-amber-700 block">
                    {deal.cashbackTag}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-3 line-clamp-2">
                {deal.description}
              </p>

              {/* Coupons if available */}
              {deal.popularCoupons && deal.popularCoupons.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Exclusive Coupons:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {deal.popularCoupons.map((code, idx) => (
                      <button
                        key={`coupon-${idx}-${code}`}
                        onClick={() => handleCopyCoupon(code)}
                        className="px-2 py-1 rounded-lg bg-gray-50 border border-dashed border-gray-300 hover:border-[#7848f4] text-[11px] font-mono font-bold text-gray-700 flex items-center gap-1 transition cursor-pointer"
                        title="Click to copy coupon"
                      >
                        <Tag className="w-3 h-3 text-[#7848f4]" />
                        <span>{code}</span>
                        {copiedCoupon === code ? (
                          <Check className="w-3 h-3 text-emerald-600 ml-0.5" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-400 ml-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{deal.estimatedDays}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Postback Simulator Button */}
                <button
                  disabled={simulatingDealId === deal.id}
                  onClick={() => handleSimulateConversion(deal)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#f0ebfc] hover:bg-[#e4dcf9] text-[#7848f4] text-xs font-extrabold transition cursor-pointer flex items-center gap-1"
                  title="Simulate S2S Conversion Postback"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Test Credit</span>
                </button>

                {/* Outbound Link */}
                <button
                  onClick={() => handleOutboundClick(deal)}
                  className="px-3 py-1.5 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <span>Shop</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How It Works Explainer Card */}
      <div className="bg-white rounded-[24px] border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)]">
        <h3 className="font-extrabold text-sm text-gray-900 mb-3 flex items-center gap-2">
          <span>How Cashback Works on Paisa Bharo</span>
          <PollPeCoin className="w-4 h-4" />
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="w-6 h-6 rounded-full bg-[#7848f4] text-white font-black flex items-center justify-center text-xs mb-2">
              1
            </span>
            <p className="font-bold text-gray-900">Click Outbound Link</p>
            <p className="mt-1 text-gray-500">
              We generate an encrypted clickId with your user ID forwarded to Awin, CJ, or Impact.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="w-6 h-6 rounded-full bg-[#7848f4] text-white font-black flex items-center justify-center text-xs mb-2">
              2
            </span>
            <p className="font-bold text-gray-900">Shop on Brand Store</p>
            <p className="mt-1 text-gray-500">
              Browse normally and complete your checkout. Do not open other tabs during payment.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="w-6 h-6 rounded-full bg-[#7848f4] text-white font-black flex items-center justify-center text-xs mb-2">
              3
            </span>
            <p className="font-bold text-gray-900">Postback & Coin Credit</p>
            <p className="mt-1 text-gray-500">
              The merchant posts back the conversion to our server webhook and coins appear in your wallet!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
