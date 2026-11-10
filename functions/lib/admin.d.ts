import * as functions from "firebase-functions";
interface AwardCoinsResult {
    success: boolean;
    newBalance: number;
    newLifetime: number;
}
export declare const awardCoins: functions.https.CallableFunction<any, Promise<AwardCoinsResult>, unknown>;
export {};
//# sourceMappingURL=admin.d.ts.map