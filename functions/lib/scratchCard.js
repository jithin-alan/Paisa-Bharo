import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";
export const claimScratchCard = functions.https.onCall(async (request, response) => {
    const context = request.auth;
    if (!context) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { coins } = request.data;
    const userId = context.uid;
    if (!coins || coins <= 0 || coins > 500) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid coin amount");
    }
    const userRef = getUserRef(userId);
    const today = new Date().toISOString().split("T")[0];
    const scratchKey = `scratch_${userId}_${today}`;
    const scratchRef = db.collection("scratch_cards").doc(scratchKey);
    return await db.runTransaction(async (transaction) => {
        // Check if already claimed today
        const existing = await transaction.get(scratchRef);
        if (existing.exists) {
            throw new functions.https.HttpsError("already-exists", "Already claimed scratch card today");
        }
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User not found");
        }
        const userData = userDoc.data();
        const newBalance = (userData.coinsBalance || 0) + coins;
        const newLifetime = (userData.lifetimeEarnings || 0) + coins;
        // Record scratch card claim
        transaction.set(scratchRef, {
            userId,
            coinsAwarded: coins,
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update user balance
        transaction.update(userRef, {
            coinsBalance: newBalance,
            lifetimeEarnings: newLifetime,
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
            metadata: {},
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            coins,
            newBalance,
            newLifetime,
        };
    });
});
//# sourceMappingURL=scratchCard.js.map