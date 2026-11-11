import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app } from '../firebase/config';

const functions = getFunctions(app, 'us-central1');

if (import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

export const claimDailyCheckInFn = httpsCallable(functions, 'claimDailyCheckIn');
export const votePollFn = httpsCallable(functions, 'votePoll');
export const completeSurveyFn = httpsCallable(functions, 'completeSurvey');
export const claimScratchCardFn = httpsCallable(functions, 'claimScratchCard');
export const requestRedemptionFn = httpsCallable(functions, 'requestRedemption');
export const applyReferralCodeFn = httpsCallable(functions, 'applyReferralCode');
export const awardCoinsFn = httpsCallable(functions, 'awardCoins');
// NEW: Request survey verification token for secure survey completion flow
export const requestSurveyVerificationFn = httpsCallable(functions, 'requestSurveyVerification');
export const reviewRedemptionFn = httpsCallable<{ redemptionId: string; status: 'completed' | 'rejected' }, { success: boolean; message: string; refunded?: boolean }>(functions, 'reviewRedemption');