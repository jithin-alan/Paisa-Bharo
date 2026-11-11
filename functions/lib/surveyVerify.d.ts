import * as functions from "firebase-functions";
/**
 * HTTPS callable to request verification token for survey completion.
 * In dev mode or with proper credentials, returns a time-limited token.
 */
export declare const requestSurveyCompletionToken: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    token: string;
    expiresAt: number;
    surveyId: string;
    rewardCoins: any;
}>, unknown>;
/**
 * HTTP endpoint to verify a survey completion token.
 * Used by the server-side completeSurvey function.
 */
export declare const verifySurveyCompletion: functions.https.HttpsFunction;
//# sourceMappingURL=surveyVerify.d.ts.map