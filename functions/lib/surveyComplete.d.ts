import * as functions from "firebase-functions";
/**
 * HTTPS callable to request survey completion verification token.
 * Only available in dev mode or when called through an authenticated flow.
 */
export declare const requestSurveyVerification: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    token: string;
    expiresAt: number;
}>, unknown>;
/**
 * Complete survey - awards coins after verification.
 *
 * SECURITY: In production mode, this function requires a valid verification token
 * obtained from requestSurveyVerification. This prevents direct client calls with
 * arbitrary coin amounts.
 *
 * For development/testing (DEV_MODE=true), token verification is bypassed.
 */
export declare const completeSurvey: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    reward: any;
    newBalance: any;
    newLifetime: any;
}>, unknown>;
//# sourceMappingURL=surveyComplete.d.ts.map