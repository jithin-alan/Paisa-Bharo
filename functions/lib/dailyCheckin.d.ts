import * as functions from "firebase-functions";
export declare const claimDailyCheckIn: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    bonus: number;
    newBalance: any;
    newLifetime: any;
    streak: number;
    cycleDay: number;
    lastCheckInDate: string;
    timezone: string;
}>, unknown>;
//# sourceMappingURL=dailyCheckin.d.ts.map