import React from 'react';
import { LogOut, Globe, DollarSign, Volume2, VolumeX, Shield, Smartphone, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation, SUPPORTED_LANGUAGES } from '../services/i18n';
import { SUPPORTED_CURRENCIES, formatCoinsValue } from '../services/currencies';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { PollPeCoin } from '../components/Illustrations';

export const SettingsView: React.FC = () => {
  const {
    user,
    firebaseUser,
    loginWithGoogle,
    logout,
    selectedLanguage,
    setLanguage,
    selectedCurrency,
    setCurrency,
    soundEnabled,
    toggleSound,
  } = useApp();

  // Defensive check: user should always exist but handle null gracefully
  const coinsBalance = user?.coinsBalance ?? 0;

  return (
    <div className="space-y-6 pb-12 text-gray-900">
      {/* User Profile Card in PollPe Clean Theme */}
      <div className="rounded-[28px] bg-white border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1e1b2e] text-white font-black text-2xl flex items-center justify-center border-2 border-[#7848f4] shadow-md">
            {(user.displayName?.charAt(0) || 'J').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-gray-900 truncate">
                {firebaseUser?.displayName || user.displayName}
              </h3>
              {firebaseUser && (
                <span className="text-[10px] bg-[#f0ebfc] text-[#7848f4] font-bold px-2 py-0.5 rounded-full">
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {firebaseUser?.email || user.email}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <PollPeCoin className="w-4 h-4" />
              <span className="text-xs font-black text-gray-900">
                {coinsBalance.toLocaleString()} Coins
              </span>
              <span className="text-[11px] text-gray-500">
                ({formatCoinsValue(coinsBalance, selectedCurrency)})
              </span>
            </div>
          </div>
        </div>

        {/* Auth Action Button */}
        <div className="pt-3 border-t border-gray-100">
          {firebaseUser ? (
            <button
              onClick={logout}
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-red-500 font-bold text-xs flex items-center justify-center gap-2 border border-gray-200 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{getTranslation(selectedLanguage, 'signOut')}</span>
            </button>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="w-full py-3 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(120,72,244,0.3)] transition cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              <span>{getTranslation(selectedLanguage, 'signInWithGoogle')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Language Selector */}
      <div className="rounded-[28px] bg-white border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#7848f4]" />
          <h4 className="font-extrabold text-sm text-gray-900">App Language / भाषा / Idioma</h4>
        </div>
        <p className="text-xs text-gray-500">
          Switch the app interface into your preferred native language:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                selectedLanguage === lang.code
                  ? 'bg-[#f0ebfc] border-[#7848f4] text-[#7848f4] font-black shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div>
                <span className="text-sm mr-2">{lang.flag}</span>
                <span className="text-xs font-bold">{lang.nativeName}</span>
              </div>
              {selectedLanguage === lang.code && <CheckCircle2 className="w-4 h-4 text-[#7848f4]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Currency Selector */}
      <div className="rounded-[28px] bg-white border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#7848f4]" />
          <h4 className="font-extrabold text-sm text-gray-900">Payout Currency & Region</h4>
        </div>
        <p className="text-xs text-gray-500">
          Select currency to display exact conversion rates and region-aware withdrawal options:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.keys(SUPPORTED_CURRENCIES).map((code) => {
            const curr = SUPPORTED_CURRENCIES[code];
            const isSelected = selectedCurrency === code;
            return (
              <button
                key={code}
                onClick={() => setCurrency(code)}
                className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#f0ebfc] border-[#7848f4] text-[#7848f4] font-black shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div>
                  <span className="text-sm mr-2">{curr.flag}</span>
                  <span className="text-xs font-bold">{curr.code} ({curr.symbol})</span>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-[#7848f4]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* PWA & Device Status */}
      <div className="rounded-[28px] bg-white border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#7848f4]" />
            <h4 className="font-extrabold text-sm text-gray-900">Progressive Web App (PWA)</h4>
          </div>
          <PWAInstallButton variant="settings" />
        </div>
        <p className="text-xs text-gray-500">
          Paisa Bharo works completely offline, supports background sync, home screen installation, and instant push updates.
        </p>
      </div>

      {/* Sound & Experience */}
      <div className="rounded-[28px] bg-white border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#f0ebfc] flex items-center justify-center text-[#7848f4]">
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
          </div>
          <div>
            <h4 className="font-extrabold text-xs sm:text-sm text-gray-900">Audio & Coin Haptics</h4>
            <p className="text-[11px] text-gray-500">Play pleasant reward chimes upon voting or claiming coins.</p>
          </div>
        </div>
        <button
          onClick={toggleSound}
          className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            soundEnabled
              ? 'bg-[#7848f4] text-white shadow-sm'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}
        >
          {soundEnabled ? 'ON' : 'MUTED'}
        </button>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-gray-400 pt-4 space-y-1">
        <p>Paisa Bharo PWA • PollPe Design Architecture</p>
        <p className="flex items-center justify-center gap-1 text-[11px]">
          <span>Protected with Firebase Zero-Trust Security</span>
          <Shield className="w-3.5 h-3.5 text-[#7848f4] inline" />
        </p>
      </div>
    </div>
  );
};
