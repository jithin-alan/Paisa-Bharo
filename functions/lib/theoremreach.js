"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTheoremReachLaunchUrl = exports.theoremreachSecretKey = exports.theoremreachApiKeySecret = exports.THEOREMREACH_PARTNER_ID_SECRET = exports.THEOREMREACH_ENTRY_BASE_URL = exports.THEOREMREACH_CURRENCY_PLURAL = exports.THEOREMREACH_CURRENCY_SINGULAR = exports.THEOREMREACH_EXCHANGE_RATE = exports.THEOREMREACH_APP_ID = void 0;
exports.getTheoremReachApiKey = getTheoremReachApiKey;
exports.getTheoremReachSecret = getTheoremReachSecret;
exports.getTheoremReachPartnerId = getTheoremReachPartnerId;
exports.resolveTheoremReachExternalId = resolveTheoremReachExternalId;
exports.isSafeFirestoreId = isSafeFirestoreId;
exports.signTheoremReachUrl = signTheoremReachUrl;
exports.safeEqualString = safeEqualString;
exports.buildSignedTheoremReachEntryUrl = buildSignedTheoremReachEntryUrl;
exports.verifyTheoremReachUrlSignature = verifyTheoremReachUrlSignature;
exports.reconstructTheoremReachCandidateUrls = reconstructTheoremReachCandidateUrls;
exports.verifyTheoremReachIncomingUrl = verifyTheoremReachIncomingUrl;
exports.parseTheoremReachRewardPayload = parseTheoremReachRewardPayload;
exports.parseTheoremReachEventPayload = parseTheoremReachEventPayload;
exports.executeTheoremReachReversalEvent = executeTheoremReachReversalEvent;
exports.executeTheoremReachBanEvent = executeTheoremReachBanEvent;
exports.createTheoremReachLaunchSession = createTheoremReachLaunchSession;
const functions = __importStar(require("firebase-functions"));
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const helpers_1 = require("./helpers");
exports.THEOREMREACH_APP_ID = "25991";
exports.THEOREMREACH_EXCHANGE_RATE = 1000; // 1000 coins per $1 USD
exports.THEOREMREACH_CURRENCY_SINGULAR = "coin";
exports.THEOREMREACH_CURRENCY_PLURAL = "coins";
exports.THEOREMREACH_ENTRY_BASE_URL = "https://theoremreach.com/respondent_entry/direct";
// Placement ID from the TheoremReach publisher dashboard. Correlates to Placements.
// Configured via Secret Manager (THEOREMREACH_PARTNER_ID) so it never lands in source.
exports.THEOREMREACH_PARTNER_ID_SECRET = (0, params_1.defineSecret)("THEOREMREACH_PARTNER_ID");
exports.theoremreachApiKeySecret = (0, params_1.defineSecret)("THEOREMREACH_API_KEY");
exports.theoremreachSecretKey = (0, params_1.defineSecret)("THEOREMREACH_SECRET");
function getTheoremReachApiKey() {
    return exports.theoremreachApiKeySecret.value().trim();
}
function getTheoremReachSecret() {
    return exports.theoremreachSecretKey.value().trim();
}
/**
 * Returns the validated TheoremReach placement/partner ID.
 * Fails closed (empty) when the secret is unset, malformed, or whitespace-only.
 */
function getTheoremReachPartnerId() {
    const raw = exports.THEOREMREACH_PARTNER_ID_SECRET.value();
    if (typeof raw !== "string")
        return "";
    // Placement IDs are UUIDs; reject anything with surrounding whitespace, quotes,
    // or characters that would break URL encoding / HMAC coverage.
    if (raw !== raw.trim())
        return "";
    if (raw.length === 0)
        return "";
    if (/[\s"']/.test(raw))
        return "";
    return raw;
}
/**
 * external_id is the authenticated user's stable, opaque Paisa-Bharo account
 * identifier (the Firebase UID). It is generated per user, never configured as
 * one global secret, and never falls back to transaction_id.
 */
function resolveTheoremReachExternalId(uid) {
    if (typeof uid !== "string")
        return "";
    const trimmed = uid.trim();
    if (!isSafeFirestoreId(trimmed) || trimmed === "guest_user")
        return "";
    return trimmed;
}
const MAX_COINS = 10000;
const SAFE_FIRESTORE_ID_REGEX = /^[a-zA-Z0-9_.:-]+$/;
function isSafeFirestoreId(value, minLen = 3, maxLen = 128) {
    if (typeof value !== "string")
        return false;
    if (value.length < minLen || value.length > maxLen)
        return false;
    if (!SAFE_FIRESTORE_ID_REGEX.test(value))
        return false;
    if (value === "." || value === ".." || value.includes(".."))
        return false;
    if (/^__.*__$/.test(value))
        return false;
    return true;
}
function str(value) {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 && trimmed.length <= 200 ? trimmed : null;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    return null;
}
function num(value) {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : null;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
/**
 * Computes TheoremReach's documented URL signature:
 *   base64url( HMAC-SHA1(secretKey, urlWithoutHash) )
 * Substitutions: '+' -> '-', '/' -> '_', '=' -> ''
 */
function signTheoremReachUrl(urlWithoutHash, secretKey) {
    const rawBase64 = (0, crypto_1.createHmac)("sha1", secretKey)
        .update(urlWithoutHash, "utf8")
        .digest("base64");
    return rawBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function safeEqualString(received, expected) {
    const a = Buffer.from(received.trim(), "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && (0, crypto_1.timingSafeEqual)(a, b);
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
function buildSignedTheoremReachEntryUrl(params) {
    const apiKey = params.apiKey.trim();
    const secretKey = params.secretKey;
    const userId = params.userId.trim();
    const transactionId = params.transactionId.trim();
    const partnerId = params.partnerId ? params.partnerId.trim() : "";
    const externalId = resolveTheoremReachExternalId(params.externalId);
    if (!apiKey)
        throw new Error("THEOREMREACH_API_KEY is required");
    if (!secretKey)
        throw new Error("THEOREMREACH_SECRET is required");
    if (!isSafeFirestoreId(userId) || userId === "guest_user") {
        throw new Error("Valid authenticated userId is required");
    }
    if (!isSafeFirestoreId(transactionId)) {
        throw new Error("Valid transactionId is required");
    }
    if (!partnerId) {
        throw new Error("THEOREMREACH_PARTNER_ID is required");
    }
    if (!externalId) {
        throw new Error("Valid externalId is required");
    }
    const queryParts = [
        `api_key=${encodeURIComponent(apiKey)}`,
        `user_id=${encodeURIComponent(userId)}`,
        `transaction_id=${encodeURIComponent(transactionId)}`,
        `currency_name_plural=${encodeURIComponent(exports.THEOREMREACH_CURRENCY_PLURAL)}`,
        `currency_name_singular=${encodeURIComponent(exports.THEOREMREACH_CURRENCY_SINGULAR)}`,
        `exchange_rate=${encodeURIComponent(exports.THEOREMREACH_EXCHANGE_RATE)}`,
        `external_id=${encodeURIComponent(externalId)}`,
        `partner_id=${encodeURIComponent(partnerId)}`,
    ];
    if (params.extraParams) {
        for (const [key, val] of Object.entries(params.extraParams)) {
            if (val !== undefined && key !== "hash") {
                queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
            }
        }
    }
    const urlBeforeHash = `${exports.THEOREMREACH_ENTRY_BASE_URL}?${queryParts.join("&")}`;
    const hash = signTheoremReachUrl(urlBeforeHash, secretKey);
    return `${urlBeforeHash}&hash=${hash}`;
}
/**
 * Verifies a full TheoremReach callback or webhook URL containing a trailing `hash` query param.
 * TheoremReach computes HMAC-SHA1 over the full URL called up to `&hash=` (or `?hash=`).
 * Fails closed if `hash` is missing, duplicated, or followed by additional query parameters.
 */
function verifyTheoremReachUrlSignature(fullUrl, secretKey) {
    if (!fullUrl || !secretKey)
        return false;
    if (fullUrl.includes("#"))
        return false;
    const queryIdx = fullUrl.indexOf("?");
    if (queryIdx < 0)
        return false;
    const queryPart = fullUrl.slice(queryIdx + 1);
    if (!queryPart)
        return false;
    const segments = queryPart.split("&");
    let hashCount = 0;
    for (const seg of segments) {
        if (seg.startsWith("hash="))
            hashCount++;
    }
    if (hashCount !== 1)
        return false;
    // Enforce that `hash=` is strictly the final query parameter (no trailing unsigned params)
    const lastSegment = segments[segments.length - 1];
    if (!lastSegment.startsWith("hash="))
        return false;
    const hashParamIdx = segments.length === 1
        ? fullUrl.lastIndexOf("?hash=")
        : fullUrl.lastIndexOf("&hash=");
    if (hashParamIdx < 0)
        return false;
    const urlBeforeHash = fullUrl.slice(0, hashParamIdx);
    const rawHash = lastSegment.slice(5); // length of "hash="
    if (!rawHash || rawHash.includes("&") || rawHash.includes("?"))
        return false;
    let decodedHash;
    try {
        decodedHash = decodeURIComponent(rawHash).trim();
    }
    catch {
        return false;
    }
    if (!decodedHash)
        return false;
    const expectedHash = signTheoremReachUrl(urlBeforeHash, secretKey);
    return safeEqualString(decodedHash, expectedHash);
}
function getConfiguredProjectId() {
    const fromEnv = process.env.GCLOUD_PROJECT?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim();
    if (fromEnv)
        return fromEnv;
    if (process.env.FIREBASE_CONFIG) {
        try {
            const parsed = JSON.parse(process.env.FIREBASE_CONFIG);
            if (parsed.projectId)
                return parsed.projectId;
        }
        catch {
            // ignore malformed FIREBASE_CONFIG
        }
    }
    return "paisa-bharo-app";
}
function isLocalHost(host) {
    return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
}
function isTrustedCallbackHost(host, allowedFunctionNames) {
    if (!host || /[\s/\\@?#]/.test(host))
        return false;
    const extraAllowed = (process.env.THEOREMREACH_ALLOWED_HOSTS || "")
        .split(",")
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean);
    const lower = host.toLowerCase();
    if (extraAllowed.includes(lower))
        return true;
    if (isLocalHost(host))
        return true;
    const projectId = getConfiguredProjectId().toLowerCase();
    const canonicalCfHost = `us-central1-${projectId}.cloudfunctions.net`;
    if (lower === canonicalCfHost)
        return true;
    // Cloud Run v2 URLs take the form `<service-lowercase>-<hash>-<region>.a.run.app`
    const lowerFnPrefixes = allowedFunctionNames.map((fn) => fn.toLowerCase());
    if (lower.endsWith(".a.run.app")) {
        return lowerFnPrefixes.some((prefix) => lower.startsWith(`${prefix}-`));
    }
    return false;
}
/**
 * Reconstructs candidate full URLs from an Express/Cloud Functions request, scoped strictly
 * to the expected Cloud Function endpoint(s) and trusted host/base URL configuration.
 * Never blindly trusts arbitrary forwarded host headers.
 */
function reconstructTheoremReachCandidateUrls(req, functionNames) {
    const candidates = [];
    if (!functionNames || functionNames.length === 0)
        return candidates;
    const rawPathAndQuery = req.originalUrl || req.url || "";
    if (!rawPathAndQuery || !rawPathAndQuery.startsWith("/") || rawPathAndQuery.startsWith("//")) {
        return candidates;
    }
    const canonicalBase = process.env.THEOREMREACH_CALLBACK_BASE_URL?.trim().replace(/\/+$/, "");
    if (canonicalBase) {
        let validBase = false;
        try {
            const parsed = new URL(canonicalBase);
            validBase = parsed.protocol === "https:" || isLocalHost(parsed.host);
        }
        catch {
            validBase = false;
        }
        if (!validBase)
            return candidates;
        const baseHasAllowedFnPrefix = functionNames.some((fnName) => canonicalBase.endsWith(`/${fnName}`) || canonicalBase.includes(`/${fnName}/`));
        const pathHasAllowedFnPrefix = functionNames.some((fnName) => rawPathAndQuery.startsWith(`/${fnName}/`) ||
            rawPathAndQuery.startsWith(`/${fnName}?`) ||
            rawPathAndQuery === `/${fnName}`);
        if (baseHasAllowedFnPrefix || pathHasAllowedFnPrefix) {
            candidates.push(`${canonicalBase}${rawPathAndQuery}`);
        }
        if (!baseHasAllowedFnPrefix) {
            for (const fnName of functionNames) {
                const prefix = `/${fnName}`;
                if (!rawPathAndQuery.startsWith(`${prefix}/`) && !rawPathAndQuery.startsWith(`${prefix}?`) && rawPathAndQuery !== prefix) {
                    candidates.push(`${canonicalBase}${prefix}${rawPathAndQuery}`);
                    if (rawPathAndQuery.startsWith("/?")) {
                        candidates.push(`${canonicalBase}${prefix}${rawPathAndQuery.slice(1)}`);
                    }
                }
            }
        }
        return Array.from(new Set(candidates));
    }
    const directHostHeader = req.get?.("host") ?? req.headers["host"];
    const directHostRaw = Array.isArray(directHostHeader) ? directHostHeader[0] : directHostHeader;
    const forwardedHostHeader = req.headers["x-forwarded-host"];
    const forwardedHostRaw = Array.isArray(forwardedHostHeader) ? forwardedHostHeader[0] : forwardedHostHeader;
    const candidateHost = (directHostRaw?.split(",")[0]?.trim() ||
        forwardedHostRaw?.split(",")[0]?.trim() ||
        "");
    if (!candidateHost || !isTrustedCallbackHost(candidateHost, functionNames)) {
        return candidates;
    }
    const proto = isLocalHost(candidateHost) && req.protocol === "http" ? "http" : "https";
    const pathHasAllowedFnPrefix = functionNames.some((fnName) => rawPathAndQuery.startsWith(`/${fnName}/`) ||
        rawPathAndQuery.startsWith(`/${fnName}?`) ||
        rawPathAndQuery === `/${fnName}`);
    if (candidateHost.toLowerCase().endsWith(".cloudfunctions.net")) {
        if (pathHasAllowedFnPrefix) {
            candidates.push(`${proto}://${candidateHost}${rawPathAndQuery}`);
        }
        else {
            for (const fnName of functionNames) {
                const prefix = `/${fnName}`;
                candidates.push(`${proto}://${candidateHost}${prefix}${rawPathAndQuery}`);
                if (rawPathAndQuery.startsWith("/?")) {
                    candidates.push(`${proto}://${candidateHost}${prefix}${rawPathAndQuery.slice(1)}`);
                }
            }
        }
    }
    else {
        candidates.push(`${proto}://${candidateHost}${rawPathAndQuery}`);
    }
    return Array.from(new Set(candidates));
}
function verifyTheoremReachIncomingUrl(req, secretKey, functionNames) {
    if (!secretKey || !functionNames || functionNames.length === 0)
        return false;
    const candidates = reconstructTheoremReachCandidateUrls(req, functionNames);
    return candidates.some((candidate) => verifyTheoremReachUrlSignature(candidate, secretKey));
}
/**
 * Parses a documented TheoremReach S2S reward callback payload (query parameters only).
 */
function parseTheoremReachRewardPayload(p) {
    const invalid = (error) => ({ kind: "invalid", error });
    for (const [key, val] of Object.entries(p)) {
        if (Array.isArray(val)) {
            return invalid(`Duplicate query parameter not allowed: ${key}`);
        }
    }
    if (p.debug === true || str(p.debug)?.toLowerCase() === "true") {
        return { kind: "ignored", reason: "TheoremReach debug callback ignored (no coins credited)." };
    }
    const userId = str(p.user_id);
    const transactionId = str(p.tx_id || p.transaction_id);
    if (!userId || !transactionId) {
        return invalid("Missing required TheoremReach field: user_id or tx_id");
    }
    if (!isSafeFirestoreId(userId) || userId === "guest_user" || !isSafeFirestoreId(transactionId)) {
        return invalid("Invalid user_id or tx_id");
    }
    const externalTransactionId = str(p.external_transaction_id) ?? "";
    if (externalTransactionId && !isSafeFirestoreId(externalTransactionId)) {
        return invalid("Invalid external_transaction_id");
    }
    const isReversal = p.reversal === true || str(p.reversal)?.toLowerCase() === "true";
    const rawReward = num(p.reward);
    const rawUsd = num(p.reward_amount_in_dollars ?? p.currency);
    let coins = null;
    if (rawReward !== null) {
        coins = rawReward;
    }
    else if (rawUsd !== null) {
        coins = Math.round(rawUsd * exports.THEOREMREACH_EXCHANGE_RATE);
    }
    const metadata = {
        appId: exports.THEOREMREACH_APP_ID,
        txId: transactionId,
        externalTransactionId,
        offer: str(p.offer) ?? "",
        offerId: str(p.offer_id) ?? "",
        offerName: str(p.offer_name) ?? "",
        eventId: str(p.event_id) ?? "",
        eventName: str(p.event_name) ?? "",
        rewardAmountInDollars: str(p.reward_amount_in_dollars ?? p.currency) ?? "",
    };
    if (isReversal || (coins !== null && coins < 0)) {
        if (coins === null)
            return invalid("Invalid reversal amount");
        const debitCoins = Math.abs(Math.round(coins));
        if (!Number.isInteger(debitCoins) || debitCoins < 1 || debitCoins > MAX_COINS) {
            return invalid(`Invalid reversal coin amount: must be between 1 and ${MAX_COINS}`);
        }
        return {
            kind: "reversal",
            transactionId,
            userId,
            debitCoins,
            metadata,
        };
    }
    if (coins === null || !Number.isInteger(coins) || coins < 1 || coins > MAX_COINS) {
        return invalid(`Invalid reward: must be an integer from 1 to ${MAX_COINS}`);
    }
    return {
        kind: "credit",
        transactionId,
        userId,
        coinsAwarded: coins,
        metadata,
    };
}
/**
 * Parses a documented TheoremReach Event Webhook payload (`reversal` or `ban`).
 * Ref: https://theoremreach.com/docs/reporting#webhooks
 */
function parseTheoremReachEventPayload(query, body) {
    const invalid = (error) => ({ kind: "invalid", error });
    for (const [key, val] of Object.entries(query)) {
        if (Array.isArray(val)) {
            return invalid(`Duplicate query parameter not allowed: ${key}`);
        }
    }
    const encSalt = str(query.enc_salt);
    if (!encSalt || !isSafeFirestoreId(encSalt)) {
        return invalid("Missing or invalid enc_salt query parameter");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return invalid("Invalid webhook body");
    }
    const root = body;
    const data = root.data && typeof root.data === "object" && !Array.isArray(root.data)
        ? root.data
        : root;
    const eventType = str(data.event_type);
    const userId = str(data.user_id);
    const at = str(data.at) ?? "";
    const apiKey = str(data.api_key);
    const externalTransactionId = str(data.external_transaction_id) ?? "";
    if (!eventType || !userId || !isSafeFirestoreId(userId) || userId === "guest_user") {
        return invalid("Missing or invalid event_type or user_id");
    }
    if (externalTransactionId && !isSafeFirestoreId(externalTransactionId)) {
        return invalid("Invalid external_transaction_id");
    }
    if (eventType === "ban") {
        const banReason = str(data.ban_reason) ?? "unspecified";
        return {
            kind: "ban",
            encSalt,
            userId,
            at,
            apiKey,
            externalTransactionId,
            banReason,
        };
    }
    if (eventType === "reversal") {
        const rawList = data.reversed_transactions;
        if (!Array.isArray(rawList) || rawList.length === 0) {
            return invalid("Missing reversed_transactions array");
        }
        const seenTxIds = new Set();
        const reversedTransactions = [];
        for (const item of rawList) {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
                return invalid("Invalid item in reversed_transactions");
            }
            const entry = item;
            const transactionId = str(entry.transaction_id);
            if (!transactionId || !isSafeFirestoreId(transactionId)) {
                return invalid("Invalid reversed_transactions[].transaction_id");
            }
            if (seenTxIds.has(transactionId)) {
                continue; // Deduplicate duplicate transaction IDs within the same webhook array
            }
            seenTxIds.add(transactionId);
            const currencyAmount = num(entry.amount_in_currency);
            const dollarAmount = num(entry.amount_in_dollars);
            let debitCoins;
            if (currencyAmount !== null) {
                debitCoins = Math.round(Math.abs(currencyAmount));
            }
            else if (dollarAmount !== null) {
                debitCoins = Math.round(Math.abs(dollarAmount) * exports.THEOREMREACH_EXCHANGE_RATE);
            }
            else {
                return invalid("Missing amount_in_currency or amount_in_dollars in reversed_transactions");
            }
            if (!Number.isInteger(debitCoins) || debitCoins < 1 || debitCoins > MAX_COINS) {
                return invalid(`Invalid reversal amount for transaction ${transactionId}`);
            }
            reversedTransactions.push({
                transactionId,
                debitCoins,
                amountInDollars: str(entry.amount_in_dollars) ?? "",
                amountInCurrency: str(entry.amount_in_currency) ?? "",
            });
        }
        return {
            kind: "reversal",
            encSalt,
            userId,
            at,
            apiKey,
            externalTransactionId,
            reversedTransactions,
        };
    }
    return invalid(`Unsupported TheoremReach event_type: ${eventType}`);
}
/**
 * Atomically executes a verified TheoremReach reversal event.
 * - Deduplicates within the batch as well as by `enc_salt` and `theoremreach_reversal_<txId>`.
 * - Verifies each reversed `transaction_id` matches an existing original credit transaction
 *   owned by the same user and not yet fully reversed.
 * - Validates `externalTransactionId` against `theoremreach_sessions` whenever provided.
 * - Clamps balance at 0 so reversals never produce a negative balance.
 */
async function executeTheoremReachReversalEvent(params) {
    const { encSalt, userId, at, externalTransactionId, reversedTransactions } = params;
    if (!isSafeFirestoreId(encSalt) || !isSafeFirestoreId(userId) || userId === "guest_user") {
        return {
            success: false,
            status: "error",
            message: "Invalid encSalt or userId.",
            eventType: "reversal",
            encSalt,
            userId,
            coinsDeducted: 0,
        };
    }
    if (externalTransactionId && !isSafeFirestoreId(externalTransactionId)) {
        return {
            success: false,
            status: "invalid_session",
            message: "Invalid externalTransactionId.",
            eventType: "reversal",
            encSalt,
            userId,
            coinsDeducted: 0,
        };
    }
    // Deduplicate transaction IDs within the incoming array before any reads
    const seenTxIds = new Set();
    const uniqueReversedTransactions = [];
    for (const tx of reversedTransactions) {
        if (!isSafeFirestoreId(tx.transactionId)) {
            return {
                success: false,
                status: "error",
                message: `Invalid reversed transactionId: ${tx.transactionId}`,
                eventType: "reversal",
                encSalt,
                userId,
                coinsDeducted: 0,
            };
        }
        if (!seenTxIds.has(tx.transactionId)) {
            seenTxIds.add(tx.transactionId);
            uniqueReversedTransactions.push(tx);
        }
    }
    const eventRef = helpers_1.db.collection("provider_events").doc(`theoremreach_${encSalt}`);
    const userRef = (0, helpers_1.getUserRef)(userId);
    const sessionRef = externalTransactionId
        ? helpers_1.db.collection("theoremreach_sessions").doc(externalTransactionId)
        : null;
    try {
        return await helpers_1.db.runTransaction(async (transaction) => {
            const existingEvent = await transaction.get(eventRef);
            if (existingEvent.exists) {
                return {
                    success: true,
                    status: "duplicate",
                    message: `TheoremReach event ${encSalt} was already processed.`,
                    eventType: "reversal",
                    encSalt,
                    userId,
                    coinsDeducted: 0,
                };
            }
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                return {
                    success: false,
                    status: "user_not_found",
                    message: `User ${userId} not found.`,
                    eventType: "reversal",
                    encSalt,
                    userId,
                    coinsDeducted: 0,
                };
            }
            if (sessionRef) {
                const sessionDoc = await transaction.get(sessionRef);
                if (!sessionDoc.exists || sessionDoc.data()?.userId !== userId) {
                    return {
                        success: false,
                        status: "invalid_session",
                        message: `TheoremReach session ${externalTransactionId} is invalid or belongs to a different user.`,
                        eventType: "reversal",
                        encSalt,
                        userId,
                        coinsDeducted: 0,
                    };
                }
            }
            // Check existing reversal records and original credit records up front (all reads before writes)
            const txPairs = uniqueReversedTransactions.map((tx) => ({
                tx,
                reversalRef: helpers_1.db.collection("provider_transactions").doc(`theoremreach_reversal_${tx.transactionId}`),
                originalCreditRef: helpers_1.db.collection("provider_transactions").doc(`theoremreach_${tx.transactionId}`),
            }));
            const [reversalSnaps, originalCreditSnaps] = await Promise.all([
                Promise.all(txPairs.map((p) => transaction.get(p.reversalRef))),
                Promise.all(txPairs.map((p) => transaction.get(p.originalCreditRef))),
            ]);
            // Validate original credit existence, user ownership, and reversal state before any write
            for (let i = 0; i < txPairs.length; i++) {
                const { tx } = txPairs[i];
                const originalSnap = originalCreditSnaps[i];
                if (!originalSnap.exists) {
                    return {
                        success: false,
                        status: "original_tx_not_found",
                        message: `Original TheoremReach credit transaction ${tx.transactionId} not found.`,
                        eventType: "reversal",
                        encSalt,
                        userId,
                        coinsDeducted: 0,
                    };
                }
                const originalData = originalSnap.data();
                if (originalData.provider !== "theoremreach" || originalData.userId !== userId) {
                    return {
                        success: false,
                        status: "user_mismatch",
                        message: `Original transaction ${tx.transactionId} does not belong to user ${userId}.`,
                        eventType: "reversal",
                        encSalt,
                        userId,
                        coinsDeducted: 0,
                    };
                }
            }
            const userData = userDoc.data();
            const startingBalance = Math.max(0, userData.coinsBalance || 0);
            let runningBalance = startingBalance;
            let totalDeducted = 0;
            const appliedIds = [];
            for (let i = 0; i < txPairs.length; i++) {
                const { tx, reversalRef, originalCreditRef } = txPairs[i];
                const reversalSnap = reversalSnaps[i];
                const originalData = originalCreditSnaps[i].data();
                const originalCoinsAwarded = Number(originalData.coinsAwarded) || 0;
                const previouslyReversed = Number(originalData.reversedCoins) || 0;
                const remainingReversible = Math.max(0, originalCoinsAwarded - previouslyReversed);
                if (reversalSnap.exists ||
                    originalData.fullyReversed === true ||
                    remainingReversible <= 0) {
                    continue; // Already fully reversed
                }
                const eligibleDebit = Math.min(tx.debitCoins, remainingReversible);
                const balanceBefore = runningBalance;
                const actualDebit = Math.min(balanceBefore, eligibleDebit);
                const balanceAfter = Math.max(0, balanceBefore - eligibleDebit);
                const newReversedCoins = previouslyReversed + eligibleDebit;
                runningBalance = balanceAfter;
                totalDeducted += actualDebit;
                appliedIds.push(tx.transactionId);
                transaction.set(reversalRef, {
                    provider: "theoremreach",
                    eventType: "reversal",
                    transactionId: tx.transactionId,
                    originalTransactionId: originalCreditRef.id,
                    originalCoinsAwarded,
                    encSalt,
                    userId,
                    requestedDebit: tx.debitCoins,
                    eligibleDebit,
                    coinsDeducted: actualDebit,
                    amountInDollars: tx.amountInDollars,
                    amountInCurrency: tx.amountInCurrency,
                    externalTransactionId,
                    at,
                    processedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                transaction.update(originalCreditRef, {
                    reversedCoins: newReversedCoins,
                    fullyReversed: newReversedCoins >= originalCoinsAwarded,
                    reversalTransactionId: reversalRef.id,
                    lastReversalEncSalt: encSalt,
                    lastReversalAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                transaction.set(helpers_1.db.collection("user_transactions").doc(), {
                    userId,
                    type: "debit",
                    amount: actualDebit,
                    reason: "TheoremReach survey reversal",
                    balanceBefore,
                    balanceAfter,
                    metadata: {
                        provider: "theoremreach",
                        appId: exports.THEOREMREACH_APP_ID,
                        eventType: "reversal",
                        encSalt,
                        providerTransactionId: tx.transactionId,
                        originalTransactionId: originalCreditRef.id,
                        requestedDebit: tx.debitCoins,
                        eligibleDebit,
                        actualDebit,
                        externalTransactionId,
                        at,
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            if (runningBalance !== startingBalance) {
                transaction.update(userRef, {
                    coinsBalance: runningBalance,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            transaction.set(eventRef, {
                provider: "theoremreach",
                appId: exports.THEOREMREACH_APP_ID,
                eventType: "reversal",
                encSalt,
                userId,
                externalTransactionId,
                at,
                appliedTransactionIds: appliedIds,
                coinsDeducted: totalDeducted,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            if (appliedIds.length === 0) {
                return {
                    success: true,
                    status: "duplicate",
                    message: "All reversed transactions were already fully reversed.",
                    eventType: "reversal",
                    encSalt,
                    userId,
                    coinsDeducted: 0,
                    newBalance: runningBalance,
                };
            }
            return {
                success: true,
                status: "processed",
                message: `TheoremReach reversal processed for ${appliedIds.length} transaction(s).`,
                eventType: "reversal",
                encSalt,
                userId,
                coinsDeducted: totalDeducted,
                newBalance: runningBalance,
            };
        });
    }
    catch (error) {
        console.error("[TheoremReach] Reversal event transaction failed:", error);
        return {
            success: false,
            status: "error",
            message: "Failed to process TheoremReach reversal event.",
            eventType: "reversal",
            encSalt,
            userId,
            coinsDeducted: 0,
        };
    }
}
/**
 * Records a verified TheoremReach provider ban on the user document WITHOUT
 * suspending the overall Paisa-Bharo user account.
 */
async function executeTheoremReachBanEvent(params) {
    const { encSalt, userId, at, externalTransactionId, banReason } = params;
    if (!isSafeFirestoreId(encSalt) || !isSafeFirestoreId(userId) || userId === "guest_user") {
        return {
            success: false,
            status: "error",
            message: "Invalid encSalt or userId.",
            eventType: "ban",
            encSalt,
            userId,
        };
    }
    if (externalTransactionId && !isSafeFirestoreId(externalTransactionId)) {
        return {
            success: false,
            status: "invalid_session",
            message: "Invalid externalTransactionId.",
            eventType: "ban",
            encSalt,
            userId,
        };
    }
    const eventRef = helpers_1.db.collection("provider_events").doc(`theoremreach_${encSalt}`);
    const userRef = (0, helpers_1.getUserRef)(userId);
    const sessionRef = externalTransactionId
        ? helpers_1.db.collection("theoremreach_sessions").doc(externalTransactionId)
        : null;
    try {
        return await helpers_1.db.runTransaction(async (transaction) => {
            const existingEvent = await transaction.get(eventRef);
            if (existingEvent.exists) {
                return {
                    success: true,
                    status: "duplicate",
                    message: `TheoremReach event ${encSalt} was already processed.`,
                    eventType: "ban",
                    encSalt,
                    userId,
                };
            }
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                return {
                    success: false,
                    status: "user_not_found",
                    message: `User ${userId} not found.`,
                    eventType: "ban",
                    encSalt,
                    userId,
                };
            }
            if (sessionRef) {
                const sessionDoc = await transaction.get(sessionRef);
                if (!sessionDoc.exists || sessionDoc.data()?.userId !== userId) {
                    return {
                        success: false,
                        status: "invalid_session",
                        message: `TheoremReach session ${externalTransactionId} is invalid or belongs to a different user.`,
                        eventType: "ban",
                        encSalt,
                        userId,
                    };
                }
            }
            const userData = userDoc.data();
            const existingProviderBans = userData.providerBans && typeof userData.providerBans === "object"
                ? userData.providerBans
                : {};
            transaction.update(userRef, {
                providerBans: {
                    ...existingProviderBans,
                    theoremreach: {
                        banned: true,
                        reason: banReason,
                        at,
                        encSalt,
                        externalTransactionId,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            transaction.set(eventRef, {
                provider: "theoremreach",
                appId: exports.THEOREMREACH_APP_ID,
                eventType: "ban",
                encSalt,
                userId,
                banReason,
                externalTransactionId,
                at,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return {
                success: true,
                status: "processed",
                message: `Recorded TheoremReach provider ban for user ${userId}.`,
                eventType: "ban",
                encSalt,
                userId,
            };
        });
    }
    catch (error) {
        console.error("[TheoremReach] Ban event transaction failed:", error);
        return {
            success: false,
            status: "error",
            message: "Failed to process TheoremReach ban event.",
            eventType: "ban",
            encSalt,
            userId,
        };
    }
}
/**
 * Generates, persists, and returns a signed TheoremReach launch session for `uid`.
 */
async function createTheoremReachLaunchSession(uid) {
    if (!uid || !isSafeFirestoreId(uid) || uid === "guest_user") {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required to launch surveys");
    }
    const apiKey = getTheoremReachApiKey();
    const secretKey = getTheoremReachSecret();
    const partnerId = getTheoremReachPartnerId();
    if (!apiKey || !secretKey || !partnerId) {
        throw new functions.https.HttpsError("failed-precondition", "TheoremReach server credentials are not configured");
    }
    const userDoc = await (0, helpers_1.getUserRef)(uid).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User profile not found");
    }
    const userData = userDoc.data() || {};
    if (userData.providerBans?.theoremreach?.banned === true) {
        throw new functions.https.HttpsError("permission-denied", "TheoremReach surveys are currently restricted for this account.");
    }
    const sanitizedUidPrefix = uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) || "user";
    const transactionId = `tr_${sanitizedUidPrefix}_${Date.now()}_${(0, crypto_1.randomBytes)(4).toString("hex")}`;
    const launchUrl = buildSignedTheoremReachEntryUrl({
        apiKey,
        secretKey,
        userId: uid,
        transactionId,
        partnerId,
        externalId: uid,
    });
    const parsedLaunch = new URL(launchUrl);
    const urlUserId = parsedLaunch.searchParams.get("user_id") ?? "";
    const urlExternalId = parsedLaunch.searchParams.get("external_id") ?? "";
    const urlTransactionId = parsedLaunch.searchParams.get("transaction_id") ?? "";
    if (urlUserId !== uid || urlExternalId !== uid || urlTransactionId !== transactionId) {
        throw new functions.https.HttpsError("internal", "TheoremReach launch URL user isolation check failed");
    }
    // Safe diagnostic logging: never prints api_key, secret, partner_id, hash, or the full signed URL.
    console.log("[TheoremReach] Launch session created", {
        appId: exports.THEOREMREACH_APP_ID,
        userId: uid,
        urlUserId,
        urlExternalId,
        uidIsolated: urlUserId === uid && urlExternalId === uid,
        transactionId,
        partnerIdSet: true,
        externalIdSource: "authenticated_uid",
        urlParamCount: Array.from(parsedLaunch.searchParams.keys()).length,
    });
    await helpers_1.db.collection("theoremreach_sessions").doc(transactionId).set({
        provider: "theoremreach",
        appId: exports.THEOREMREACH_APP_ID,
        transactionId,
        userId: uid,
        externalId: uid,
        status: "launched",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        launchUrl,
        transactionId,
        appId: exports.THEOREMREACH_APP_ID,
        currency: exports.THEOREMREACH_CURRENCY_SINGULAR,
        exchangeRate: exports.THEOREMREACH_EXCHANGE_RATE,
    };
}
/**
 * Server-side callable returning a signed TheoremReach survey launch URL for the
 * authenticated Firebase user. Never exposes THEOREMREACH_SECRET to the client.
 */
exports.getTheoremReachLaunchUrl = functions.https.onCall({ secrets: [exports.theoremreachApiKeySecret, exports.theoremreachSecretKey, exports.THEOREMREACH_PARTNER_ID_SECRET] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required to launch surveys");
    }
    return createTheoremReachLaunchSession(uid);
});
//# sourceMappingURL=theoremreach.js.map