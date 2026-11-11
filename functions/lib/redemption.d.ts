import * as functions from "firebase-functions";
export declare const requestRedemption: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    redemptionId: string;
    newBalance: number;
}>, unknown>;
/**
 * Trusted server-side admin review of redemption requests.
 * Atomically refunds coins to the user when a redemption is rejected.
 */
export declare const reviewRedemption: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    redemptionId: string;
    status: "completed" | "rejected";
    refunded: boolean;
    coinsRefunded: number;
}>, unknown>;
//# sourceMappingURL=redemption.d.ts.map