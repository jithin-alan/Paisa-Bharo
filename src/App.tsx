import React, { useState } from 'react';
import {
  Home,
  Globe,
  Gift,
  Moon,
  Flame,
  Award,
  Bell,
  ChevronDown,
  Vote,
  Target,
  Trophy,
  Users,
  Settings,
  ShoppingBag,
  Terminal,
  LogOut,
} from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { auth } from './firebase/config';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { LandingPage } from './views/LandingPage';
import { HomeDashboardView } from './views/HomeDashboardView';
import { PollsView } from './views/PollsView';
import { OffersView } from './views/OffersView';
import { CashoutView } from './views/CashoutView';
import { ReferView } from './views/ReferView';
import { LeaderboardView } from './views/LeaderboardView';
import { SettingsView } from './views/SettingsView';
import { DealsCashbackView } from './views/DealsCashbackView';
import { SurveyModal } from './components/SurveyModal';
import { CintSurveyModal } from './components/CintSurveyModal';
import { OfferwallModal } from './components/OfferwallModal';
import { WebhookTesterModal } from './components/WebhookTesterModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { getTranslation, SUPPORTED_LANGUAGES } from './services/i18n';
import { cintAdapter } from './providers/cintAdapter';
import { CintSurvey } from './providers/types';
import { PollPeCoin } from './components/Illustrations';
import { AdminConfigView } from './views/AdminConfigView';
import { useIsAdmin } from './hooks/useIsAdmin';
import { calculateStreakStatus } from './services/streakService';

type TabType = 'home' | 'polls' | 'offers' | 'cashout' | 'leaderboard' | 'refer' | 'settings' | 'deals';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'user'>('admin');
  
  // Third-party provider modals
  const [activeCintSurveyModal, setActiveCintSurveyModal] = useState<CintSurvey | null>(null);
  const [isOfferwallOpen, setIsOfferwallOpen] = useState(false);
  const [offerwallDefaultProvider, setOfferwallDefaultProvider] = useState<'adgem' | 'bitlabs'>('adgem');
  const [isWebhookTesterOpen, setIsWebhookTesterOpen] = useState(false);

  // Phone OTP sign-in
  const [phoneStep, setPhoneStep] = useState<'idle' | 'code'>('idle');
  const [countryCode, setCountryCode] = useState('+91'); // Default: India
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [phoneError, setPhoneError] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Email/Password auth
  const [authMode, setAuthMode] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [emailError, setEmailError] = useState('');

  const {
    user,
    firebaseUser,
    authLoading,
    selectedLanguage,
    setLanguage,
    toast,
    clearToast,
    logout,
    loginWithGoogle,
    googleAuthLoading,
    systemSettings,
  } = useApp();

  const [googleError, setGoogleError] = useState('');

  const handleGoogleLogin = async () => {
    setGoogleError('');
    const res = await loginWithGoogle();
    if (!res.success && res.error) {
      setGoogleError(res.error);
    }
  };

  // Admin status is determined by custom claims via the useIsAdmin hook
  const { isAdmin, checked: adminChecked } = useIsAdmin();

  const handleOpenCintSurvey = async (specificSurvey?: CintSurvey) => {
    if (specificSurvey) {
      setActiveCintSurveyModal(specificSurvey);
    } else {
      const uid = user?.uid || firebaseUser?.uid || 'guest';
      const country = user?.country || 'IN';
      const surveys = await cintAdapter.getEligibleSurveys(uid, { country });
      setActiveCintSurveyModal(surveys[0] || null);
    }
  };

  const handleOpenOfferwall = (provider?: 'adgem' | 'bitlabs') => {
    if (provider) setOfferwallDefaultProvider(provider);
    setIsOfferwallOpen(true);
  };

  const ensureRecaptcha = () => {
    // Always recreate if container was hidden/shown to avoid "client element removed" errors
    if ((window as any).recaptchaVerifier) {
      try { (window as any).recaptchaVerifier.clear(); } catch {}
      (window as any).recaptchaVerifier = null;
    }
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        setPhoneError('reCAPTCHA expired. Please try again.');
      },
    });
    return (window as any).recaptchaVerifier;
  };

  const sendOtp = async () => {
    setPhoneError('');
    setPhoneLoading(true);
    try {
      if (!phoneNumber) throw new Error('Enter phone number');
      const verifier = ensureRecaptcha();
      const formatted = phoneNumber.startsWith('+') ? phoneNumber : `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
      const confirmation = await signInWithPhoneNumber(auth, formatted, verifier);
      setConfirmationResult(confirmation);
      setPhoneStep('code');
    } catch (e: any) {
      setPhoneError(e.message || 'Failed to send OTP');
      // reset recaptcha on error
      try { (window as any).recaptchaVerifier?.render?.(); } catch {}
    } finally {
      setPhoneLoading(false);
    }
  };

  const verifyOtp = async () => {
    setPhoneError('');
    setPhoneLoading(true);
    try {
      if (!confirmationResult) throw new Error('No OTP request found');
      await confirmationResult.confirm(otp);
      // Auth state change will trigger landing removal
    } catch (e: any) {
      setPhoneError(e.message || 'Invalid OTP');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleEmailLogin = async (email: string, password: string) => {
    setEmailError('');
    setPhoneLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, password);
          return;
        } catch (signupErr: any) {
          if (signupErr.code === 'auth/operation-not-allowed') {
            setEmailError('Email/Password provider is disabled in Firebase Console. Please enable it in Firebase Console > Authentication > Sign-in method, or sign in with Google.');
            return;
          }
          setEmailError(signupErr.message || 'Login failed');
          return;
        }
      } else if (e.code === 'auth/operation-not-allowed') {
        setEmailError('Email/Password provider is disabled in Firebase Console. Please enable it in Firebase Console > Authentication > Sign-in method, or sign in with Google.');
        return;
      }
      setEmailError(e.message || 'Login failed');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleEmailSignup = async (email: string, password: string) => {
    setEmailError('');
    setPhoneLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      await createUserWithEmailAndPassword(auth, cleanEmail, password);
    } catch (e: any) {
      if (e.code === 'auth/operation-not-allowed') {
        setEmailError('Email/Password provider is disabled in Firebase Console. Please enable it in Firebase Console > Authentication > Sign-in method, or sign in with Google.');
        return;
      }
      setEmailError(e.message || 'Sign up failed');
    } finally {
      setPhoneLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f8fc] text-[#1e1b2e]">
        <div className="text-center">
          <div className="animate-pulse text-lg font-semibold">Loading Paisa Bharo…</div>
        </div>
      </div>
    );
  }

  // Admin users get the admin panel as their landing page
  // Admin status is determined by custom claims via useIsAdmin hook
  // Wait for adminChecked to avoid race conditions on initial load
  const isUserAdmin = adminChecked && isAdmin;

  if (isUserAdmin && adminViewMode === 'admin') {
    return <AdminConfigView onSwitchToUserApp={() => setAdminViewMode('user')} />;
  }

  // Live Maintenance Mode Gate: Blocks non-admin users when maintenance mode is active
  if (systemSettings?.maintenanceMode && !isUserAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f8fc] text-[#1e1b2e] px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#e5dcfa] p-8 text-center shadow-[0_4px_20px_rgba(120,72,244,0.08)]">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#7848f4] flex items-center justify-center mx-auto mb-4 border border-purple-200">
            <Settings className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-2xl font-black mb-2 text-gray-900">Scheduled Maintenance</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            {systemSettings.maintenanceMessage || 'Paisa Bharo is currently undergoing scheduled upgrades to serve you better.'}
          </p>
          <div className="text-xs text-gray-400 font-medium mb-6">
            Please check back shortly. Thank you for your patience!
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-xl bg-[#7848f4] text-white font-bold hover:bg-[#6837e3] transition cursor-pointer shadow-sm"
          >
            Check Status & Refresh
          </button>
        </div>
      </div>
    );
  }

  // Show landing page whenever there is no loaded user profile.
  // This covers: not logged in, logged in but profile still loading.
  if (!user) {
    return (
      <LandingPage
        onGoogleLogin={handleGoogleLogin}
        googleLoading={googleAuthLoading}
        googleError={googleError}
        onSendOtp={sendOtp}
        onVerifyOtp={verifyOtp}
        onEmailLogin={handleEmailLogin}
        onEmailSignup={handleEmailSignup}
        phoneStep={phoneStep}
        setPhoneStep={setPhoneStep}
        countryCode={countryCode}
        setCountryCode={setCountryCode}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        otp={otp}
        setOtp={setOtp}
        phoneError={phoneError}
        phoneLoading={phoneLoading}
        authMode={authMode}
        setAuthMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        isLogin={isLogin}
        setIsLogin={setIsLogin}
        emailError={emailError}
      />
    );
  }

  const userDisplayName = firebaseUser?.displayName || user?.displayName || 'Jithin';
  const firstLetter = (userDisplayName.charAt(0) || 'J').toUpperCase();

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#1e1b2e] flex flex-col font-sans selection:bg-[#7848f4] selection:text-white">
      {/* Top Navbar matching PollPe exact screenshot */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#eceaf5] px-4 sm:px-8 py-3 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 cursor-pointer select-none group shrink-0"
          >
            {/* PollPe Stylized Purple Swirl Emblem */}
            <div className="w-9 h-9 rounded-full bg-[#7848f4] flex items-center justify-center text-white shadow-sm shadow-purple-500/30 group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-5h2v5zm0-7h-2V7h2v2.5z" opacity="0" />
                <path d="M8 17V7h4.5c2.48 0 4.5 2.02 4.5 4.5S14.98 16 12.5 16H10v1H8zm2-3h2.5c1.38 0 2.5-1.12 2.5-2.5S13.88 9 12.5 9H10v5z" />
              </svg>
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-black tracking-tight text-[#1e1b2e]">
                Paisa<span className="text-[#7848f4]">Bharo</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-[#f59e0b] ml-0.5" />
            </div>
          </div>

          {/* Center Navigation Pills (matches screenshot center) */}
          <div className="hidden md:flex items-center gap-1.5 p-1 bg-[#f0ebfc] rounded-full border border-[#e5dcfa]">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-[#7848f4] text-white shadow-md shadow-purple-500/30'
                  : 'text-[#6b7280] hover:text-[#7848f4]'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => setActiveTab('polls')}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                activeTab === 'polls'
                  ? 'bg-[#7848f4] text-white shadow-sm'
                  : 'text-[#6b7280] hover:text-[#7848f4] hover:bg-white/60'
              }`}
              title="Polls & Surveys"
            >
              <Globe className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab('deals')}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                activeTab === 'deals'
                  ? 'bg-[#7848f4] text-white shadow-sm'
                  : 'text-[#6b7280] hover:text-[#7848f4] hover:bg-white/60'
              }`}
              title="Deals & Cashback"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab('cashout')}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                activeTab === 'cashout'
                  ? 'bg-[#7848f4] text-white shadow-sm'
                  : 'text-[#6b7280] hover:text-[#7848f4] hover:bg-white/60'
              }`}
              title="Rewards & Cashout"
            >
              <Gift className="w-4 h-4" />
            </button>
          </div>

          {/* Right Header Controls (matches screenshot icons) */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Admin Panel button if admin is viewing user app */}
            {isUserAdmin && (
              <button
                type="button"
                onClick={() => setAdminViewMode('admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-[#7848f4] text-xs font-bold transition shadow-sm cursor-pointer"
                title="Return to Admin Panel"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* PWA Install Button */}
            <PWAInstallButton variant="nav" />

            {/* Dark Mode Icon Button */}
            <button
              className="w-9 h-9 rounded-xl border border-[#e5dcfa] bg-white text-gray-500 hover:text-[#7848f4] hover:border-[#7848f4] flex items-center justify-center transition cursor-pointer shadow-sm"
              title="Toggle Appearance"
            >
              <Moon className="w-4 h-4" />
            </button>

            {/* Streak Icon Button with Dynamic Badge */}
            {(() => {
              const streakStatus = calculateStreakStatus(user?.lastCheckInDate, user?.streakDays, user?.timezone);
              return (
                <button
                  onClick={() => setActiveTab('polls')}
                  className="relative w-9 h-9 rounded-xl border border-[#e5dcfa] bg-white text-gray-400 hover:text-orange-500 flex items-center justify-center transition cursor-pointer shadow-sm"
                  title={
                    streakStatus.isStreakBroken
                      ? 'Streak expired (missed yesterday) - check in to restart'
                      : `${streakStatus.effectiveStreak} Day Streak`
                  }
                >
                  <Flame
                    className={`w-4 h-4 ${
                      streakStatus.effectiveStreak > 0 ? 'text-amber-500 fill-amber-500' : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`absolute -top-1.5 -right-1.5 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm ${
                      streakStatus.isStreakBroken ? 'bg-amber-500' : 'bg-[#7848f4]'
                    }`}
                  >
                    {streakStatus.effectiveStreak}
                  </span>
                </button>
              );
            })()}

            {/* XP Badge */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#e5dcfa] bg-white text-xs font-bold text-[#7848f4] shadow-sm">
              <Award className="w-3.5 h-3.5" />
              <span>{Math.floor((user?.coinsBalance ?? 0) / 10)} XP</span>
            </div>

            {/* Notification Bell */}
            <button
              className="w-9 h-9 rounded-xl border border-[#e5dcfa] bg-white text-gray-500 hover:text-[#7848f4] flex items-center justify-center transition cursor-pointer shadow-sm"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="w-9 h-9 rounded-xl border border-[#e5dcfa] bg-white text-xs font-black text-gray-700 flex items-center justify-center hover:border-[#7848f4] transition shadow-sm cursor-pointer"
                title="Language"
              >
                {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.flag || '🌐'}
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white border border-[#e5dcfa] shadow-xl py-2 z-50 text-xs">
                  {SUPPORTED_LANGUAGES.map((lang, idx) => (
                    <button
                      key={`app-lang-${lang.code}-${idx}`}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-[#f0ebfc] transition cursor-pointer ${
                        selectedLanguage === lang.code ? 'text-[#7848f4] font-black bg-[#f0ebfc]' : 'text-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.nativeName}</span>
                      </span>
                      {selectedLanguage === lang.code && <span className="font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile Pill (matches screenshot: Dark circle avatar + Hi, Name + chevron) */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-[#e5dcfa] bg-white hover:border-[#7848f4] transition cursor-pointer shadow-sm"
              >
                <div className="w-7 h-7 rounded-full bg-[#1e1b2e] text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {firstLetter}
                </div>
                <span className="text-xs font-bold text-gray-800 hidden sm:inline">
                  Hi, {userDisplayName.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-[#e5dcfa] shadow-2xl py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-bold text-gray-900 truncate">{userDisplayName}</p>
                    <p className="text-[11px] text-gray-500 truncate">{user?.email || firebaseUser?.email || ''}</p>
                  </div>
                  {isUserAdmin && (
                    <button
                      onClick={() => {
                        setAdminViewMode('admin');
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-[#7848f4] hover:bg-[#f0ebfc] transition font-bold flex items-center gap-2"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Admin Console</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-[#f0ebfc] hover:text-[#7848f4] transition font-medium"
                  >
                    Account Settings
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('refer');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-[#f0ebfc] hover:text-[#7848f4] transition font-medium"
                  >
                    Refer & Earn (500 🪙)
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('leaderboard');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-[#f0ebfc] hover:text-[#7848f4] transition font-medium"
                  >
                    Leaderboard
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setActiveTab('deals');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-[#f0ebfc] hover:text-[#7848f4] transition font-medium flex items-center justify-between"
                  >
                    <span>🛍️ Deals & Cashback</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">New</span>
                  </button>
                  <button
                    onClick={() => {
                      handleOpenOfferwall();
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-[#f0ebfc] hover:text-[#7848f4] transition font-medium flex items-center justify-between"
                  >
                    <span>🎮 Offerwall</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">AdGem/BL</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsWebhookTesterOpen(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-[#f0ebfc] hover:text-[#7848f4] transition font-medium flex items-center justify-between"
                  >
                    <span>⚡ S2S Webhook Tester</span>
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition font-medium flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification for Coin Earnings & Provider Updates */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm rounded-2xl bg-white border border-[#e5dcfa] p-4 shadow-[0_10px_30px_rgba(120,72,244,0.2)] flex items-center justify-between gap-3 animate-bounce-in">
          <div className="flex items-center gap-3">
            <PollPeCoin className="w-6 h-6 shrink-0" />
            <div>
              <p className="text-xs font-black text-gray-900">{toast.text}</p>
              <p className="text-[10px] text-gray-500">Live balance updated</p>
            </div>
          </div>
          <button
            onClick={clearToast}
            className="text-gray-400 hover:text-gray-700 text-xs font-bold p-1 rounded-lg hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 pb-24">
        {activeTab === 'home' && (
          <HomeDashboardView
            onNavigateTab={setActiveTab}
            onOpenOfferwall={handleOpenOfferwall}
            onOpenCintSurvey={handleOpenCintSurvey}
            onOpenWebhookTester={() => setIsWebhookTesterOpen(true)}
          />
        )}
        {activeTab === 'polls' && <PollsView />}
        {activeTab === 'offers' && <OffersView />}
        {activeTab === 'deals' && <DealsCashbackView />}
        {activeTab === 'cashout' && <CashoutView />}
        {activeTab === 'leaderboard' && <LeaderboardView />}
        {activeTab === 'refer' && <ReferView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Survey Runner Modal (Global) */}
      <SurveyModal />

      {/* Cint Survey Supply Modal */}
      <CintSurveyModal
        survey={activeCintSurveyModal}
        onClose={() => setActiveCintSurveyModal(null)}
      />

      {/* Unified AdGem & BitLabs Offerwall Modal */}
      <OfferwallModal
        isOpen={isOfferwallOpen}
        onClose={() => setIsOfferwallOpen(false)}
        defaultProvider={offerwallDefaultProvider}
      />

      {/* S2S Webhook & Postback Developer Simulator */}
      <WebhookTesterModal
        isOpen={isWebhookTesterOpen}
        onClose={() => setIsWebhookTesterOpen(false)}
      />

      {/* Connectivity Indicator */}
      <OfflineIndicator language={selectedLanguage} />

      {/* Bottom Navigation Bar for Mobile and Responsive PWA */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#eceaf5] py-2 px-2 safe-bottom shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {[
            { id: 'home', label: 'Home', icon: Home },
            { id: 'polls', label: getTranslation(selectedLanguage, 'pollsTab'), icon: Vote },
            { id: 'offers', label: getTranslation(selectedLanguage, 'offersTab'), icon: Target },
            { id: 'deals', label: 'Cashback', icon: ShoppingBag },
            { id: 'cashout', label: getTranslation(selectedLanguage, 'rewardsTab'), icon: Gift },
            { id: 'refer', label: getTranslation(selectedLanguage, 'referTab'), icon: Users },
            { id: 'settings', label: getTranslation(selectedLanguage, 'profileTab'), icon: Settings },
          ].map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={`app-nav-${item.id}-${idx}`}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'text-[#7848f4] scale-105'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                <span
                  className={`text-[8px] mt-0.5 font-bold transition-colors line-clamp-1 ${
                    isActive ? 'text-[#7848f4]' : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </span>

                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7848f4] mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}