import * as functions from "firebase-functions";
export declare const claimDailyCheckIn: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    bonus: number;
    newBalance: any;
    newLifetime: any;
    streak: any;
}>, unknown>;
//# sourceMappingURL=dailyCheckin.d.ts.map