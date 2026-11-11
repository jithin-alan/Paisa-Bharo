import * as functions from "firebase-functions";
export declare const applyReferralCode: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    message: string;
    newBalance: any;
    newLifetime: any;
    fraudScore: number;
    status: string;
    qualifyingRequired: boolean;
}>, unknown>;
//# sourceMappingURL=referral.d.ts.map