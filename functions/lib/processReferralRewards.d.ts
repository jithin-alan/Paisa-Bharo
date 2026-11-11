import * as functions from "firebase-functions";
/**
 * Cloud Function triggered periodically to process pending referral rewards
 * Awards bonuses to users who have completed the qualifying period
 */
export declare const processPendingReferralRewards: functions.scheduler.ScheduleFunction;
/**
 * Manual API endpoint to process a specific pending referral reward
 * Useful for admin tools or retry mechanisms
 */
export declare const processReferralReward: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    message: string;
}>, unknown>;
//# sourceMappingURL=processReferralRewards.d.ts.map