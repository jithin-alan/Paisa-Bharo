import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Gift,
  ShoppingBag,
  BarChart3,
  Database,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RefreshCw,
  LogOut,
  ChevronDown,
  ChevronUp,
  Users,
  Coins,
  Check,
  X,
  CreditCard,
  Download,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ApiTestResult {
  endpoint: string;
  method: 'GET' | 'POST';
  status: 'idle' | 'loading' | 'success' | 'error';
  response?: any;
  error?: string;
}

interface ApiTestResultState {
  [key: string]: ApiTestResult;
}

interface AdminConfigViewProps {
  onSwitchToUserApp?: () => void;
}

export const AdminConfigView: React.FC<AdminConfigViewProps> = ({ onSwitchToUserApp }) => {
  const {
    logout,
    systemSettings,
    updateSystemSettings,
    setOfferwallProvider,
    allRedemptions,
    processRedemption,
    allUsers,
    adminStats,
    refreshAdminData,
  } = useApp();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    redemptions: true,
    offerwall: true,
    maintenance: true,
    economy: false,
    surveys: false,
    users: false,
  });

  const [apiTestResults, setApiTestResults] = useState<ApiTestResultState>({});
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Local editable copies synced with live systemSettings
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    systemSettings?.maintenanceMessage || 'System maintenance in progress. We will be back shortly!'
  );
  const [maxDailyCoins, setMaxDailyCoins] = useState(systemSettings?.maxDailyCoins || 5000);
  const [streakMultiplier, setStreakMultiplier] = useState(systemSettings?.streakMultiplier || 1.5);
  const [referralBonus, setReferralBonus] = useState(systemSettings?.referralBonus || 500);
  const [redemptionFilter, setRedemptionFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (systemSettings) {
      if (systemSettings.maintenanceMessage) setMaintenanceMessage(systemSettings.maintenanceMessage);
      if (systemSettings.maxDailyCoins) setMaxDailyCoins(systemSettings.maxDailyCoins);
      if (systemSettings.streakMultiplier) setStreakMultiplier(systemSettings.streakMultiplier);
      if (systemSettings.referralBonus) setReferralBonus(systemSettings.referralBonus);
    }
  }, [systemSettings]);

  useEffect(() => {
    refreshAdminData();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshAdminData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSaveEconomySettings = async () => {
    setSavingSettings(true);
    await updateSystemSettings({
      maxDailyCoins: Number(maxDailyCoins),
      streakMultiplier: Number(streakMultiplier),
      referralBonus: Number(referralBonus),
    });
    setSavingSettings(false);
  };

  const handleSaveMaintenance = async (mode: boolean) => {
    setSavingSettings(true);
    await updateSystemSettings({
      maintenanceMode: mode,
      maintenanceMessage,
    });
    setSavingSettings(false);
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const apiEndpoints = [
    {
      id: 'cint_survey',
      name: 'Cint Surveys',
      endpoint: '/api/surveys/cint',
      method: 'GET' as const,
      description: 'Fetch eligible surveys for users',
    },
    {
      id: 'cint_redirect',
      name: 'Cint Redirect',
      endpoint: '/api/surveys/cint/redirect',
      method: 'GET' as const,
      description: 'Generate survey redirect URLs',
    },
    {
      id: 'cint_callback',
      name: 'Cint Callback',
      endpoint: '/api/callbacks/cint',
      method: 'GET' as const,
      description: 'Survey completion webhooks',
    },
    {
      id: 'offerwall_config',
      name: 'Offerwall Config',
      endpoint: '/api/offerwall/config',
      method: 'GET' as const,
      description: 'Current offerwall provider status',
    },
    {
      id: 'offerwall_offers',
      name: 'Offerwall Offers',
      endpoint: '/api/offerwall/offers',
      method: 'GET' as const,
      description: 'Fetch available offers',
    },
    {
      id: 'affiliate_deals',
      name: 'Affiliate Deals',
      endpoint: '/api/deals',
      method: 'GET' as const,
      description: 'Fetch affiliate cashback deals',
    },
    {
      id: 'affiliate_click',
      name: 'Deal Click Tracking',
      endpoint: '/api/deals/click',
      method: 'POST' as const,
      description: 'Track outbound deal clicks',
    },
    {
      id: 'affiliate_clicks',
      name: 'Tracked Clicks Log',
      endpoint: '/api/deals/clicks',
      method: 'GET' as const,
      description: 'View all tracked affiliate clicks',
    },
    {
      id: 'adgem_postback',
      name: 'AdGem Postback',
      endpoint: '/api/postbacks/adgem',
      method: 'POST' as const,
      description: 'Process AdGem conversion postbacks',
    },
    {
      id: 'bitlabs_postback',
      name: 'BitLabs Postback',
      endpoint: '/api/postbacks/bitlabs',
      method: 'POST' as const,
      description: 'Process BitLabs conversion postbacks',
    },
  ];

  const testApiEndpoint = async (endpoint: string, method: 'GET' | 'POST', id: string) => {
    setApiTestResults(prev => ({
      ...prev,
      [id]: { endpoint, method, status: 'loading' },
    }));

    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}${endpoint}?test=true`, {
        method,
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      setApiTestResults(prev => ({
        ...prev,
        [id]: {
          endpoint,
          method,
          status: 'success',
          response: data,
        },
      }));
    } catch (error) {
      setApiTestResults(prev => ({
        ...prev,
        [id]: {
          endpoint,
          method,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    }
  };

  const testAllEndpoints = async () => {
    setIsTestingAll(true);
    const testPromises = apiEndpoints.map(ep => testApiEndpoint(ep.endpoint, ep.method, ep.id));
    await Promise.all(testPromises);
    setIsTestingAll(false);
  };

  const handleExportUsers = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allUsers, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `paisabharo_users_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredRedemptions = allRedemptions.filter(r => {
    if (redemptionFilter === 'all') return true;
    return r.status === redemptionFilter;
  });

  const pendingRedemptionsCount = allRedemptions.filter(r => r.status === 'pending').length;

  const STATUS_CONFIGS = {
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: CheckCircle2,
      color: 'text-emerald-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: AlertCircle,
      color: 'text-red-700',
    },
    loading: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: Clock,
      color: 'text-blue-700',
    },
    idle: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: AlertCircle,
      color: 'text-gray-600',
    },
  };

  return (
    <div className="space-y-6 pb-12 text-gray-900 max-w-6xl mx-auto px-4 sm:px-6 pt-6 font-sans">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-[28px] border border-[#e5dcfa] p-6 sm:p-8 shadow-[0_4px_20px_rgba(120,72,244,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#7848f4] text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900">Admin Live Control Panel</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                  Live Synced
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Database: <code className="text-[#7848f4] font-semibold">ai-studio-ba803483-ddcf-496c-b3c9-7d1a85fc5692</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition cursor-pointer shadow-sm disabled:opacity-60"
              title="Refresh live metrics from Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#7848f4]' : ''}`} />
              <span>Refresh</span>
            </button>

            {onSwitchToUserApp && (
              <button
                type="button"
                onClick={onSwitchToUserApp}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7848f4] text-white hover:bg-[#6837e3] font-bold text-xs transition cursor-pointer shadow-md shadow-purple-500/20"
              >
                <span>View User App</span>
                <span>&rarr;</span>
              </button>
            )}

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-gray-500" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#f0ebfc] rounded-2xl p-3.5 text-center border border-[#e5dcfa]">
            <span className="text-[11px] font-bold text-[#7848f4] uppercase tracking-wider">Registered Users</span>
            <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
              {adminStats.totalUsers.toLocaleString()}
            </p>
          </div>

          <div className="bg-[#f0ebfc] rounded-2xl p-3.5 text-center border border-[#e5dcfa]">
            <span className="text-[11px] font-bold text-[#7848f4] uppercase tracking-wider">Polls & Tasks</span>
            <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
              {adminStats.totalPolls}
            </p>
          </div>

          <div className="bg-[#f0ebfc] rounded-2xl p-3.5 text-center border border-[#e5dcfa]">
            <span className="text-[11px] font-bold text-[#7848f4] uppercase tracking-wider">Coins Distributed</span>
            <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
              {adminStats.totalCoins.toLocaleString()}
            </p>
          </div>

          <div className="bg-[#f0ebfc] rounded-2xl p-3.5 text-center border border-[#e5dcfa]">
            <span className="text-[11px] font-bold text-[#7848f4] uppercase tracking-wider">Pending Cashouts</span>
            <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5 flex items-center justify-center gap-1.5">
              <span>{pendingRedemptionsCount}</span>
              {pendingRedemptionsCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 1. Live Redemptions Queue */}
      <div className="bg-white rounded-[28px] border border-[#e5dcfa] shadow-[0_4px_20px_rgba(120,72,244,0.05)] overflow-hidden">
        <button
          onClick={() => toggleSection('redemptions')}
          className="w-full px-6 py-5 sm:p-6 flex items-center justify-between hover:bg-gray-50/70 transition"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-[#7848f4]" />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-gray-900">Live Redemptions Queue</h3>
                {pendingRedemptionsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                    {pendingRedemptionsCount} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">Review, approve, or reject user cashout withdrawals</p>
            </div>
          </div>
          {expandedSections.redemptions ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {expandedSections.redemptions && (
          <div className="px-6 pb-6 pt-2">
            {/* Filter buttons */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              {(['all', 'pending', 'completed', 'rejected'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setRedemptionFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                    redemptionFilter === f
                      ? 'bg-[#7848f4] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f} {f === 'pending' && `(${pendingRedemptionsCount})`}
                </button>
              ))}
            </div>

            {filteredRedemptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 font-medium">
                No redemptions found for filter: <span className="font-bold">{redemptionFilter}</span>.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                      <th className="pb-2.5 font-bold">ID / User</th>
                      <th className="pb-2.5 font-bold">Method</th>
                      <th className="pb-2.5 font-bold">Payout Amount</th>
                      <th className="pb-2.5 font-bold">Account / VPA</th>
                      <th className="pb-2.5 font-bold">Status</th>
                      <th className="pb-2.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRedemptions.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-3">
                          <p className="font-mono font-bold text-gray-900">{r.id.slice(0, 10)}…</p>
                          <p className="text-[10px] text-gray-400 font-mono truncate max-w-[140px]">{r.userId}</p>
                        </td>
                        <td className="py-3 font-semibold text-gray-800">{r.payoutMethod}</td>
                        <td className="py-3">
                          <span className="font-bold text-gray-900">
                            {r.currency} {r.amountCurrency}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-medium">
                            ({r.coinsSpent.toLocaleString()} Coins)
                          </span>
                        </td>
                        <td className="py-3 font-mono text-gray-700 text-[11px] truncate max-w-[180px]">
                          {r.accountDetails}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              r.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {r.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => processRedemption(r.id, 'completed')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition shadow-sm"
                                title="Approve and mark completed"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => processRedemption(r.id, 'rejected')}
                                className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[11px] flex items-center gap-1 transition"
                                title="Reject redemption"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-medium italic">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Offerwall Settings (Live Switcher) */}
      <div className="bg-white rounded-[28px] border border-[#e5dcfa] shadow-[0_4px_20px_rgba(120,72,244,0.05)] overflow-hidden">
        <button
          onClick={() => toggleSection('offerwall')}
          className="w-full px-6 py-5 sm:p-6 flex items-center justify-between hover:bg-gray-50/70 transition"
        >
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-[#7848f4]" />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-gray-900">Offerwall Provider (AdGem / BitLabs)</h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#7848f4] text-[10px] font-black uppercase tracking-wider">
                  Active: {systemSettings?.offerwallProvider?.toUpperCase() || 'ADGEM'}
                </span>
              </div>
              <p className="text-xs text-gray-500">Live configuration change switches active offerwall in the user app</p>
            </div>
          </div>
          {expandedSections.offerwall ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {expandedSections.offerwall && (
          <div className="px-6 pb-6 pt-2 space-y-4">
            <div>
              <p className="text-xs text-gray-600 mb-3">
                Select which offerwall provider is active. Switching providers updates all users instantly without redeploying code.
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setOfferwallProvider('adgem')}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                    systemSettings?.offerwallProvider === 'adgem'
                      ? 'bg-purple-50/80 border-[#7848f4] text-[#7848f4] shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-purple-200'
                  }`}
                >
                  {systemSettings?.offerwallProvider === 'adgem' && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#7848f4]" />
                  )}
                  <p className="font-black text-sm">AdGem</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Primary gaming and task offerwall with S2S postback</p>
                </button>

                <button
                  type="button"
                  onClick={() => setOfferwallProvider('bitlabs')}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                    systemSettings?.offerwallProvider === 'bitlabs'
                      ? 'bg-purple-50/80 border-[#7848f4] text-[#7848f4] shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-purple-200'
                  }`}
                >
                  {systemSettings?.offerwallProvider === 'bitlabs' && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#7848f4]" />
                  )}
                  <p className="font-black text-sm">BitLabs</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Backup offerwall and survey wall adapter</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. System Maintenance Mode */}
      <div className="bg-white rounded-[28px] border border-[#e5dcfa] shadow-[0_4px_20px_rgba(120,72,244,0.05)] overflow-hidden">
        <button
          onClick={() => toggleSection('maintenance')}
          className="w-full px-6 py-5 sm:p-6 flex items-center justify-between hover:bg-gray-50/70 transition"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#7848f4]" />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-gray-900">Maintenance Mode Control</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    systemSettings?.maintenanceMode ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {systemSettings?.maintenanceMode ? 'ACTIVE (APP BLOCKED)' : 'NORMAL OPERATION'}
                </span>
              </div>
              <p className="text-xs text-gray-500">Block public access during upgrades while administrators retain access</p>
            </div>
          </div>
          {expandedSections.maintenance ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {expandedSections.maintenance && (
          <div className="px-6 pb-6 pt-2 space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <div>
                <p className="text-xs font-bold text-gray-800">Maintenance Status</p>
                <p className="text-[11px] text-gray-500">
                  {systemSettings?.maintenanceMode
                    ? 'Maintenance screen is currently displayed to all regular visitors.'
                    : 'Application is publicly accessible worldwide.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSaveMaintenance(!systemSettings?.maintenanceMode)}
                disabled={savingSettings}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-sm ${
                  systemSettings?.maintenanceMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {systemSettings?.maintenanceMode ? 'TURN OFF MAINTENANCE' : 'ENABLE MAINTENANCE MODE'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Custom Maintenance Notice (shown to visitors):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7848f4]"
                  placeholder="System maintenance in progress. We will be back shortly!"
                />
                <button
                  type="button"
                  onClick={() => handleSaveMaintenance(systemSettings?.maintenanceMode || false)}
                  disabled={savingSettings}
                  className="px-4 py-2 rounded-xl bg-[#7848f4] text-white text-xs font-bold hover:bg-[#6837e3] transition cursor-pointer"
                >
                  Save Message
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Economy & Rewards Settings */}
      <div className="bg-white rounded-[28px] border border-[#e5dcfa] shadow-[0_4px_20px_rgba(120,72,244,0.05)] overflow-hidden">
        <button
          onClick={() => toggleSection('economy')}
          className="w-full px-6 py-5 sm:p-6 flex items-center justify-between hover:bg-gray-50/70 transition"
        >
          <div className="flex items-center gap-3">
            <Coins className="w-5 h-5 text-[#7848f4]" />
            <div className="text-left">
              <h3 className="text-sm sm:text-base font-black text-gray-900">Economy & Reward Multipliers</h3>
              <p className="text-xs text-gray-500">Configure daily coin caps, streak multipliers, and referral bonuses</p>
            </div>
          </div>
          {expandedSections.economy ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {expandedSections.economy && (
          <div className="px-6 pb-6 pt-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Max Daily Coins Cap</label>
                <input
                  type="number"
                  value={maxDailyCoins}
                  onChange={(e) => setMaxDailyCoins(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7848f4]"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">Max coins an account can accumulate per 24 hours</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Daily Streak Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={streakMultiplier}
                  onChange={(e) => setStreakMultiplier(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7848f4]"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">Coin bonus multiplier for daily active check-ins</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Referral Reward (Coins)</label>
                <input
                  type="number"
                  value={referralBonus}
                  onChange={(e) => setReferralBonus(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7848f4]"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">Default 500 coins awarded to referrer & referee</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveEconomySettings}
                disabled={savingSettings}
                className="px-5 py-2.5 rounded-xl bg-[#7848f4] text-white text-xs font-bold hover:bg-[#6837e3] transition shadow-md shadow-purple-500/20"
              >
                {savingSettings ? 'Saving to Database…' : 'Save Economy Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Live Registered Users */}
      <div className="bg-white rounded-[28px] border border-[#e5dcfa] shadow-[0_4px_20px_rgba(120,72,244,0.05)] overflow-hidden">
        <button
          onClick={() => toggleSection('users')}
          className="w-full px-6 py-5 sm:p-6 flex items-center justify-between hover:bg-gray-50/70 transition"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#7848f4]" />
            <div className="text-left">
              <h3 className="text-sm sm:text-base font-black text-gray-900">
                Registered Users in Database ({allUsers.length || adminStats.totalUsers})
              </h3>
              <p className="text-xs text-gray-500">Live profiles stored in Firestore `users` collection</p>
            </div>
          </div>
          {expandedSections.users ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {expandedSections.users && (
          <div className="px-6 pb-6 pt-2">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs text-gray-500">Live query of user balances, country, and streak records.</p>
              <button
                type="button"
                onClick={handleExportUsers}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                    <th className="pb-2 font-bold">UID / Email</th>
                    <th className="pb-2 font-bold">Name</th>
                    <th className="pb-2 font-bold">Coins Balance</th>
                    <th className="pb-2 font-bold">Streak</th>
                    <th className="pb-2 font-bold">Country</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allUsers.length > 0 ? (
                    allUsers.map(u => (
                      <tr key={u.uid} className="hover:bg-gray-50/60">
                        <td className="py-2.5">
                          <p className="font-mono text-gray-900 font-bold">{u.email || u.uid.slice(0, 12)}</p>
                          <p className="font-mono text-[10px] text-gray-400">{u.uid}</p>
                        </td>
                        <td className="py-2.5 font-semibold text-gray-800">{u.displayName || 'PollPe User'}</td>
                        <td className="py-2.5 font-bold text-[#7848f4]">{u.coinsBalance?.toLocaleString() || 0}</td>
                        <td className="py-2.5 font-semibold text-gray-700">{u.streakDays || 0} days</td>
                        <td className="py-2.5 font-mono text-gray-600">{u.country || 'IN'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-400 italic">
                        Click "Refresh" above to load the live user records from Firestore.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 6. API Endpoint Testing Suite */}
      <div className="bg-white rounded-[28px] border border-[#e5dcfa] shadow-[0_4px_20px_rgba(120,72,244,0.05)] overflow-hidden">
        <button
          onClick={() => toggleSection('surveys')}
          className="w-full px-6 py-5 sm:p-6 flex items-center justify-between hover:bg-gray-50/70 transition"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#7848f4]" />
            <div className="text-left">
              <h3 className="text-sm sm:text-base font-black text-gray-900">API Endpoint & Webhook Verification</h3>
              <p className="text-xs text-gray-500">Live checks for Cint, AdGem, BitLabs, and Affiliate Deal postbacks</p>
            </div>
          </div>
          {expandedSections.surveys ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {expandedSections.surveys && (
          <div className="px-6 pb-6 pt-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500">
                Validate that all provider webhooks and API proxy routes respond cleanly.
              </p>
              <button
                onClick={testAllEndpoints}
                disabled={isTestingAll}
                className="px-3.5 py-1.5 rounded-xl bg-[#7848f4] text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer hover:bg-[#6837e3] disabled:opacity-50"
              >
                {isTestingAll ? (
                  <>
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>Testing All...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    <span>Test All 10 Endpoints</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid gap-2.5 max-h-96 overflow-y-auto pr-1">
              {apiEndpoints.map((ep) => {
                const result = apiTestResults[ep.id];
                const status = result?.status || 'idle';
                const config = STATUS_CONFIGS[status];
                const Icon = config.icon;

                return (
                  <div
                    key={ep.id}
                    className={`p-3 rounded-2xl border ${config.bg} ${config.border} flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{ep.name}</p>
                        <p className="text-[10px] text-gray-500">{ep.description}</p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {ep.method} {ep.endpoint}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => testApiEndpoint(ep.endpoint, ep.method, ep.id)}
                      disabled={status === 'loading'}
                      className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                    >
                      {status === 'loading' ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="text-center text-xs text-gray-400 pt-4 pb-2">
        <p>Paisa Bharo Administrative Console • Firebase Firestore Real-time Sync Active</p>
      </div>
    </div>
  );
};