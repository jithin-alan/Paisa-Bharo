import * as functions from "firebase-functions";
/**
 * Provider callback handling.
 *
 * Flow for every S2S postback:
 *   1. POST only. Provider is taken from the URL path, never from the body.
 *   2. Signature is verified with a provider-specific rule. Missing secret = reject.
 *   3. Payload fields are validated and coin amounts are range-checked. No defaults.
 *   4. The credit is written in one Firestore transaction keyed by provider + transaction id,
 *      so a retried callback can never credit twice.
 */
export type ProviderName = "cint" | "adgem" | "bitlabs" | "affiliate";
export interface ProviderCallbackInput {
    provider: ProviderName;
    transactionId: string;
    userId: string;
    coinsAwarded: number;
    reason: string;
    metadata: Record<string, string | number>;
}
export interface ProviderCallbackResult {
    success: boolean;
    status: "credited" | "duplicate" | "ignored" | "invalid_signature" | "invalid_payload" | "user_not_found" | "error";
    message: string;
    transactionId?: string;
    userId?: string;
    coinsAwarded?: number;
    newBalance?: number;
}
export declare function verifyProviderSignature(provider: ProviderName, payload: Record<string, unknown>): boolean;
/**
 * Provider S2S postback endpoint.
 * Deploy URL: .../providerPostback/<provider>   (cint | adgem | bitlabs | affiliate)
 * POST only. Anything else gets 405 and no processing.
 */
export declare const providerPostback: functions.https.HttpsFunction;
/**
 * Admin-only manual credit. Provider traffic must not use this; it goes through providerPostback.
 */
export declare const processProviderCallback: functions.https.CallableFunction<any, Promise<ProviderCallbackResult>, unknown>;
//# sourceMappingURL=providerCallbacks.d.ts.map