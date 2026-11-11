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
  requestSurveyVerificationFn,
  reviewRedemptionFn,
} from '../services/cloudFunctions';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { getTodayString, getUserTimezone } from '../services/streakService';

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
  claimScratchCard: () => Promise<{ success: boolean; coins: number }>;
  scratchCardAvailable: boolean;
  requestRedemption: (payoutMethod: string, amountCurrency: number, coinsSpent: number, accountDetails: string) => Promise<{ success: boolean; message?: string }>;
  applyReferralCode: (code: string) => Promise<{ success: boolean; message: string }>;
  awardCoins: (amount: number, reason: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  googleAuthLoading: boolean;
  logout: () => Promise<void>;
  soundEnabled: boolean;
  toggleSound: () => void;
  triggerConfetti: () => void;
  activeOfferwallProvider: 'adgem' | 'bitlabs';
  setOfferwallProvider: (provider: 'adgem' | 'bitlabs') => void;
  toast: { text: string; coins?: number; type?: 'success' | 'info' | 'error' } | null;
  showToast: (text: string, coins?: number, type?: 'success' | 'info' | 'error') => void;
  clearToast: () => void;
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
}

const AppContext = createContext<AppContextType | null>(null);

// Display-only placeholder until the backend assigns the real code on sign-up.
function placeholderReferralCode(): string {
  return '';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('paisabhar_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserProfile;
        // Ensure all required fields have defaults (for when user is loaded from localStorage
        // before Firestore sync completes or for backwards compatibility)
        // Spread parsed FIRST, then override with defaults to ensure undefined values get defaults
        return {
          ...parsed,
          coinsBalance: parsed.coinsBalance ?? 0,
          lifetimeEarnings: parsed.lifetimeEarnings ?? 0,
          streakDays: parsed.streakDays ?? 0,
          isAdmin: false, // Set from custom claims in useIsAdmin hook
        };
      } catch {
        // fallback
      }
    }
    return null;
  });

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
        const parsed = JSON.parse(saved) as SystemSettingsState;
        // maintenanceMode is a global live setting — never trust the stale localStorage cache.
        // The Firestore onSnapshot listener below is the single source of truth.
        return { ...parsed, maintenanceMode: false };
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
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);

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
      const result = await reviewRedemptionFn({ redemptionId, status });
      const data = result.data as { success: boolean; message: string; refunded?: boolean };

      if (!data.success) {
        showToast(data.message || 'Failed to update redemption', undefined, 'error');
        return false;
      }

      setAllRedemptions(prev => prev.map(r => r.id === redemptionId ? { ...r, status } : r));
      setRedemptions(prev => prev.map(r => r.id === redemptionId ? { ...r, status } : r));
      
      const toastMessage = data.refunded
        ? `Redemption #${redemptionId.slice(-6)} REJECTED: Coins refunded to user`
        : `Redemption #${redemptionId.slice(-6)} set to ${status.toUpperCase()}`;
      
      showToast(toastMessage, undefined, 'success');
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
            // Explicitly resolve maintenance mode from Firestore (defaults to OFF when
            // the field is absent) so a stale localStorage value can never re-show
            // the maintenance screen.
            maintenanceMode: typeof data.maintenanceMode === 'boolean' ? data.maintenanceMode : false,
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

  // Admin status is checked via custom claims
  const { isAdmin } = useIsAdmin();

  // Real-time listener for all redemptions when user is an admin
  useEffect(() => {
    if (!isAdmin) return;

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
  }, [isAdmin]);

  // Real-time listener for all users when user is an admin
  useEffect(() => {
    if (!isAdmin) return;

    try {
      const usersCol = collection(db, 'users');
      const unsub = onSnapshot(usersCol, (snapshot) => {
        const uList: UserProfile[] = [];
        let totalCoins = 0;
        snapshot.forEach(docSnap => {
          const d = docSnap.data() as UserProfile;
          uList.push(d);
          totalCoins += (d.coinsBalance || 0);
        });
        setAllUsers(uList);
        setAdminStats(prev => ({ ...prev, totalUsers: uList.length, totalCoins: Math.max(totalCoins, user?.coinsBalance || 50000) }));
      }, (err) => {
        console.warn('Admin users listener notice:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Failed to attach admin users listener:', e);
    }
  }, [isAdmin]);

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
  // Admin status is determined by custom claims via useIsAdmin hook.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setAuthLoading(false);

      // Clear any previous user state to avoid stale sessions
      setUser(null);

      if (fbUser) {
        // Log user info for debugging
        console.log('🔐 User logged in:', {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
        });
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            // isAdmin comes from custom claims, not from email matching
            // The useIsAdmin hook handles the authoritative check
            setUser({
              ...data,
              isAdmin: false, // Will be corrected by useIsAdmin hook based on custom claims
            });
            if (data.language) setSelectedLanguage(data.language);
            if (data.currency) setSelectedCurrency(data.currency);
          } else {
            // New user - profile fields to be server-initialized with wallet fields
            const profileFields = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'Paisa Poller',
              photoURL: fbUser.photoURL || '',
              country: selectedCurrency === 'INR' ? 'IN' : 'US',
              currency: selectedCurrency,
              language: selectedLanguage,
              updatedAt: new Date().toISOString(),
            };

            try {
              await setDoc(userDocRef, profileFields);
            } catch (setErr) {
              console.warn('Profile write notice (handled):', setErr);
            }

            // Local display state - coinsBalance, lifetimeEarnings, streakDays should be
            // set by server/cloud functions, not client-side
            setUser({
              ...profileFields,
              coinsBalance: 0,
              lifetimeEarnings: 0,
              streakDays: 0,
              lastCheckInDate: '',
              referralCode: placeholderReferralCode(),
              isAdmin: false,
            } as UserProfile);
          }
        } catch (err) {
          console.warn('Firestore user fetch/create notice:', err);
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'Paisa Poller',
            photoURL: fbUser.photoURL || '',
            country: selectedCurrency === 'INR' ? 'IN' : 'US',
            currency: selectedCurrency,
            language: selectedLanguage,
            coinsBalance: 0,
            lifetimeEarnings: 0,
            streakDays: 0,
            lastCheckInDate: '',
            referralCode: placeholderReferralCode(),
            isAdmin: false,
          } as UserProfile);
        }
      } else {
        // User signed out - clear all state
        setUser(null);
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

    try {
      // Get verification token from server (required for production security)
      const tokenResult = await requestSurveyVerificationFn({ surveyId });
      const tokenData = tokenResult.data as { success?: boolean; token?: string } | null;
      const verificationToken = tokenData?.success ? tokenData.token : null;

      const result = await completeSurveyFn({
        surveyId,
        answers: _answers,
        verificationToken
      });

      const data = result.data as { success: boolean; reward: number; newBalance: number; newLifetime: number };

      if (!data.success) return false;

      const reward = data.reward;

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
    const tz = getUserTimezone();
    const today = getTodayString(tz);
    if (user?.lastCheckInDate === today) return false;

    try {
      const result = await claimDailyCheckInFn({ timezone: tz });
      const data = result.data as {
        success: boolean;
        bonus: number;
        newBalance: number;
        newLifetime: number;
        streak: number;
        lastCheckInDate?: string;
        timezone?: string;
      };

      if (!data.success) return false;

      const newStreak = data.streak;
      const bonus = data.bonus;
      const confirmedDate = data.lastCheckInDate || today;

      setUser(prev => (prev ? {
        ...prev,
        coinsBalance: data.newBalance,
        lifetimeEarnings: data.newLifetime,
        streakDays: newStreak,
        lastCheckInDate: confirmedDate,
        timezone: data.timezone || tz,
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

  const claimScratchCard = async (): Promise<{ success: boolean; coins: number }> => {
    const tz = getUserTimezone();
    const today = getTodayString(tz);

    try {
      const result = await claimScratchCardFn({ timezone: tz });
      const data = result.data as {
        success: boolean;
        coins: number;
        newBalance: number;
        newLifetime: number;
        claimedDate?: string;
        timezone?: string;
      };

      if (!data.success) {
        showToast('Failed to claim scratch card', 0, 'error');
        return { success: false, coins: 0 };
      }

      // Server determines the reward
      const awardedCoins = data.coins;
      const dateUsed = data.claimedDate || today;

      localStorage.setItem('paisabhar_last_scratch', dateUsed);
      setScratchCardAvailable(false);

      setUser(prev => (prev ? {
        ...prev,
        coinsBalance: data.newBalance,
        lifetimeEarnings: data.newLifetime,
        timezone: data.timezone || tz,
        updatedAt: new Date().toISOString(),
      } : prev));

      playCoinSound();
      triggerConfetti();
      showToast(`Scratch card! +${awardedCoins} Coins`, awardedCoins, 'success');

      return { success: true, coins: awardedCoins };
    } catch (error: any) {
      console.error('Scratch card error:', error);
      const message = error.message || 'Failed to claim scratch card';
      showToast(message, 0, 'error');
      return { success: false, coins: 0 };
    }
  };

  const requestRedemption = async (
    payoutMethod: string,
    amountCurrency: number,
    coinsSpent: number,
    accountDetails: string
  ): Promise<{ success: boolean; message?: string }> => {
    // Client-side UX check only. The server performs authoritative validation
    // via a Firestore transaction that atomically checks balance and deducts coins.
    const currentBalance = user?.coinsBalance ?? 0;
    if (!user || currentBalance < coinsSpent) {
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

      // Update local state from server response (authoritative balance)
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
      // Server-side transaction handles all validation atomically
      // No fallback - let the error propagate to the UI for user feedback
      console.error('Redemption request failed:', error);
      return {
        success: false,
        message: error.message || 'Failed to process redemption. Please try again.'
      };
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

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    setGoogleAuthLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      showToast(`Welcome, ${res.user.displayName || res.user.email || 'Friend'}!`, undefined, 'success');
      return { success: true };
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      const code = error?.code || '';
      let userMsg = error?.message || 'Google Sign-In failed';

      if (code === 'auth/popup-blocked') {
        userMsg = 'Google Sign-In pop-up was blocked by your browser. Please allow pop-ups for this site or open the app in a new tab.';
      } else if (code === 'auth/unauthorized-domain') {
        userMsg = `Domain (${window.location.hostname}) is not authorized in Firebase Auth. Add it to Authorized Domains in Firebase Console > Authentication > Settings.`;
      } else if (code === 'auth/operation-not-allowed') {
        userMsg = 'Google Sign-In is disabled in your Firebase project. Please enable Google under Authentication > Sign-in method in Firebase Console.';
      } else if (code === 'auth/popup-closed-by-user') {
        userMsg = 'Sign-in cancelled: The Google popup window was closed.';
      } else if (code === 'auth/cancelled-popup-request') {
        userMsg = 'Another sign-in window is already open. Please complete or close it.';
      } else if (code === 'auth/network-request-failed') {
        userMsg = 'Network error during Google Sign-In. Please check your connection.';
      }

      showToast(userMsg, undefined, 'error');
      return { success: false, error: userMsg, errorCode: code };
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
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
        googleAuthLoading,
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