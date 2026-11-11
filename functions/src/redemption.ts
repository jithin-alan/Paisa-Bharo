import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";

export const requestRedemption = functions.https.onCall(async (request, response) => {
  const auth = request.auth;
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const { payoutMethod, amountCurrency, coinsSpent, accountDetails, currency } = request.data as {
    payoutMethod: string;
    amountCurrency: number;
    coinsSpent: number;
    accountDetails: string;
    currency: string;
  };
  const userId = auth.uid;

  if (!payoutMethod || !coinsSpent || !accountDetails || !currency) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }

  if (coinsSpent <= 0) {
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

    const userData = userDoc.data()!;
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