import * as functions from "firebase-functions";
export declare const claimScratchCard: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    coins: number;
    newBalance: any;
    newLifetime: any;
    claimedDate: string;
    timezone: string;
}>, unknown>;
//# sourceMappingURL=scratchCard.d.ts.map