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
exports.processProviderCallback = exports.theoremreachEventWebhook = exports.providerPostback = void 0;
exports.verifyProviderSignature = verifyProviderSignature;
exports.executeCallback = executeCallback;
exports.handleTheoremReachEventHttp = handleTheoremReachEventHttp;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const helpers_1 = require("./helpers");
const theoremreach_1 = require("./theoremreach");
const LEGACY_PROVIDERS = ["cint", "adgem", "bitlabs", "affiliate"];
const PROVIDERS = [...LEGACY_PROVIDERS, "theoremreach"];
// Secrets for legacy HTTP providers come from environment variables.
// TheoremReach secrets are bound via Firebase Functions v2 defineSecret().
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
    theoremreach: theoremreach_1.THEOREMREACH_EXCHANGE_RATE,
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
function isLegacyProvider(value) {
    return typeof value === "string" && LEGACY_PROVIDERS.includes(value);
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
    return (0, theoremreach_1.isSafeFirestoreId)(id) && id !== "guest_user";
}
function isValidTransactionId(id) {
    return (0, theoremreach_1.isSafeFirestoreId)(id);
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
    return (0, crypto_1.createHmac)("sha256", secret).update(data, "utf8").digest("hex");
}
function safeEqualHex(received, expected) {
    const a = Buffer.from(received.trim().toLowerCase(), "utf8");
    const b = Buffer.from(expected.toLowerCase(), "utf8");
    return a.length === b.length && (0, crypto_1.timingSafeEqual)(a, b);
}
/*
 * The signed-field rules below follow the field lists in the original code.
 * Each one must be checked against that provider's current documentation before going live.
 */
const VERIFIERS = {
    // Cint: HMAC-SHA256 over timestamp|respondentId|surveyId|status[|subId]
    cint: (p, secret) => {
        const received = str(p.secureHash || p.hash || p.signature || p.sig);
        if (!received)
            return false;
        const respondentId = str(p.respondentId || p.userId || p.user_id || p.ssi || p.uid);
        const surveyId = str(p.surveyId || p.survey_id || p.id);
        const status = str(p.status);
        const timestamp = str(p.timestamp || p.time || p.t);
        const subId = p.subId !== undefined ? String(p.subId) : undefined;
        const candidates = [];
        if (subId !== undefined) {
            candidates.push([timestamp, respondentId, surveyId, status, subId].map(v => String(v ?? "")).join("|"));
        }
        candidates.push([timestamp, respondentId, surveyId, status].map(v => String(v ?? "")).join("|"));
        candidates.push([p.timestamp, p.respondentId, p.surveyId, p.status, p.subId ?? ""].map(v => String(v ?? "")).join("|"));
        return candidates.some(signed => safeEqualHex(received, hmacHex(secret, signed)));
    },
    // AdGem: HMAC-SHA256 over present fields or standard concatenated string
    adgem: (p, secret) => {
        const received = str(p.signature || p.verifier || p.sig || p.hash);
        if (!received)
            return false;
        const playerId = str(p.player_id || p.user_id || p.uid);
        const amount = p.amount !== undefined ? String(p.amount) : p.coins !== undefined ? String(p.coins) : undefined;
        const txId = str(p.transaction_id || p.tx_id || p.tx);
        const candidates = [];
        if (playerId && amount && txId) {
            candidates.push(`${playerId}${amount}${txId}`);
            candidates.push(`${playerId}|${amount}|${txId}`);
            candidates.push(`player_id=${playerId}&amount=${amount}&transaction_id=${txId}`);
        }
        const keyVals = ["player_id", "amount", "transaction_id", "verifier", "tx_id", "user_id", "coins", "reward"]
            .filter(k => p[k] !== undefined)
            .map(k => `${k}=${String(p[k])}`)
            .join("&");
        if (keyVals)
            candidates.push(keyVals);
        return candidates.some(signed => safeEqualHex(received, hmacHex(secret, signed)));
    },
    // BitLabs: HMAC-SHA256 over uid+val+tx
    bitlabs: (p, secret) => {
        const received = str(p.hash || p.signature || p.sig);
        if (!received)
            return false;
        const uid = str(p.uid || p.user_id || p.subId);
        const val = p.val !== undefined ? String(p.val) : p.amount !== undefined ? String(p.amount) : undefined;
        const tx = str(p.tx || p.transaction_id || p.tx_id);
        const type = str(p.type);
        const candidates = [];
        if (uid && val && tx) {
            candidates.push(`${uid}${val}${tx}`);
            candidates.push(`${uid}|${val}|${tx}`);
            if (type)
                candidates.push(`${uid}${val}${tx}${type}`);
        }
        candidates.push([p.uid, p.val, p.tx].map(v => String(v ?? "")).join(""));
        return candidates.some(signed => safeEqualHex(received, hmacHex(secret, signed)));
    },
    // Affiliate networks: HMAC-SHA256 over network-specific or key-value fields
    affiliate: (p, secret) => {
        const received = str(p.signature || p.hash || p.sig);
        if (!received)
            return false;
        const orderId = str(p.orderId || p.transaction_id || p.tx_id || p.oid);
        const userId = str(p.userId || p.user_id || p.subId || p.member_id);
        const commission = p.commissionUsd !== undefined ? String(p.commissionUsd) : p.commission !== undefined ? String(p.commission) : undefined;
        const saleAmount = p.saleAmountUsd !== undefined ? String(p.saleAmountUsd) : p.saleAmount !== undefined ? String(p.saleAmount) : undefined;
        const candidates = [];
        if (orderId && commission) {
            candidates.push(`${orderId}${commission}`);
            if (userId)
                candidates.push(`${orderId}${userId}${commission}`);
        }
        if (orderId && userId && saleAmount) {
            candidates.push(`${orderId}${userId}${saleAmount}`);
        }
        const sortedKeyVal = Object.keys(p)
            .filter(k => !["signature", "hash", "sig"].includes(k))
            .sort()
            .map(k => `${k}=${String(p[k] ?? "")}`)
            .join("");
        candidates.push(sortedKeyVal);
        const sortedKeyValAmp = Object.keys(p)
            .filter(k => !["signature", "hash", "sig"].includes(k))
            .sort()
            .map(k => `${k}=${String(p[k] ?? "")}`)
            .join("&");
        candidates.push(sortedKeyValAmp);
        return candidates.some(signed => safeEqualHex(received, hmacHex(secret, signed)));
    },
};
function verifyProviderSignature(provider, payload) {
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
            const respondentId = str(p.respondentId || p.userId || p.user_id || p.ssi || p.uid);
            const surveyId = str(p.surveyId || p.survey_id || p.id);
            const status = str(p.status);
            const timestamp = str(p.timestamp || p.time || p.t);
            if (!respondentId || !surveyId || !status || !timestamp) {
                return invalid("Missing required field: respondentId, surveyId, status or timestamp");
            }
            if (!CINT_STATUSES.includes(status))
                return invalid(`Unknown status: ${status}`);
            if (status !== "complete") {
                return { kind: "ignored", reason: `Cint status "${status}" does not credit coins` };
            }
            const coins = resolveCoins("cint", p.coinsAwarded || p.coins, p.rewardUsd || p.reward_usd);
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
            const transactionId = str(p.transaction_id || p.tx_id || p.tx);
            const userId = str(p.user_id || p.player_id || p.uid);
            if (!transactionId || !userId)
                return invalid("Missing required field: transaction_id or user_id");
            const coins = resolveCoins("adgem", p.amount || p.coins || p.reward, undefined);
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
                    metadata: { providerTxId: str(p.tx_id || p.transaction_id) ?? "" },
                },
            };
        }
        case "bitlabs": {
            const tx = str(p.tx || p.transaction_id || p.tx_id);
            const uid = str(p.uid || p.user_id || p.subId);
            if (!tx || !uid)
                return invalid("Missing required field: tx or uid");
            const coins = resolveCoins("bitlabs", p.val || p.amount || p.coins, undefined);
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
            const network = str(p.network) || "Awin";
            const orderId = str(p.orderId || p.transaction_id || p.tx_id || p.oid);
            const userId = str(p.userId || p.user_id || p.subId || p.member_id);
            const status = str(p.status) || "approved";
            if (!orderId || !userId) {
                return invalid("Missing required field: network, orderId, userId or status");
            }
            if (!AFFILIATE_NETWORKS.includes(network))
                return invalid(`Unknown network: ${network}`);
            if (status !== "approved") {
                return { kind: "ignored", reason: `Affiliate status "${status}" does not credit coins yet` };
            }
            const coins = resolveCoins("affiliate", p.coinsAwarded || p.coins, p.commissionUsd || p.commission);
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
                        clickId: str(p.clickId || p.click_id) ?? "",
                        merchantName: str(p.merchantName || p.merchant) ?? "",
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
    const userRef = (0, helpers_1.getUserRef)(userId);
    const txRef = helpers_1.db.collection("provider_transactions").doc(`${provider}_${transactionId}`);
    const externalTxId = provider === "theoremreach" && typeof metadata.externalTransactionId === "string"
        ? metadata.externalTransactionId.trim()
        : "";
    if (externalTxId && !(0, theoremreach_1.isSafeFirestoreId)(externalTxId)) {
        return {
            success: false,
            status: "invalid_session",
            message: "Invalid externalTransactionId.",
            transactionId,
            userId,
            coinsAwarded: 0,
        };
    }
    const sessionRef = provider === "theoremreach" && externalTxId
        ? helpers_1.db.collection("theoremreach_sessions").doc(externalTxId)
        : null;
    try {
        return await helpers_1.db.runTransaction(async (transaction) => {
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
            if (provider === "theoremreach" && userData.providerBans?.theoremreach?.banned === true) {
                return {
                    success: false,
                    status: "banned",
                    message: `TheoremReach rewards are blocked for banned user ${userId}.`,
                    transactionId,
                    userId,
                    coinsAwarded: 0,
                };
            }
            if (sessionRef) {
                const sessionDoc = await transaction.get(sessionRef);
                if (!sessionDoc.exists) {
                    return {
                        success: false,
                        status: "invalid_session",
                        message: `TheoremReach launch session ${externalTxId} does not exist.`,
                        transactionId,
                        userId,
                        coinsAwarded: 0,
                    };
                }
                if (sessionDoc.data()?.userId !== userId) {
                    return {
                        success: false,
                        status: "session_user_mismatch",
                        message: `TheoremReach launch session ${externalTxId} belongs to a different user.`,
                        transactionId,
                        userId,
                        coinsAwarded: 0,
                    };
                }
            }
            // Perform any remaining read before writes (Cint survey token verification)
            const tokenRef = provider === "cint" && metadata.surveyId
                ? helpers_1.db.collection("survey_tokens").doc(`sv_${metadata.surveyId}_${userId}`)
                : null;
            const tokenDoc = tokenRef ? await transaction.get(tokenRef) : null;
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
            transaction.set(helpers_1.db.collection("user_transactions").doc(), {
                userId,
                type: "credit",
                amount: coinsAwarded,
                reason,
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
                metadata: { provider, providerTransactionId: transactionId, ...metadata },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            if (sessionRef) {
                transaction.update(sessionRef, {
                    status: "completed",
                    lastProviderTxId: transactionId,
                    lastCreditedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            // Mark survey completion as verified if it's a survey completion
            if (tokenRef && tokenDoc?.exists) {
                transaction.update(tokenRef, {
                    status: "verified",
                    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
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
async function handleTheoremReachEventHttp(req, res, allowedFunctionNames) {
    if (req.method !== "POST") {
        res.set("Allow", "POST");
        res.status(405).json({ success: false, error: "Method not allowed" });
        return;
    }
    const secret = (0, theoremreach_1.getTheoremReachSecret)();
    const configuredApiKey = (0, theoremreach_1.getTheoremReachApiKey)();
    if (!secret || !configuredApiKey) {
        console.error("[SECURITY] TheoremReach secrets are not configured; rejecting TheoremReach webhook");
        res.status(403).json({ success: false, status: "invalid_signature", error: "Invalid signature" });
        return;
    }
    const rawPath = req.originalUrl || req.url || req.path || "";
    const fnNames = allowedFunctionNames && allowedFunctionNames.length > 0
        ? allowedFunctionNames
        : rawPath.includes("/theoremreach-event")
            ? ["providerPostback"]
            : ["theoremreachEventWebhook"];
    if (!(0, theoremreach_1.verifyTheoremReachIncomingUrl)(req, secret, fnNames)) {
        console.warn("[SECURITY] Rejected theoremreach event webhook: signature check failed");
        res.status(403).json({ success: false, status: "invalid_signature", error: "Invalid signature" });
        return;
    }
    const parsed = (0, theoremreach_1.parseTheoremReachEventPayload)(req.query || {}, req.body);
    if (parsed.kind === "invalid") {
        res.status(400).json({ success: false, status: "invalid_payload", error: parsed.error });
        return;
    }
    if (!parsed.apiKey || !(0, theoremreach_1.safeEqualString)(parsed.apiKey, configuredApiKey)) {
        console.warn("[SECURITY] Rejected theoremreach event webhook: missing or mismatched api_key");
        res.status(403).json({ success: false, status: "invalid_signature", error: "API key verification failed" });
        return;
    }
    const livePostbacksEnabled = process.env.PAISA_BHARO_LIVE_POSTBACKS_ENABLED === "true";
    if (!livePostbacksEnabled) {
        console.log(`[SANDBOX] theoremreach ${parsed.kind} event received in sandbox mode.`);
        res.status(200).json({
            success: true,
            status: "sandbox_mock",
            message: "TheoremReach event signature verified. Live processing is currently disabled for security verification phase.",
            eventType: parsed.kind,
            encSalt: parsed.encSalt,
            userId: parsed.userId,
        });
        return;
    }
    const result = parsed.kind === "reversal"
        ? await (0, theoremreach_1.executeTheoremReachReversalEvent)(parsed)
        : await (0, theoremreach_1.executeTheoremReachBanEvent)(parsed);
    const code = result.status === "error"
        ? 500
        : result.status === "user_not_found" || result.status === "original_tx_not_found"
            ? 404
            : result.status === "user_mismatch" || result.status === "invalid_session"
                ? 403
                : 200;
    res.status(code).json(result);
}
async function handleTheoremReachRewardHttp(req, res) {
    if (req.method !== "GET") {
        res.set("Allow", "GET");
        res.status(405).json({ success: false, error: "Method not allowed" });
        return;
    }
    const secret = (0, theoremreach_1.getTheoremReachSecret)();
    if (!secret) {
        console.error("[SECURITY] THEOREMREACH_SECRET is not set; rejecting theoremreach callback");
        res.status(403).json({ success: false, status: "invalid_signature", error: "Invalid signature" });
        return;
    }
    if (!(0, theoremreach_1.verifyTheoremReachIncomingUrl)(req, secret, ["providerPostback"])) {
        console.warn("[SECURITY] Rejected theoremreach callback: signature check failed");
        res.status(403).json({ success: false, status: "invalid_signature", error: "Invalid signature" });
        return;
    }
    // Strictly parse query parameters only (never merge req.body into signed GET params)
    const queryPayload = req.query && typeof req.query === "object" && !Array.isArray(req.query)
        ? req.query
        : {};
    const parsed = (0, theoremreach_1.parseTheoremReachRewardPayload)(queryPayload);
    if (parsed.kind === "invalid") {
        res.status(400).json({ success: false, status: "invalid_payload", error: parsed.error });
        return;
    }
    if (parsed.kind === "ignored") {
        res.status(200).json({ success: true, status: "ignored", message: parsed.reason });
        return;
    }
    const livePostbacksEnabled = process.env.PAISA_BHARO_LIVE_POSTBACKS_ENABLED === "true";
    if (!livePostbacksEnabled) {
        console.log(`[SANDBOX] theoremreach ${parsed.kind} callback received in sandbox mode.`);
        res.status(200).json({
            success: true,
            status: "sandbox_mock",
            message: "Postback signature verified. Live coin crediting is currently disabled for security verification phase.",
            transactionId: parsed.transactionId,
            userId: parsed.userId,
            coinsAwarded: 0,
        });
        return;
    }
    if (parsed.kind === "reversal") {
        const reversalRes = await (0, theoremreach_1.executeTheoremReachReversalEvent)({
            encSalt: `reward_cb_${parsed.transactionId}`,
            userId: parsed.userId,
            at: new Date().toISOString(),
            externalTransactionId: String(parsed.metadata.externalTransactionId ?? ""),
            reversedTransactions: [
                {
                    transactionId: parsed.transactionId,
                    debitCoins: parsed.debitCoins,
                    amountInDollars: String(parsed.metadata.rewardAmountInDollars ?? ""),
                    amountInCurrency: String(parsed.debitCoins),
                },
            ],
        });
        const code = reversalRes.status === "error"
            ? 500
            : reversalRes.status === "user_not_found" || reversalRes.status === "original_tx_not_found"
                ? 404
                : reversalRes.status === "user_mismatch" || reversalRes.status === "invalid_session"
                    ? 403
                    : 200;
        res.status(code).json(reversalRes);
        return;
    }
    try {
        const result = await executeCallback({
            provider: "theoremreach",
            transactionId: parsed.transactionId,
            userId: parsed.userId,
            coinsAwarded: parsed.coinsAwarded,
            reason: "TheoremReach survey reward",
            metadata: parsed.metadata,
        });
        const code = result.status === "error"
            ? 500
            : result.status === "user_not_found"
                ? 404
                : result.status === "banned" ||
                    result.status === "invalid_session" ||
                    result.status === "session_user_mismatch"
                    ? 403
                    : 200;
        res.status(code).json(result);
    }
    catch (error) {
        console.error("[ProviderPostback] Unhandled error for theoremreach:", error);
        res.status(500).json({ success: false, status: "error", error: "Internal error" });
    }
}
/**
 * Provider S2S postback endpoint.
 * Deploy URL: .../providerPostback/<provider>   (cint | adgem | bitlabs | affiliate | theoremreach | theoremreach-event)
 * Existing providers remain POST-only; TheoremReach reward callbacks accept GET only and events require POST.
 */
exports.providerPostback = functions.https.onRequest({ secrets: [theoremreach_1.theoremreachApiKeySecret, theoremreach_1.theoremreachSecretKey] }, async (req, res) => {
    // Provider comes from the URL path (or ?provider=theoremreach when hitting root endpoint).
    const rawSegment = (req.path.split("/").filter(Boolean).pop() || "").toLowerCase();
    const queryProvider = str(req.query?.provider)?.toLowerCase() ?? "";
    const effectiveSegment = rawSegment === "" || rawSegment === "providerpostback"
        ? queryProvider
        : rawSegment;
    if (effectiveSegment === "theoremreach-event") {
        await handleTheoremReachEventHttp(req, res, ["providerPostback"]);
        return;
    }
    if (effectiveSegment === "theoremreach") {
        await handleTheoremReachRewardHttp(req, res);
        return;
    }
    if (req.method !== "POST") {
        res.set("Allow", "POST");
        res.status(405).json({ success: false, error: "Method not allowed" });
        return;
    }
    const segment = rawSegment;
    if (!isLegacyProvider(segment)) {
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
    // Production Safeguard: External provider callbacks default to sandbox mode during deployment audit phase
    const livePostbacksEnabled = process.env.PAISA_BHARO_LIVE_POSTBACKS_ENABLED === "true";
    if (!livePostbacksEnabled) {
        console.log(`[SANDBOX] ${segment} postback received in sandbox mode. Live crediting disabled for security audit phase.`);
        res.status(200).json({
            success: true,
            status: "sandbox_mock",
            message: "Postback signature verified. Live coin crediting is currently disabled for security verification phase.",
            transactionId: input.transactionId,
            userId: input.userId,
            coinsAwarded: 0,
        });
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
 * Dedicated TheoremReach Event Webhook endpoint (reversal / ban events).
 */
exports.theoremreachEventWebhook = functions.https.onRequest({ secrets: [theoremreach_1.theoremreachApiKeySecret, theoremreach_1.theoremreachSecretKey] }, async (req, res) => {
    await handleTheoremReachEventHttp(req, res, ["theoremreachEventWebhook"]);
});
/**
 * Admin-only manual credit. Provider traffic must not use this; it goes through providerPostback.
 */
exports.processProviderCallback = functions.https.onCall(async (request) => {
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