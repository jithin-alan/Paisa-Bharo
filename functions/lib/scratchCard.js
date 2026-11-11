import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef, resolveTimezone, getDateInTimezone, } from "./helpers";
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
export const claimScratchCard = functions.https.onCall(async (request, response) => {
    const context = request.auth;
    if (!context) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const userId = context.uid;
    const userRef = getUserRef(userId);
    return await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User not found");
        }
        const userData = userDoc.data();
        const requestData = (request.data || {});
        // Resolve user timezone
        const userTimezone = resolveTimezone(requestData.timezone, userData.timezone, userData.country);
        const today = getDateInTimezone(new Date(), userTimezone);
        const scratchKey = `scratch_${userId}_${today}`;
        const scratchRef = db.collection("scratch_cards").doc(scratchKey);
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
        const txRef = db.collection("user_transactions").doc();
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