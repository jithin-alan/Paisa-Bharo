import React, { useState } from 'react';
import { X, Send, Terminal, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cintAdapter } from '../providers/cintAdapter';
import { adGemAdapter, bitLabsAdapter } from '../providers/offerwallAdapter';
import { affiliateDealsAdapter } from '../providers/affiliateDealsAdapter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const WebhookTesterModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, awardCoins } = useApp();
  const [activeTab, setActiveTab] = useState<'cint' | 'adgem' | 'bitlabs' | 'affiliate'>('cint');
  const [cintStatus, setCintStatus] = useState<'complete' | 'screenout' | 'quotafull' | 'reversed'>('complete');
  const [cintCoins, setCintCoins] = useState<number>(450);

  const [adgemCoins, setAdgemCoins] = useState<number>(1200);
  const [bitlabsCoins, setBitlabsCoins] = useState<number>(850);

  const [affiliateNetwork, setAffiliateNetwork] = useState<'Awin' | 'CJ' | 'Impact'>('Awin');
  const [affiliateMerchant, setAffiliateMerchant] = useState<string>('Amazon Global');
  const [affiliateCoins, setAffiliateCoins] = useState<number>(600);

  const [responseLog, setResponseLog] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleTestCint = async () => {
    setLoading(true);
    const payload = {
      respondentId: user.uid,
      surveyId: 'cint_srv_901',
      status: cintStatus,
      coinsAwarded: cintCoins,
      rewardUsd: cintCoins / 1000,
      timestamp: new Date().toISOString(),
    };

    const result = await cintAdapter.processCallback(payload);
    setResponseLog(result);

    if (result.coinsAwarded !== 0) {
      await awardCoins(result.coinsAwarded, `Cint Webhook (${cintStatus})`);
    }
    setLoading(false);
  };

  const handleTestAdGem = async () => {
    setLoading(true);
    const payload = {
      player_id: user.uid,
      amount: adgemCoins,
      transaction_id: `adgem_sim_${Date.now()}`,
    };

    const result = await adGemAdapter.processPostback(payload);
    setResponseLog(result);

    if (result.success && result.coinsAwarded > 0) {
      await awardCoins(result.coinsAwarded, `AdGem S2S Postback`);
    }
    setLoading(false);
  };

  const handleTestBitLabs = async () => {
    setLoading(true);
    const payload = {
      uid: user.uid,
      val: bitlabsCoins,
      tx: `bitlabs_sim_${Date.now()}`,
    };

    const result = await bitLabsAdapter.processPostback(payload);
    setResponseLog(result);

    if (result.success && result.coinsAwarded > 0) {
      await awardCoins(result.coinsAwarded, `BitLabs S2S Postback`);
    }
    setLoading(false);
  };

  const handleTestAffiliate = async () => {
    setLoading(true);
    const payload = {
      network: affiliateNetwork,
      orderId: `ord_sim_${Date.now()}`,
      clickId: `clk_sim_${Date.now()}`,
      userId: user.uid,
      merchantName: affiliateMerchant,
      saleAmountUsd: 75.0,
      commissionUsd: 6.0,
      coinsAwarded: affiliateCoins,
      status: 'approved' as const,
      eventDate: new Date().toISOString(),
    };

    const result = await affiliateDealsAdapter.processPostback(payload);
    setResponseLog(result);

    if (result.success && result.coinsAwarded > 0) {
      await awardCoins(result.coinsAwarded, `${affiliateNetwork} Conversion`);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-xl max-h-[90vh] rounded-[28px] bg-white border border-[#bde0fe] shadow-2xl p-6 text-gray-900 flex flex-col overflow-hidden space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#d0e8f7] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e6f4fa] text-[#072ac8] flex items-center justify-center font-black">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900">
                S2S Postback & Callback Simulator
              </h3>
              <p className="text-[11px] text-gray-500">
                Test webhooks for Cint, AdGem, BitLabs, and Affiliate Networks
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

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#e6f4fa] rounded-xl shrink-0">
          {[
            { id: 'cint', label: '1. Cint Survey' },
            { id: 'adgem', label: '2. AdGem Offerwall' },
            { id: 'bitlabs', label: '3. BitLabs (Backup)' },
            { id: 'affiliate', label: '4. Deals & Cashback' },
          ].map((tab, idx) => (
            <button
              key={`webhook-tab-${tab.id}-${idx}`}
              onClick={() => {
                setActiveTab(tab.id as any);
                setResponseLog(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-[#072ac8] shadow-sm'
                  : 'text-gray-600 hover:text-[#072ac8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'cint' && (
            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
              <p className="font-bold text-gray-800">Cint Callback Parameters:</p>
              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Callback Status:</label>
                <select
                  value={cintStatus}
                  onChange={(e) => setCintStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-white border border-[#bde0fe] font-bold text-gray-800"
                >
                  <option value="complete">complete (Credit Coins)</option>
                  <option value="screenout">screenout (Consolation 15 coins)</option>
                  <option value="quotafull">quotafull (Consolation 15 coins)</option>
                  <option value="reversed">reversed (Deduct Coins for Speeding)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Coins Value:</label>
                <input
                  type="number"
                  value={cintCoins}
                  onChange={(e) => setCintCoins(Number(e.target.value))}
                  className="w-full p-2 rounded-xl bg-white border border-[#bde0fe] font-bold text-gray-800"
                />
              </div>

              <button
                disabled={loading}
                onClick={handleTestCint}
                className="w-full py-2.5 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Trigger Cint Callback</span>
              </button>
            </div>
          )}

          {activeTab === 'adgem' && (
            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
              <p className="font-bold text-gray-800">AdGem S2S Postback Payload:</p>
              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Player ID:</label>
                <input
                  type="text"
                  disabled
                  value={user.uid}
                  className="w-full p-2 rounded-xl bg-gray-200 border border-gray-300 font-mono text-gray-700"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Amount (Coins):</label>
                <input
                  type="number"
                  value={adgemCoins}
                  onChange={(e) => setAdgemCoins(Number(e.target.value))}
                  className="w-full p-2 rounded-xl bg-white border border-[#bde0fe] font-bold text-gray-800"
                />
              </div>

              <button
                disabled={loading}
                onClick={handleTestAdGem}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send AdGem Postback</span>
              </button>
            </div>
          )}

          {activeTab === 'bitlabs' && (
            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
              <p className="font-bold text-gray-800">BitLabs S2S Postback Payload:</p>
              <div>
                <label className="block text-gray-500 mb-1 font-semibold">User ID (uid):</label>
                <input
                  type="text"
                  disabled
                  value={user.uid}
                  className="w-full p-2 rounded-xl bg-gray-200 border border-gray-300 font-mono text-gray-700"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Value (val):</label>
                <input
                  type="number"
                  value={bitlabsCoins}
                  onChange={(e) => setBitlabsCoins(Number(e.target.value))}
                  className="w-full p-2 rounded-xl bg-white border border-[#bde0fe] font-bold text-gray-800"
                />
              </div>

              <button
                disabled={loading}
                onClick={handleTestBitLabs}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send BitLabs Postback</span>
              </button>
            </div>
          )}

          {activeTab === 'affiliate' && (
            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
              <p className="font-bold text-gray-800">Affiliate Conversion Postback (Awin, CJ, Impact):</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-500 mb-1 font-semibold">Network:</label>
                  <select
                    value={affiliateNetwork}
                    onChange={(e) => setAffiliateNetwork(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-white border border-[#bde0fe] font-bold"
                  >
                    <option value="Awin">Awin</option>
                    <option value="CJ">CJ Affiliate</option>
                    <option value="Impact">Impact Radius</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 mb-1 font-semibold">Merchant:</label>
                  <input
                    type="text"
                    value={affiliateMerchant}
                    onChange={(e) => setAffiliateMerchant(e.target.value)}
                    className="w-full p-2 rounded-xl bg-white border border-[#bde0fe] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Cashback Coins Awarded:</label>
                <input
                  type="number"
                  value={affiliateCoins}
                  onChange={(e) => setAffiliateCoins(Number(e.target.value))}
                  className="w-full p-2 rounded-xl bg-white border border-[#bde0fe] font-bold text-gray-800"
                />
              </div>

              <button
                disabled={loading}
                onClick={handleTestAffiliate}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Affiliate Conversion</span>
              </button>
            </div>
          )}

          {/* Response log inspection */}
          {responseLog && (
            <div className="bg-gray-900 text-emerald-400 p-3.5 rounded-2xl font-mono text-[11px] space-y-1">
              <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-1 mb-1">
                <span>Webhook Response Output:</span>
                <span className="text-emerald-400 font-bold">HTTP 200 OK</span>
              </div>
              <pre className="overflow-x-auto">{JSON.stringify(responseLog, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#d0e8f7] flex items-center justify-between text-xs text-gray-500">
          <span>Updates user wallet balance in real-time.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
