import * as functions from "firebase-functions";
/**
 * Provider callback handling.
 *
 * Flow for every S2S postback:
 *   1. Cint, AdGem, BitLabs, Affiliate: POST only. Provider is taken from the URL path, never from the body.
 *      TheoremReach: GET only for reward callbacks (/theoremreach), POST only for event webhooks (/theoremreach-event or theoremreachEventWebhook).
 *   2. Signature is verified with a provider-specific rule. Missing secret = reject.
 *   3. Payload fields are validated and coin amounts are range-checked. No defaults.
 *   4. The credit is written in one Firestore transaction keyed by provider + transaction id,
 *      so a retried callback can never credit twice.
 */
export type LegacyProviderName = "cint" | "adgem" | "bitlabs" | "affiliate";
export type ProviderName = LegacyProviderName | "theoremreach";
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
    status: "credited" | "duplicate" | "ignored" | "invalid_signature" | "invalid_payload" | "user_not_found" | "banned" | "invalid_session" | "session_user_mismatch" | "error";
    message: string;
    transactionId?: string;
    userId?: string;
    coinsAwarded?: number;
    newBalance?: number;
}
export declare function verifyProviderSignature(provider: LegacyProviderName, payload: Record<string, unknown>): boolean;
export declare function executeCallback(input: ProviderCallbackInput): Promise<ProviderCallbackResult>;
type OnRequestHandler = Parameters<typeof functions.https.onRequest>[0];
type HttpRequest = Parameters<OnRequestHandler>[0];
type HttpResponse = Parameters<OnRequestHandler>[1];
export declare function handleTheoremReachEventHttp(req: HttpRequest, res: HttpResponse, allowedFunctionNames?: readonly string[]): Promise<void>;
/**
 * Provider S2S postback endpoint.
 * Deploy URL: .../providerPostback/<provider>   (cint | adgem | bitlabs | affiliate | theoremreach | theoremreach-event)
 * Existing providers remain POST-only; TheoremReach reward callbacks accept GET only and events require POST.
 */
export declare const providerPostback: functions.https.HttpsFunction;
/**
 * Dedicated TheoremReach Event Webhook endpoint (reversal / ban events).
 */
export declare const theoremreachEventWebhook: functions.https.HttpsFunction;
/**
 * Admin-only manual credit. Provider traffic must not use this; it goes through providerPostback.
 */
export declare const processProviderCallback: functions.https.CallableFunction<any, Promise<ProviderCallbackResult>, unknown>;
export {};
//# sourceMappingURL=providerCallbacks.d.ts.map