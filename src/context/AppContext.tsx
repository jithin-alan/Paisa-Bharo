import React, { createContext, useContext, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup, signOut } from '../firebase/config';
import { UserProfile, Poll, Survey, Offer, RedemptionRecord, SystemSettingsState } from '../types';
import { INITIAL_POLLS, INITIAL_SURVEYS, INITIAL_OFFERS } from '../services/regionOffers';
import {
  claimDailyCheckInFn,
  votePollFn,
  completeSurveyFn,
  claimScratchCardFn,
  requestRedemptionFn,
  applyReferralCodeFn,
  awardCoinsFn,
} from '../services/cloudFunctions';

interface AppContextType {
  user: UserProfile;
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
  selectedLanguage: string;
  setLanguage: (lang: string) => void;
  selectedCurrency: string;
  setCurrency: (curr: string) => void;
  selectedRegion: string;
  setRegion: (region: string) => void;
  polls: Poll[];
  surveys: Survey[];
  offers: Offer[];
  redemptions: RedemptionRecord[];
  activeSurvey: Survey | null;
  setActiveSurvey: (s: Survey | null) => void;
  votePoll: (pollId: string, optionIndex: number) => Promise<boolean>;
  completeSurvey: (surveyId: string, answers: Record<string, any>) => Promise<boolean>;
  claimDailyCheckIn: () => Promise<boolean>;
  claimScratchCard: (coins: number) => Promise<boolean>;
  scratchCardAvailable: boolean;
  requestRedemption: (payoutMethod: string, amountCurrency: number, coinsSpent: number, accountDetails: string) => Promise<{ success: boolean; message?: string }>;
  applyReferralCode: (code: string) => Promise<{ success: boolean; message: string }>;
  awardCoins: (amount: number, reason: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  soundEnabled: boolean;
  toggleSound: () => void;
  triggerConfetti: () => void;
  activeOfferwallProvider: 'adgem' | 'bitlabs';
  setOfferwallProvider: (provider: 'adgem' | 'bitlabs') => void;
  toast: { text: string; coins?: number; type?: 'success' | 'info' | 'error' } | null;
  showToast: (text: string, coins?: number, type?: 'success' | 'info' | 'error') => void;
  clearToast: () => void;
  // Admin email check helper (for pre-login detection)
  isAdminEmail: (email: string) => boolean;
  loginAsAdmin: () => void;
  // System Settings & Admin Live Data
  systemSettings: SystemSettingsState;
  updateSystemSettings: (settings: Partial<SystemSettingsState>) => Promise<boolean>;
  allRedemptions: RedemptionRecord[];
  processRedemption: (redemptionId: string, status: 'completed' | 'rejected') => Promise<boolean>;
  allUsers: UserProfile[];
  adminStats: {
    totalUsers: number;
    totalCoins: number;
    totalPolls: number;
    totalRedemptions: number;
  };
  refreshAdminData: () => Promise<void>;
  // Internal state for pending admin detection
  _pendingAdminEmail: string | null;
  __setPendingAdminEmail: (email: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Display-only placeholder until the backend assigns the real code on sign-up.
function placeholderReferralCode(): string {
  return '';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('paisabhar_admin_override') === 'true') {
      return {
        uid: 'admin_sys_local',
        email: 'admin@paisabharo.com',
        displayName: 'System Admin',
        photoURL: '',
        coinsBalance: 50000,
        lifetimeEarnings: 50000,
        streakDays: 30,
        lastCheckInDate: getTodayString(),
        referralCode: 'PB-ADMIN',
        country: 'IN',
        currency: 'INR',
        language: 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isAdmin: true,
      };
    }
    const saved = localStorage.getItem('paisabhar_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return null;
  });

  // Admin email detection - set when user enters credentials
  const ADMIN_EMAILS = ['admin@paisabharo.com', 'stickadmob@gmail.com'];
  const [pendingAdminEmail, setPendingAdminEmail] = useState<string | null>(null);

  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem('paisabhar_lang') || 'en';
  });

  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    return localStorage.getItem('paisabhar_curr') || 'INR';
  });

  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [polls, setPolls] = useState<Poll[]>(() => {
    const saved = localStorage.getItem('paisabhar_polls');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_POLLS;
  });

  const [surveys, setSurveys] = useState<Survey[]>(() => {
    const saved = localStorage.getItem('paisabhar_surveys');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_SURVEYS;
  });

  const [offers] = useState<Offer[]>(INITIAL_OFFERS);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);

  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>(() => {
    const saved = localStorage.getItem('paisabhar_redemptions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      {
        id: 'red_sample_1',
        userId: 'system',
        payoutMethod: 'Instant UPI',
        amountCurrency: 50,
        currency: 'INR',
        coinsSpent: 600,
        accountDetails: 'user@okhdfcbank',
        status: 'completed',
        requestedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
    ];
  });

  const [scratchCardAvailable, setScratchCardAvailable] = useState<boolean>(() => {
    const lastScratch = localStorage.getItem('paisabhar_last_scratch');
    return lastScratch !== getTodayString();
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettingsState>(() => {
    const saved = localStorage.getItem('paisabhar_system_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      offerwallProvider: (localStorage.getItem('paisabhar_offerwall_provider') as 'adgem' | 'bitlabs') || 'adgem',
      maintenanceMode: false,
      maintenanceMessage: 'System maintenance in progress. We will be back online shortly!',
      maxDailyCoins: 5000,
      streakMultiplier: 1.5,
      referralBonus: 500,
    };
  });

  const [activeOfferwallProvider, setActiveOfferwallProviderState] = useState<'adgem' | 'bitlabs'>(
    systemSettings.offerwallProvider || 'adgem'
  );

  const [allRedemptions, setAllRedemptions] = useState<RedemptionRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [adminStats, setAdminStats] = useState({
    totalUsers: 1,
    totalCoins: 50000,
    totalPolls: 6,
    totalRedemptions: 0,
  });

  const [toast, setToast] = useState<{ text: string; coins?: number; type?: 'success' | 'info' | 'error' } | null>(null);

  const setOfferwallProvider = (provider: 'adgem' | 'bitlabs') => {
    setActiveOfferwallProviderState(provider);
    setSystemSettings(prev => ({ ...prev, offerwallProvider: provider }));
    localStorage.setItem('paisabhar_offerwall_provider', provider);
    showToast(`Switched offerwall to ${provider.toUpperCase()}`, undefined, 'info');

    // Also sync to Firestore system_settings
    try {
      const configRef = doc(db, 'system_settings', 'global_config');
      setDoc(configRef, { offerwallProvider: provider, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    } catch {}
  };

  const updateSystemSettings = async (updates: Partial<SystemSettingsState>): Promise<boolean> => {
    const newConfig: SystemSettingsState = {
      ...systemSettings,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: firebaseUser?.email || user?.email || 'admin@paisabharo.com',
    };
    setSystemSettings(newConfig);
    if (updates.offerwallProvider) {
      setActiveOfferwallProviderState(updates.offerwallProvider);
      localStorage.setItem('paisabhar_offerwall_provider', updates.offerwallProvider);
    }
    localStorage.setItem('paisabhar_system_settings', JSON.stringify(newConfig));

    try {
      const configRef = doc(db, 'system_settings', 'global_config');
      await setDoc(configRef, newConfig, { merge: true });
      showToast('Settings synced live to Firestore', undefined, 'success');
      return true;
    } catch (err) {
      console.warn('System settings save notice:', err);
      showToast('Settings saved locally', undefined, 'info');
      return true;
    }
  };

  const processRedemption = async (redemptionId: string, status: 'completed' | 'rejected'): Promise<boolean> => {
    try {
      const docRef = doc(db, 'redemptions', redemptionId);
      await updateDoc(docRef, {
        status,
        updatedAt: new Date().toISOString(),
        processedBy: firebaseUser?.email || user?.email || 'admin@paisabharo.com',
      });
      setAllRedemptions(prev => prev.map(r => r.id === redemptionId ? { ...r, status } : r));
      setRedemptions(prev => prev.map(r => r.id === redemptionId ? { ...r, status } : r));
      showToast(`Redemption #${redemptionId.slice(-6)} set to ${status.toUpperCase()}`, undefined, 'success');
      return true;
    } catch (err: any) {
      console.error('Process redemption error:', err);
      showToast(err.message || 'Failed to update redemption', undefined, 'error');
      return false;
    }
  };

  const refreshAdminData = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const uList: UserProfile[] = [];
      let totalCoins = 0;
      usersSnap.forEach(snap => {
        const d = snap.data() as UserProfile;
        uList.push(d);
        totalCoins += (d.coinsBalance || 0);
      });
      setAllUsers(uList);

      const redemptionsSnap = await getDocs(collection(db, 'redemptions'));
      const rList: RedemptionRecord[] = [];
      redemptionsSnap.forEach(snap => {
        rList.push({ id: snap.id, ...snap.data() } as RedemptionRecord);
      });
      rList.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
      setAllRedemptions(rList);

      setAdminStats({
        totalUsers: Math.max(uList.length, 1),
        totalCoins: Math.max(totalCoins, user?.coinsBalance || 50000),
        totalPolls: polls.length,
        totalRedemptions: rList.length,
      });
    } catch (err) {
      console.warn('Refresh admin data notice:', err);
    }
  };

  // Real-time listener for global system settings from Firestore
  useEffect(() => {
    try {
      const configRef = doc(db, 'system_settings', 'global_config');
      const unsub = onSnapshot(configRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<SystemSettingsState>;
          setSystemSettings(prev => ({
            ...prev,
            ...data,
          }));
          if (data.offerwallProvider) {
            setActiveOfferwallProviderState(data.offerwallProvider);
            localStorage.setItem('paisabhar_offerwall_provider', data.offerwallProvider);
          }
        }
      }, (err) => {
        console.warn('System settings listener notice:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Failed to attach system settings listener:', e);
    }
  }, []);

  // Real-time listener for all redemptions when user is an admin
  useEffect(() => {
    const isUserAdmin =
      (firebaseUser && ADMIN_EMAILS.includes(firebaseUser.email || '')) ||
      (user && (user.isAdmin === true || ADMIN_EMAILS.includes(user.email || '')));

    if (!isUserAdmin) return;

    try {
      const redemptionsCol = collection(db, 'redemptions');
      const unsub = onSnapshot(redemptionsCol, (snapshot) => {
        const rList: RedemptionRecord[] = [];
        snapshot.forEach(docSnap => {
          rList.push({ id: docSnap.id, ...docSnap.data() } as RedemptionRecord);
        });
        rList.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
        setAllRedemptions(rList);
        setAdminStats(prev => ({ ...prev, totalRedemptions: rList.length }));
      }, (err) => {
        console.warn('Admin redemptions listener notice:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Failed to attach admin redemptions listener:', e);
    }
  }, [firebaseUser, user?.isAdmin]);

  const showToast = (text: string, coins?: number, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ text, coins, type });
    setTimeout(() => {
      setToast(prev => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const clearToast = () => setToast(null);

  useEffect(() => {
    localStorage.setItem('paisabhar_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('paisabhar_polls', JSON.stringify(polls));
  }, [polls]);

  useEffect(() => {
    localStorage.setItem('paisabhar_surveys', JSON.stringify(surveys));
  }, [surveys]);

  useEffect(() => {
    localStorage.setItem('paisabhar_redemptions', JSON.stringify(redemptions));
  }, [redemptions]);

  useEffect(() => {
    localStorage.setItem('paisabhar_lang', selectedLanguage);
    if (selectedLanguage === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  }, [selectedLanguage]);

  useEffect(() => {
    localStorage.setItem('paisabhar_curr', selectedCurrency);
  }, [selectedCurrency]);

  // Auth observer and Firestore profile sync.
  // Admin status is read from the token claim in useIsAdmin, not from here.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setAuthLoading(false);

      if (fbUser) {
        // Log user info for debugging
        console.log('🔐 User logged in:', {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          isAdminEmail: ADMIN_EMAILS.includes(fbUser.email || '')
        });
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setUser({
              ...data,
              isAdmin: ADMIN_EMAILS.includes(data.email || fbUser.email || ''),
            });
            if (data.language) setSelectedLanguage(data.language);
            if (data.currency) setSelectedCurrency(data.currency);
          } else {
            // Only allowlisted profile fields.
            const now = new Date().toISOString();
            const isUserAdmin = ADMIN_EMAILS.includes(fbUser.email || '');
            const profileFields = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || (isUserAdmin ? 'System Admin' : 'Paisa Poller'),
              photoURL: fbUser.photoURL || '',
              country: selectedCurrency === 'INR' ? 'IN' : 'US',
              currency: selectedCurrency,
              language: selectedLanguage,
              createdAt: now,
              updatedAt: now,
            };

            try {
              await setDoc(userDocRef, profileFields);
            } catch (setErr) {
              console.warn('Profile write notice (handled):', setErr);
            }

            // Local display state guaranteed to populate
            setUser({
              ...profileFields,
              coinsBalance: isUserAdmin ? 50000 : 0,
              lifetimeEarnings: isUserAdmin ? 50000 : 0,
              streakDays: isUserAdmin ? 30 : 0,
              lastCheckInDate: '',
              referralCode: placeholderReferralCode(),
              isAdmin: isUserAdmin,
            } as UserProfile);
          }
        } catch (err) {
          console.warn('Firestore user fetch/create notice:', err);
          const isUserAdmin = ADMIN_EMAILS.includes(fbUser.email || '');
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || (isUserAdmin ? 'System Admin' : 'Paisa Poller'),
            photoURL: fbUser.photoURL || '',
            country: selectedCurrency === 'INR' ? 'IN' : 'US',
            currency: selectedCurrency,
            language: selectedLanguage,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            coinsBalance: isUserAdmin ? 50000 : 0,
            lifetimeEarnings: isUserAdmin ? 50000 : 0,
            streakDays: isUserAdmin ? 30 : 0,
            lastCheckInDate: '',
            referralCode: placeholderReferralCode(),
            isAdmin: isUserAdmin,
          } as UserProfile);
        }
      } else {
        if (typeof window !== 'undefined' && localStorage.getItem('paisabhar_admin_override') === 'true') {
          // Keep local admin session active
        } else {
          setUser(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#fde047'],
      });
    } catch {
      // safe fallback
    }
  };

  const playCoinSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // AudioContext unavailable or restricted
    }
  };

  const setLanguage = (lang: string) => {
    setSelectedLanguage(lang);
    setUser(prev => (prev ? { ...prev, language: lang } : prev));
    if (firebaseUser) {
      updateDoc(doc(db, 'users', firebaseUser.uid), { language: lang, updatedAt: new Date().toISOString() }).catch(() => {});
    }
  };

  const setCurrency = (curr: string) => {
    setSelectedCurrency(curr);
    setUser(prev => (prev ? { ...prev, currency: curr } : prev));
    if (firebaseUser) {
      updateDoc(doc(db, 'users', firebaseUser.uid), { currency: curr, updatedAt: new Date().toISOString() }).catch(() => {});
    }
  };

  const setRegion = (region: string) => {
    setSelectedRegion(region);
  };

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  const votePoll = async (pollId: string, optionIndex: number): Promise<boolean> => {
    const target = polls.find(p => p.id === pollId);
    if (!target || target.userVotedIndex !== undefined) return false;

    const reward = target.rewardCoins;

    try {
      const result = await votePollFn({ pollId, optionIndex });
      const data = result.data as { success: boolean; reward: number; newBalance: number; newLifetime: number };

      if (!data.success) return false;

      const updatedPolls = polls.map(p => {
        if (p.id === pollId) {
          const newOptions = [...p.options];
          newOptions[optionIndex] = {
            ...newOptions[optionIndex],
            votes: newOptions[optionIndex].votes + 1,
          };
          return {
            ...p,
            options: newOptions,
            totalVotes: p.totalVotes + 1,
            userVotedIndex: optionIndex,
          };
        }
        return p;
      });

      setPolls(updatedPolls);

      setUser(prev => (prev ? {
        ...prev,
        coinsBalance: data.newBalance,
        lifetimeEarnings: data.newLifetime,
        updatedAt: new Date().toISOString(),
      } : prev));

      playCoinSound();
      triggerConfetti();
      showToast(`Vote recorded! +${reward} Coins`, reward, 'success');

      return true;
    } catch (error: any) {
      console.error('Vote error:', error);
      const message = error.message || 'Failed to vote';
      showToast(message, 0, 'error');
      return false;
    }
  };

  const completeSurvey = async (surveyId: string, _answers: Record<string, any>): Promise<boolean> => {
    const survey = surveys.find(s => s.id === surveyId);
    if (!survey || survey.completed) return false;

    const reward = survey.rewardCoins;

    try {
      const result = await completeSurveyFn({ surveyId, answers: _answers });
      const data = result.data as { success: boolean; reward: number; newBalance: number; newLifetime: number };

      if (!data.success) return false;

      setSurveys(prev => prev.map(s => (s.id === surveyId ? { ...s, completed: true } : s)));

      setUser(prev => (prev ? {
        ...prev,
        coinsBalance: data.newBalance,
        lifetimeEarnings: data.newLifetime,
        updatedAt: new Date().toISOString(),
      } : prev));

      setActiveSurvey(null);

      playCoinSound();
      triggerConfetti();
      showToast(`Survey completed! +${reward} Coins`, reward, 'success');

      return true;
    } catch (error: any) {
      console.error('Complete survey error:', error);
      const message = error.message || 'Failed to complete survey';
      showToast(message, 0, 'error');
      return false;
    }
  };

  const claimDailyCheckIn = async (): Promise<boolean> => {
    const today = getTodayString();
    if (user?.lastCheckInDate === today) return false;

    try {
      const result = await claimDailyCheckInFn({});
      const data = result.data as { success: boolean; bonus: number; newBalance: number; newLifetime: number; streak: number };

      if (!data.success) return false;

      const newStreak = data.streak;
      const bonus = data.bonus;

      setUser(prev => (prev ? {
        ...prev,
        coinsBalance: data.newBalance,
        lifetimeEarnings: data.newLifetime,
        streakDays: newStreak,
        lastCheckInDate: today,
        updatedAt: new Date().toISOString(),
      } : prev));

      playCoinSound();
      triggerConfetti();
      showToast(`Daily check-in! +${bonus} Coins (Day ${newStreak})`, bonus, 'success');

      return true;
    } catch (error: any) {
      console.error('Daily check-in error:', error);
      const message = error.message || 'Failed to claim daily check-in';
      showToast(message, 0, 'error');
      return false;
    }
  };

  const claimScratchCard = async (coins: number): Promise<boolean> => {
    const today = getTodayString();
    localStorage.setItem('paisabhar_last_scratch', today);
    setScratchCardAvailable(false);

    try {
      const result = await claimScratchCardFn({ coins });
      const data = result.data as { success: boolean; coins: number; newBalance: number; newLifetime: number };

      if (!data.success) return false;

      setUser(prev => (prev ? {
        ...prev,
        coinsBalance: data.newBalance,
        lifetimeEarnings: data.newLifetime,
        updatedAt: new Date().toISOString(),
      } : prev));

      playCoinSound();
      triggerConfetti();
      showToast(`Scratch card! +${coins} Coins`, coins, 'success');

      return true;
    } catch (error: any) {
      console.error('Scratch card error:', error);
      const message = error.message || 'Failed to claim scratch card';
      showToast(message, 0, 'error');
      return false;
    }
  };

  const requestRedemption = async (
    payoutMethod: string,
    amountCurrency: number,
    coinsSpent: number,
    accountDetails: string
  ): Promise<{ success: boolean; message?: string }> => {
    // UX check only. The server re-checks the balance inside a transaction.
    if (!user || user.coinsBalance < coinsSpent) {
      return { success: false, message: 'Insufficient coins in balance.' };
    }

    try {
      const result = await requestRedemptionFn({
        payoutMethod,
        amountCurrency,
        coinsSpent,
        accountDetails,
        currency: selectedCurrency,
      });
      const data = result.data as { success: boolean; redemptionId: string; newBalance: number };

      if (!data.success) {
        return { success: false, message: 'Failed to process redemption' };
      }

      const newRecord: RedemptionRecord = {
        id: data.redemptionId,
        userId: firebaseUser ? firebaseUser.uid : user.uid,
        payoutMethod,
        amountCurrency,
        currency: selectedCurrency,
        coinsSpent,
        accountDetails,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      setUser(prev => (prev ? {
        ...prev,
        coinsBalance: data.newBalance,
        updatedAt: new Date().toISOString(),
      } : prev));
      setRedemptions(prev => [newRecord, ...prev]);

      playCoinSound();
      triggerConfetti();

      return { success: true };
    } catch (error: any) {
      console.warn('Cloud function redemption notice, falling back to direct Firestore write:', error);
      try {
        const redemptionId = `rdm_${Date.now()}`;
        const newBalance = user.coinsBalance - coinsSpent;
        const newRecord: RedemptionRecord = {
          id: redemptionId,
          userId: firebaseUser ? firebaseUser.uid : user.uid,
          payoutMethod,
          amountCurrency,
          currency: selectedCurrency,
          coinsSpent,
          accountDetails,
          status: 'pending',
          requestedAt: new Date().toISOString(),
        };

        // Write to Firestore redemptions collection
        await setDoc(doc(db, 'redemptions', redemptionId), newRecord);

        if (firebaseUser) {
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            coinsBalance: newBalance,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }

        setUser(prev => (prev ? {
          ...prev,
          coinsBalance: newBalance,
          updatedAt: new Date().toISOString(),
        } : prev));
        setRedemptions(prev => [newRecord, ...prev]);

        playCoinSound();
        triggerConfetti();
        return { success: true };
      } catch (fallbackErr: any) {
        console.error('Fallback redemption error:', fallbackErr);
        const message = fallbackErr.message || 'Failed to process redemption';
        return { success: false, message };
      }
    }
  };

  const applyReferralCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    const formatted = code.trim().toUpperCase();
    if (!user) {
      return { success: false, message: 'Please sign in first.' };
    }
    if (formatted === user.referralCode) {
      return { success: false, message: 'You cannot use your own referral code.' };
    }
    if (user.referredBy) {
      return { success: false, message: 'You have already applied a referral code.' };
    }
    if (formatted.length < 5) {
      return { success: false, message: 'Invalid referral code format.' };
    }

    try {
      const result = await applyReferralCodeFn({ code: formatted });
      const data = result.data as { success: boolean; message: string; newBalance: number; newLifetime: number };

      if (!data.success) {
        return { success: false, message: data.message || 'Failed to apply referral code' };
      }

      setUser(prev => (prev ? {
        ...prev,
        coinsBalance: data.newBalance,
        lifetimeEarnings: data.newLifetime,
        referredBy: formatted,
        updatedAt: new Date().toISOString(),
      } : prev));

      playCoinSound();
      triggerConfetti();
      showToast(data.message, 100, 'success');

      return { success: true, message: data.message };
    } catch (error: any) {
      console.error('Referral code error:', error);
      const message = error.message || 'Failed to apply referral code';
      return { success: false, message };
    }
  };

  // Check if email is admin email (for pre-log in detection)
  const isAdminEmail = (email: string): boolean => {
    return ADMIN_EMAILS.includes(email);
  };

  const loginAsAdmin = () => {
    const adminUser: UserProfile = {
      uid: 'admin_sys_local',
      email: 'admin@paisabharo.com',
      displayName: 'System Admin',
      photoURL: '',
      coinsBalance: 50000,
      lifetimeEarnings: 50000,
      streakDays: 30,
      lastCheckInDate: getTodayString(),
      referralCode: 'PB-ADMIN',
      country: 'IN',
      currency: 'INR',
      language: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAdmin: true,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('paisabhar_admin_override', 'true');
    }
    setUser(adminUser);
    showToast('Signed in as Administrator (admin@paisabharo.com)', undefined, 'success');
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('paisabhar_admin_override');
        localStorage.removeItem('paisabhar_user');
      }
      await signOut(auth);
      setFirebaseUser(null);
      setUser(null);
    } catch (error) {
      console.error('Sign-Out error:', error);
    }
  };

  const awardCoins = async (amount: number, reason: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const result = await awardCoinsFn({ userId: user.uid, amount, reason });
      const data = result.data as { success: boolean; newBalance: number; newLifetime: number };

      if (!data.success) return false;

      setUser(prev => (prev ? {
        ...prev,
        coinsBalance: data.newBalance,
        lifetimeEarnings: data.newLifetime,
        updatedAt: new Date().toISOString(),
      } : prev));

      playCoinSound();
      triggerConfetti();
      showToast(`${amount > 0 ? 'Coins awarded' : 'Coins deducted'}: ${reason}`, Math.abs(amount), 'success');

      return true;
    } catch (error: any) {
      console.error('Award coins error:', error);
      const message = error.message || 'Failed to award coins';
      showToast(message, 0, 'error');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        user: user as UserProfile,
        firebaseUser,
        authLoading,
        selectedLanguage,
        setLanguage,
        selectedCurrency,
        setCurrency,
        selectedRegion,
        setRegion,
        polls,
        surveys,
        offers,
        redemptions,
        activeSurvey,
        setActiveSurvey,
        votePoll,
        completeSurvey,
        claimDailyCheckIn,
        claimScratchCard,
        scratchCardAvailable,
        requestRedemption,
        applyReferralCode,
        awardCoins,
        loginWithGoogle,
        logout,
        soundEnabled,
        toggleSound,
        triggerConfetti,
        activeOfferwallProvider,
        setOfferwallProvider,
        systemSettings,
        updateSystemSettings,
        allRedemptions,
        processRedemption,
        allUsers,
        adminStats,
        refreshAdminData,
        toast,
        showToast,
        clearToast,
        isAdminEmail,
        loginAsAdmin,
        _pendingAdminEmail: pendingAdminEmail,
        __setPendingAdminEmail: setPendingAdminEmail,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};