import * as functions from "firebase-functions";
export declare const THEOREMREACH_APP_ID = "25991";
export declare const THEOREMREACH_EXCHANGE_RATE = 1000;
export declare const THEOREMREACH_CURRENCY_SINGULAR = "coin";
export declare const THEOREMREACH_CURRENCY_PLURAL = "coins";
export declare const THEOREMREACH_ENTRY_BASE_URL = "https://theoremreach.com/respondent_entry/direct";
export declare const THEOREMREACH_PARTNER_ID_SECRET: import("firebase-functions/lib/params/types").SecretParam;
export declare const theoremreachApiKeySecret: import("firebase-functions/lib/params/types").SecretParam;
export declare const theoremreachSecretKey: import("firebase-functions/lib/params/types").SecretParam;
export declare function getTheoremReachApiKey(): string;
export declare function getTheoremReachSecret(): string;
/**
 * Returns the validated TheoremReach placement/partner ID.
 * Fails closed (empty) when the secret is unset, malformed, or whitespace-only.
 */
export declare function getTheoremReachPartnerId(): string;
/**
 * external_id is the authenticated user's stable, opaque Paisa-Bharo account
 * identifier (the Firebase UID). It is generated per user, never configured as
 * one global secret, and never falls back to transaction_id.
 */
export declare function resolveTheoremReachExternalId(uid: string): string;
export declare function isSafeFirestoreId(value: string, minLen?: number, maxLen?: number): boolean;
/**
 * Computes TheoremReach's documented URL signature:
 *   base64url( HMAC-SHA1(secretKey, urlWithoutHash) )
 * Substitutions: '+' -> '-', '/' -> '_', '=' -> ''
 */
export declare function signTheoremReachUrl(urlWithoutHash: string, secretKey: string): string;
export declare function safeEqualString(received: string, expected: string): boolean;
export interface BuildTheoremReachEntryUrlParams {
    apiKey: string;
    secretKey: string;
    userId: string;
    transactionId: string;
    partnerId?: string;
    externalId: string;
    extraParams?: Record<string, string | number | undefined>;
}
/**
 * Builds and signs a TheoremReach respondent_entry/direct URL on the server.
 *
 * Parameter order matches the official TheoremReach offerwall documentation exactly:
 *   api_key, user_id, transaction_id, currency_name_plural, currency_name_singular,
 *   exchange_rate, external_id, partner_id, hash
 *
 * The HMAC-SHA1 hash covers the complete URL up to (but not including) the `hash=`
 * parameter, so every preceding query parameter — including the new required ones —
 * is part of the signed string.
 */
export declare function buildSignedTheoremReachEntryUrl(params: BuildTheoremReachEntryUrlParams): string;
/**
 * Verifies a full TheoremReach callback or webhook URL containing a trailing `hash` query param.
 * TheoremReach computes HMAC-SHA1 over the full URL called up to `&hash=` (or `?hash=`).
 * Fails closed if `hash` is missing, duplicated, or followed by additional query parameters.
 */
export declare function verifyTheoremReachUrlSignature(fullUrl: string, secretKey: string): boolean;
export interface RequestLike {
    headers: Record<string, string | string[] | undefined>;
    protocol?: string;
    originalUrl?: string;
    url?: string;
    get?: (name: string) => string | undefined;
}
/**
 * Reconstructs candidate full URLs from an Express/Cloud Functions request, scoped strictly
 * to the expected Cloud Function endpoint(s) and trusted host/base URL configuration.
 * Never blindly trusts arbitrary forwarded host headers.
 */
export declare function reconstructTheoremReachCandidateUrls(req: RequestLike, functionNames: readonly string[]): string[];
export declare function verifyTheoremReachIncomingUrl(req: RequestLike, secretKey: string, functionNames: readonly string[]): boolean;
export type ParsedTheoremReachReward = {
    kind: "credit";
    transactionId: string;
    userId: string;
    coinsAwarded: number;
    metadata: Record<string, string | number>;
} | {
    kind: "reversal";
    transactionId: string;
    userId: string;
    debitCoins: number;
    metadata: Record<string, string | number>;
} | {
    kind: "ignored";
    reason: string;
} | {
    kind: "invalid";
    error: string;
};
/**
 * Parses a documented TheoremReach S2S reward callback payload (query parameters only).
 */
export declare function parseTheoremReachRewardPayload(p: Record<string, unknown>): ParsedTheoremReachReward;
export interface TheoremReachReversedTx {
    transactionId: string;
    debitCoins: number;
    amountInDollars: string;
    amountInCurrency: string;
}
export type ParsedTheoremReachEvent = {
    kind: "reversal";
    encSalt: string;
    userId: string;
    at: string;
    apiKey: string | null;
    externalTransactionId: string;
    reversedTransactions: TheoremReachReversedTx[];
} | {
    kind: "ban";
    encSalt: string;
    userId: string;
    at: string;
    apiKey: string | null;
    externalTransactionId: string;
    banReason: string;
} | {
    kind: "invalid";
    error: string;
};
/**
 * Parses a documented TheoremReach Event Webhook payload (`reversal` or `ban`).
 * Ref: https://theoremreach.com/docs/reporting#webhooks
 */
export declare function parseTheoremReachEventPayload(query: Record<string, unknown>, body: unknown): ParsedTheoremReachEvent;
export interface TheoremReachEventResult {
    success: boolean;
    status: "processed" | "duplicate" | "user_not_found" | "original_tx_not_found" | "user_mismatch" | "invalid_session" | "error";
    message: string;
    eventType: "reversal" | "ban";
    encSalt: string;
    userId: string;
    coinsDeducted?: number;
    newBalance?: number;
}
/**
 * Atomically executes a verified TheoremReach reversal event.
 * - Deduplicates within the batch as well as by `enc_salt` and `theoremreach_reversal_<txId>`.
 * - Verifies each reversed `transaction_id` matches an existing original credit transaction
 *   owned by the same user and not yet fully reversed.
 * - Validates `externalTransactionId` against `theoremreach_sessions` whenever provided.
 * - Clamps balance at 0 so reversals never produce a negative balance.
 */
export declare function executeTheoremReachReversalEvent(params: {
    encSalt: string;
    userId: string;
    at: string;
    externalTransactionId: string;
    reversedTransactions: TheoremReachReversedTx[];
}): Promise<TheoremReachEventResult>;
/**
 * Records a verified TheoremReach provider ban on the user document WITHOUT
 * suspending the overall Paisa-Bharo user account.
 */
export declare function executeTheoremReachBanEvent(params: {
    encSalt: string;
    userId: string;
    at: string;
    externalTransactionId: string;
    banReason: string;
}): Promise<TheoremReachEventResult>;
export interface TheoremReachLaunchSessionResult {
    launchUrl: string;
    transactionId: string;
    appId: string;
    currency: string;
    exchangeRate: number;
}
/**
 * Generates, persists, and returns a signed TheoremReach launch session for `uid`.
 */
export declare function createTheoremReachLaunchSession(uid: string): Promise<TheoremReachLaunchSessionResult>;
/**
 * Server-side callable returning a signed TheoremReach survey launch URL for the
 * authenticated Firebase user. Never exposes THEOREMREACH_SECRET to the client.
 */
export declare const getTheoremReachLaunchUrl: functions.https.CallableFunction<any, Promise<TheoremReachLaunchSessionResult>, unknown>;
//# sourceMappingURL=theoremreach.d.ts.map