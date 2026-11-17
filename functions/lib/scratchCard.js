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
exports.claimScratchCard = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const helpers_1 = require("./helpers");
// Scratch card reward table — server decides the outcome, never the client.
// Weighted distribution: small wins common, big wins rare.
const SCRATCH_REWARDS = [10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500];
const SCRATCH_WEIGHTS = [18, 16, 14, 12, 10, 8, 6, 5, 4, 3, 2, 1, 1];
/**
 * Deterministic server-side reward selection.
 * Seeded by userId + date in user timezone so the result is stable per user per day.
 */
function generateScratchReward(userId, dateStr) {
    let hash = 2166136261;
    const seed = `${userId}_${dateStr}`;
    for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    const totalWeight = SCRATCH_WEIGHTS.reduce((a, b) => a + b, 0);
    let roll = Math.abs(hash) % totalWeight;
    for (let i = 0; i < SCRATCH_REWARDS.length; i++) {
        roll -= SCRATCH_WEIGHTS[i];
        if (roll < 0) {
            return SCRATCH_REWARDS[i];
        }
    }
    return SCRATCH_REWARDS[0];
}
exports.claimScratchCard = functions.https.onCall(async (request, response) => {
    const context = request.auth;
    if (!context) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const userId = context.uid;
    const userRef = (0, helpers_1.getUserRef)(userId);
    return await helpers_1.db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User not found");
        }
        const userData = userDoc.data();
        const requestData = (request.data || {});
        // Resolve user timezone
        const userTimezone = (0, helpers_1.resolveTimezone)(requestData.timezone, userData.timezone, userData.country);
        const today = (0, helpers_1.getDateInTimezone)(new Date(), userTimezone);
        const scratchKey = `scratch_${userId}_${today}`;
        const scratchRef = helpers_1.db.collection("scratch_cards").doc(scratchKey);
        // Check if already claimed today in this timezone
        const existing = await transaction.get(scratchRef);
        if (existing.exists) {
            throw new functions.https.HttpsError("already-exists", `Already claimed scratch card today (${today}) in timezone ${userTimezone}`);
        }
        const coins = generateScratchReward(userId, today);
        const newBalance = (userData.coinsBalance || 0) + coins;
        const newLifetime = (userData.lifetimeEarnings || 0) + coins;
        // Record scratch card claim
        transaction.set(scratchRef, {
            userId,
            coinsAwarded: coins,
            date: today,
            timezone: userTimezone,
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update user balance
        transaction.update(userRef, {
            coinsBalance: newBalance,
            lifetimeEarnings: newLifetime,
            timezone: userTimezone,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Create transaction record
        const txRef = helpers_1.db.collection("user_transactions").doc();
        transaction.set(txRef, {
            userId,
            type: "credit",
            amount: coins,
            reason: "scratch_card",
            balanceBefore: userData.coinsBalance || 0,
            balanceAfter: newBalance,
            metadata: { date: today, timezone: userTimezone },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            coins,
            newBalance,
            newLifetime,
            claimedDate: today,
            timezone: userTimezone,
        };
    });
});
//# sourceMappingURL=scratchCard.js.map