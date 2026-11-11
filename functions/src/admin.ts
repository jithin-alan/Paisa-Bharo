import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";

interface AwardCoinsData {
  userId: string;
  amount: number;
  reason: string;
}

interface AwardCoinsResult {
  success: boolean;
  newBalance: number;
  newLifetime: number;
}

export const awardCoins = functions.https.onCall(async (request, response): Promise<AwardCoinsResult> => {
  const context = request.auth;
  // Verify admin via custom claims
  if (!context) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  // Check custom claim for admin access
  if (context.token.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Admin access required");
  }

  const { userId, amount, reason } = request.data as AwardCoinsData;

  if (!userId || amount === undefined || !reason) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }

  if (Math.abs(amount) > 10000) {
    throw new functions.https.HttpsError("invalid-argument", "Amount exceeds maximum");
  }

  const userRef = getUserRef(userId);

  return await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data()!;
    const currentBalance = userData.coinsBalance || 0;
    const newBalance = Math.max(0, currentBalance + amount);
    const newLifetime = amount > 0 ? (userData.lifetimeEarnings || 0) + amount : (userData.lifetimeEarnings || 0);

    transaction.update(userRef, {
      coinsBalance: newBalance,
      lifetimeEarnings: newLifetime,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const txRef = db.collection("user_transactions").doc();
    transaction.set(txRef, {
      userId,
      type: amount >= 0 ? "credit" : "debit",
      amount: Math.abs(amount),
      reason,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      metadata: { adminId: context.uid },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      newBalance,
      newLifetime,
    };
  });
});