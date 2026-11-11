import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";
export const requestRedemption = functions.https.onCall(async (request, response) => {
    const auth = request.auth;
    if (!auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { payoutMethod, amountCurrency, coinsSpent, accountDetails, currency } = request.data;
    const userId = auth.uid;
    if (!payoutMethod || !coinsSpent || !accountDetails || !currency) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }
    if (coinsSpent <= 0 || !Number.isInteger(coinsSpent)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid coin amount");
    }
    const userRef = getUserRef(userId);
    const redemptionId = `red_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const redemptionRef = db.collection("redemptions").doc(redemptionId);
    return await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User not found");
        }
        const userData = userDoc.data();
        const currentBalance = userData.coinsBalance || 0;
        if (currentBalance < coinsSpent) {
            throw new functions.https.HttpsError("failed-precondition", "Insufficient coins");
        }
        const newBalance = currentBalance - coinsSpent;
        // Create redemption record
        transaction.set(redemptionRef, {
            id: redemptionId,
            userId,
            payoutMethod,
            amountCurrency,
            currency,
            coinsSpent,
            accountDetails,
            status: "pending",
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update user balance
        transaction.update(userRef, {
            coinsBalance: newBalance,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Create transaction record
        const txRef = db.collection("user_transactions").doc();
        transaction.set(txRef, {
            userId,
            type: "debit",
            amount: coinsSpent,
            reason: "redemption",
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            metadata: { redemptionId, payoutMethod },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            redemptionId,
            newBalance,
        };
    });
});
/**
 * Trusted server-side admin review of redemption requests.
 * Atomically refunds coins to the user when a redemption is rejected.
 */
export const reviewRedemption = functions.https.onCall(async (request, response) => {
    const context = request.auth;
    if (!context) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    // Admin access required
    if (context.token?.admin !== true) {
        throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }
    const { redemptionId, status, rejectionReason } = request.data;
    if (!redemptionId || !status || !["completed", "rejected"].includes(status)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid redemption decision arguments");
    }
    const redemptionRef = db.collection("redemptions").doc(redemptionId);
    return await db.runTransaction(async (transaction) => {
        const redemptionDoc = await transaction.get(redemptionRef);
        if (!redemptionDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Redemption request not found");
        }
        const redData = redemptionDoc.data();
        // Idempotency / state lock: only pending redemptions can be processed
        if (redData.status !== "pending") {
            throw new functions.https.HttpsError("failed-precondition", `Redemption has already been processed with status: ${redData.status}`);
        }
        const userId = redData.userId;
        const coinsSpent = Number(redData.coinsSpent) || 0;
        const userRef = getUserRef(userId);
        // If rejected, refund the coins back to the user atomically
        if (status === "rejected") {
            const userDoc = await transaction.get(userRef);
            if (userDoc.exists) {
                const userData = userDoc.data();
                const currentBalance = userData.coinsBalance || 0;
                const refundedBalance = currentBalance + coinsSpent;
                transaction.update(userRef, {
                    coinsBalance: refundedBalance,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                // Create transaction refund audit record
                const txRef = db.collection("user_transactions").doc();
                transaction.set(txRef, {
                    userId,
                    type: "credit",
                    amount: coinsSpent,
                    reason: "redemption_refund",
                    balanceBefore: currentBalance,
                    balanceAfter: refundedBalance,
                    metadata: {
                        redemptionId,
                        rejectedBy: context.uid,
                        rejectionReason: rejectionReason || "Redemption rejected by admin",
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        // Update redemption status
        transaction.update(redemptionRef, {
            status,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            processedBy: context.uid,
            rejectionReason: status === "rejected" ? (rejectionReason || "Admin rejected") : null,
            refunded: status === "rejected",
        });
        return {
            success: true,
            redemptionId,
            status,
            refunded: status === "rejected",
            coinsRefunded: status === "rejected" ? coinsSpent : 0,
        };
    });
});
//# sourceMappingURL=redemption.js.map