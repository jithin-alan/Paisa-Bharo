import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createHmac, timingSafeEqual } from "crypto";
import { db, getUserRef } from "./helpers";
const PROVIDERS = ["cint", "adgem", "bitlabs", "affiliate"];
// Secrets come from the function's environment. Never hardcode or default these.
const SECRET_ENV = {
    cint: "CINT_API_KEY",
    adgem: "ADGEM_SECRET",
    bitlabs: "BITLABS_SECRET",
    affiliate: "AFFILIATE_SECRET",
};
// Used only when a provider reports money instead of coins.
const COIN_MULTIPLIER = {
    cint: 1000,
    adgem: 500,
    bitlabs: 500,
    affiliate: 500,
};
const MAX_COINS = 10000;
const CINT_STATUSES = ["complete", "terminate", "screenout", "quotafull", "reversed"];
const AFFILIATE_NETWORKS = ["Awin", "CJ", "Impact"];
// ---------------------------------------------------------------------------
// Small validators
// ---------------------------------------------------------------------------
function isProvider(value) {
    return typeof value === "string" && PROVIDERS.includes(value);
}
/** Non-empty trimmed string (or finite number rendered as string), max 200 chars. */
function str(value) {
    if (typeof value === "string") {
        const t = value.trim();
        return t.length > 0 && t.length <= 200 ? t : null;
    }
    if (typeof value === "number" && Number.isFinite(value))
        return String(value);
    return null;
}
/** Finite number from a number or numeric string. */
function num(value) {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : null;
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function isValidUserId(id) {
    return id.length >= 3 && id !== "guest_user";
}
function isValidTransactionId(id) {
    return id.length >= 3;
}
/**
 * Coins from an explicit coin amount, or converted from a currency amount.
 * Returns null if the result is missing, non-integer, or outside 1..MAX_COINS.
 */
function resolveCoins(provider, coinsRaw, usdRaw) {
    let coins = num(coinsRaw);
    if (coins === null) {
        const usd = num(usdRaw);
        if (usd === null)
            return null;
        coins = Math.round(usd * COIN_MULTIPLIER[provider]);
    }
    if (!Number.isInteger(coins) || coins < 1 || coins > MAX_COINS)
        return null;
    return coins;
}
// ---------------------------------------------------------------------------
// Signature verification (provider-specific, fail-closed)
// ---------------------------------------------------------------------------
function hmacHex(secret, data) {
    return createHmac("sha256", secret).update(data, "utf8").digest("hex");
}
function safeEqualHex(received, expected) {
    const a = Buffer.from(received.trim().toLowerCase(), "utf8");
    const b = Buffer.from(expected.toLowerCase(), "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
}
/*
 * The signed-field rules below follow the field lists in the original code.
 * Each one must be checked against that provider's current documentation before going live.
 */
const VERIFIERS = {
    // Cint: HMAC-SHA256 over timestamp|respondentId|surveyId|status|subId, sent as secureHash
    cint: (p, secret) => {
        const received = str(p.secureHash);
        if (!received)
            return false;
        const signed = [p.timestamp, p.respondentId, p.surveyId, p.status, p.subId ?? ""]
            .map(v => String(v ?? ""))
            .join("|");
        return safeEqualHex(received, hmacHex(secret, signed));
    },
    // AdGem: HMAC-SHA256 over the present fields as key=value joined by &, sent as signature
    adgem: (p, secret) => {
        const received = str(p.signature);
        if (!received)
            return false;
        const signed = ["player_id", "amount", "transaction_id", "verifier", "tx_id", "user_id", "coins", "reward"]
            .filter(k => p[k] !== undefined)
            .map(k => `${k}=${String(p[k])}`)
            .join("&");
        return safeEqualHex(received, hmacHex(secret, signed));
    },
    // BitLabs: HMAC-SHA256 over uid+val+tx, sent as hash
    bitlabs: (p, secret) => {
        const received = str(p.hash);
        if (!received)
            return false;
        const signed = [p.uid, p.val, p.tx].map(v => String(v ?? "")).join("");
        return safeEqualHex(received, hmacHex(secret, signed));
    },
    // Affiliate networks: HMAC-SHA256 over alphabetically sorted key+value pairs, sent as signature
    affiliate: (p, secret) => {
        const received = str(p.signature);
        if (!received)
            return false;
        const signed = Object.keys(p)
            .filter(k => k !== "signature")
            .sort()
            .map(k => `${k}=${String(p[k] ?? "")}`)
            .join("");
        return safeEqualHex(received, hmacHex(secret, signed));
    },
};
export function verifyProviderSignature(provider, payload) {
    const secret = process.env[SECRET_ENV[provider]];
    if (!secret) {
        console.error(`[SECURITY] ${SECRET_ENV[provider]} is not set; rejecting ${provider} callback`);
        return false;
    }
    try {
        return VERIFIERS[provider](payload, secret);
    }
    catch (err) {
        console.error(`[SECURITY] ${provider} signature check threw; rejecting`, err);
        return false;
    }
}
function parseCallback(provider, p) {
    const invalid = (error) => ({ kind: "invalid", error });
    switch (provider) {
        case "cint": {
            const respondentId = str(p.respondentId);
            const surveyId = str(p.surveyId);
            const status = str(p.status);
            const timestamp = str(p.timestamp);
            if (!respondentId || !surveyId || !status || !timestamp) {
                return invalid("Missing required field: respondentId, surveyId, status or timestamp");
            }
            if (!CINT_STATUSES.includes(status))
                return invalid(`Unknown status: ${status}`);
            if (status !== "complete") {
                return { kind: "ignored", reason: `Cint status "${status}" does not credit coins` };
            }
            const coins = resolveCoins("cint", p.coinsAwarded, p.rewardUsd);
            if (coins === null)
                return invalid("Invalid or missing reward: provide coinsAwarded or rewardUsd");
            return {
                kind: "ok",
                input: {
                    provider,
                    transactionId: `${surveyId}_${respondentId}`,
                    userId: respondentId,
                    coinsAwarded: coins,
                    reason: "Cint survey complete",
                    metadata: { surveyId, timestamp },
                },
            };
        }
        case "adgem": {
            const transactionId = str(p.transaction_id);
            const userId = str(p.user_id);
            if (!transactionId || !userId)
                return invalid("Missing required field: transaction_id or user_id");
            const coins = resolveCoins("adgem", p.amount, undefined);
            if (coins === null)
                return invalid("Invalid amount: must be an integer from 1 to 10000");
            return {
                kind: "ok",
                input: {
                    provider,
                    transactionId,
                    userId,
                    coinsAwarded: coins,
                    reason: "AdGem offerwall postback",
                    metadata: { providerTxId: str(p.tx_id) ?? "" },
                },
            };
        }
        case "bitlabs": {
            const tx = str(p.tx);
            const uid = str(p.uid);
            if (!tx || !uid)
                return invalid("Missing required field: tx or uid");
            const coins = resolveCoins("bitlabs", p.val, undefined);
            if (coins === null)
                return invalid("Invalid val: must be an integer from 1 to 10000");
            return {
                kind: "ok",
                input: {
                    provider,
                    transactionId: tx,
                    userId: uid,
                    coinsAwarded: coins,
                    reason: "BitLabs offerwall postback",
                    metadata: { p1: str(p.p1) ?? "", subId: str(p.subId) ?? "" },
                },
            };
        }
        case "affiliate": {
            const network = str(p.network);
            const orderId = str(p.orderId);
            const userId = str(p.userId);
            const status = str(p.status);
            if (!network || !orderId || !userId || !status) {
                return invalid("Missing required field: network, orderId, userId or status");
            }
            if (!AFFILIATE_NETWORKS.includes(network))
                return invalid(`Unknown network: ${network}`);
            if (status !== "approved") {
                return { kind: "ignored", reason: `Affiliate status "${status}" does not credit coins yet` };
            }
            const coins = resolveCoins("affiliate", p.coinsAwarded, p.commissionUsd);
            if (coins === null)
                return invalid("Invalid or missing reward: provide coinsAwarded or commissionUsd");
            return {
                kind: "ok",
                input: {
                    provider,
                    transactionId: `${network}_${orderId}`,
                    userId,
                    coinsAwarded: coins,
                    reason: `Affiliate conversion via ${network}`,
                    metadata: {
                        network,
                        orderId,
                        clickId: str(p.clickId) ?? "",
                        merchantName: str(p.merchantName) ?? "",
                    },
                },
            };
        }
    }
}
// ---------------------------------------------------------------------------
// Wallet credit (single Firestore transaction)
// ---------------------------------------------------------------------------
async function executeCallback(input) {
    const { provider, transactionId, userId, coinsAwarded, reason, metadata } = input;
    const userRef = getUserRef(userId);
    const txRef = db.collection("provider_transactions").doc(`${provider}_${transactionId}`);
    try {
        return await db.runTransaction(async (transaction) => {
            const existingTx = await transaction.get(txRef);
            if (existingTx.exists) {
                return {
                    success: true,
                    status: "duplicate",
                    message: `Transaction ${transactionId} from ${provider} was already credited.`,
                    transactionId,
                    userId,
                    coinsAwarded: 0,
                };
            }
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                return {
                    success: false,
                    status: "user_not_found",
                    message: `User ${userId} not found.`,
                    transactionId,
                    userId,
                    coinsAwarded: 0,
                };
            }
            const userData = userDoc.data();
            const currentBalance = userData.coinsBalance || 0;
            const newBalance = currentBalance + coinsAwarded;
            transaction.set(txRef, {
                provider,
                transactionId,
                userId,
                coinsAwarded,
                reason,
                metadata,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            transaction.update(userRef, {
                coinsBalance: newBalance,
                lifetimeEarnings: (userData.lifetimeEarnings || 0) + coinsAwarded,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            transaction.set(db.collection("user_transactions").doc(), {
                userId,
                type: "credit",
                amount: coinsAwarded,
                reason,
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
                metadata: { provider, providerTransactionId: transactionId, ...metadata },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Mark survey completion as verified if it's a survey completion
            if (provider === 'cint' && metadata.surveyId) {
                const tokenRef = db.collection("survey_tokens").doc(`sv_${metadata.surveyId}_${userId}`);
                const tokenDoc = await transaction.get(tokenRef);
                if (tokenDoc.exists) {
                    transaction.update(tokenRef, {
                        status: 'verified',
                        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            return {
                success: true,
                status: "credited",
                message: `${provider} callback processed. +${coinsAwarded} coins credited.`,
                transactionId,
                userId,
                coinsAwarded,
                newBalance,
            };
        });
    }
    catch (error) {
        // Thrown errors (contention, Firestore outage) roll back the whole transaction.
        console.error(`[ProviderCallback] ${provider} transaction failed:`, error);
        return {
            success: false,
            status: "error",
            message: "Failed to process callback.",
            transactionId,
            userId,
            coinsAwarded: 0,
        };
    }
}
// ---------------------------------------------------------------------------
// Cloud Functions
// ---------------------------------------------------------------------------
/**
 * Provider S2S postback endpoint.
 * Deploy URL: .../providerPostback/<provider>   (cint | adgem | bitlabs | affiliate)
 * POST only. Anything else gets 405 and no processing.
 */
export const providerPostback = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.set("Allow", "POST");
        res.status(405).json({ success: false, error: "Method not allowed" });
        return;
    }
    // Provider comes from the URL only, so the body cannot choose which rules apply.
    const segment = (req.path.split("/").filter(Boolean).pop() || "").toLowerCase();
    if (!isProvider(segment)) {
        res.status(404).json({ success: false, error: "Unknown provider" });
        return;
    }
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        res.status(400).json({ success: false, status: "invalid_payload", error: "Invalid payload" });
        return;
    }
    const payload = { ...req.query, ...body };
    if (!verifyProviderSignature(segment, payload)) {
        console.warn(`[SECURITY] Rejected ${segment} callback: signature check failed`);
        res.status(403).json({ success: false, status: "invalid_signature", error: "Invalid signature" });
        return;
    }
    const parsed = parseCallback(segment, payload);
    if (parsed.kind === "invalid") {
        res.status(400).json({ success: false, status: "invalid_payload", error: parsed.error });
        return;
    }
    if (parsed.kind === "ignored") {
        // 200 so the provider stops retrying a status we deliberately do not credit.
        res.status(200).json({ success: true, status: "ignored", message: parsed.reason });
        return;
    }
    const { input } = parsed;
    if (!isValidUserId(input.userId) || !isValidTransactionId(input.transactionId)) {
        res.status(400).json({ success: false, status: "invalid_payload", error: "Invalid user or transaction id" });
        return;
    }
    try {
        const result = await executeCallback(input);
        const code = result.status === "error" ? 500 : result.status === "user_not_found" ? 404 : 200;
        res.status(code).json(result);
    }
    catch (error) {
        console.error(`[ProviderPostback] Unhandled error for ${segment}:`, error);
        res.status(500).json({ success: false, status: "error", error: "Internal error" });
    }
});
/**
 * Admin-only manual credit. Provider traffic must not use this; it goes through providerPostback.
 */
export const processProviderCallback = functions.https.onCall(async (request, response) => {
    const auth = request.auth;
    if (!auth) {
        throw new functions.https.HttpsError("unauthenticated", "Sign in required");
    }
    if (auth.token.admin !== true) {
        throw new functions.https.HttpsError("permission-denied", "Admin only");
    }
    const payload = request.data && typeof request.data === "object" ? request.data : {};
    const provider = payload.provider;
    const transactionId = str(payload.transactionId);
    const userId = str(payload.userId);
    const coinsAwarded = num(payload.coinsAwarded);
    const reason = str(payload.reason);
    if (!isProvider(provider))
        throw new functions.https.HttpsError("invalid-argument", "Invalid provider");
    if (!transactionId || !isValidTransactionId(transactionId)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid transactionId");
    }
    if (!userId || !isValidUserId(userId))
        throw new functions.https.HttpsError("invalid-argument", "Invalid userId");
    if (coinsAwarded === null || !Number.isInteger(coinsAwarded) || coinsAwarded < 1 || coinsAwarded > MAX_COINS) {
        throw new functions.https.HttpsError("invalid-argument", `coinsAwarded must be an integer from 1 to ${MAX_COINS}`);
    }
    if (!reason)
        throw new functions.https.HttpsError("invalid-argument", "reason is required");
    return executeCallback({
        provider,
        transactionId,
        userId,
        coinsAwarded,
        reason,
        metadata: { source: "admin" },
    });
});
//# sourceMappingURL=providerCallbacks.js.map