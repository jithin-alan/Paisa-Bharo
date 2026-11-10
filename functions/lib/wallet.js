import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";
/**
 * Helper to atomically update user coins with validation
 */
async function updateUserCoins(userId, coinDelta, reason, metadata = {}) {
    const userRef = getUserRef(userId);
    return await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User not found");
        }
        const userData = userDoc.data();
        const currentBalance = userData.coinsBalance || 0;
        const currentLifetime = userData.lifetimeEarnings || 0;
        const newBalance = Math.max(0, currentBalance + coinDelta);
        const newLifetime = coinDelta > 0 ? currentLifetime + coinDelta : currentLifetime;
        // Validate the change is reasonable
        if (coinDelta > 10000) {
            throw new functions.https.HttpsError("invalid-argument", "Coin delta exceeds maximum allowed");
        }
        transaction.update(userRef, {
            coinsBalance: newBalance,
            lifetimeEarnings: newLifetime,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Create transaction record
        const txRef = db.collection("user_transactions").doc();
        transaction.set(txRef, {
            userId,
            type: coinDelta > 0 ? "credit" : "debit",
            amount: Math.abs(coinDelta),
            reason,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            metadata,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { newBalance, newLifetime };
    });
}
export { updateUserCoins };
//# sourceMappingURL=wallet.js.map