import * as functions from "firebase-functions";

// Import all function modules
import { claimDailyCheckIn } from "./dailyCheckin";
import { votePoll } from "./pollVote";
import { completeSurvey, requestSurveyVerification } from "./surveyComplete";
import { claimScratchCard } from "./scratchCard";
import { requestRedemption, reviewRedemption } from "./redemption";
import { applyReferralCode } from "./referral";
import { awardCoins } from "./admin";
import { processPendingReferralRewards, processReferralReward } from "./processReferralRewards";
import { processProviderCallback, providerPostback } from "./providerCallbacks";

// Export only real Cloud Functions. Signature verifiers are internal helpers and are not exported here.
export {
  claimDailyCheckIn,
  votePoll,
  completeSurvey,
  requestSurveyVerification,
  claimScratchCard,
  requestRedemption,
  reviewRedemption,
  applyReferralCode,
  awardCoins,
  processPendingReferralRewards,
  processReferralReward,
  processProviderCallback,
  providerPostback,
};