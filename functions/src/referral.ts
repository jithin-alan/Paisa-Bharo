import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";

export const applyReferralCode = functions.https.onCall(async (request, response) => {
  const context = request.auth;
  if (!context) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const { code } = request.data as { code: string };
  const userId = context.uid;

  if (!code || code.length < 5) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid referral code format");
  }

  const formattedCode = code.trim().toUpperCase();
  const userRef = getUserRef(userId);

  return await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data()!;

    // Can't use own code
    if (formattedCode === userData.referralCode) {
      throw new functions.https.HttpsError("invalid-argument", "Cannot use your own referral code");
    }

    // Already applied
    if (userData.referredBy) {
      throw new functions.https.HttpsError("already-exists", "Already applied a referral code");
    }

    // Find referrer
    const referrerQuery = await db
      .collection("users")
      .where("referralCode", "==", formattedCode)
      .limit(1)
      .get();

    if (referrerQuery.empty) {
      throw new functions.https.HttpsError("not-found", "Invalid referral code");
    }

    const referrerDoc = referrerQuery.docs[0];
    const referrerId = referrerDoc.id;

    // Can't refer yourself
    if (referrerId === userId) {
      throw new functions.https.HttpsError("invalid-argument", "Cannot refer yourself");
    }

    const bonus = 100;
    const newBalance = (userData.coinsBalance || 0) + bonus;
    const newLifetime = (userData.lifetimeEarnings || 0) + bonus;

    // Update user
    transaction.update(userRef, {
      coinsBalance: newBalance,
      lifetimeEarnings: newLifetime,
      referredBy: formattedCode,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Award referrer
    const referrerRef = getUserRef(referrerId);
    const referrerData = referrerDoc.data()!;
    const referrerNewBalance = (referrerData.coinsBalance || 0) + bonus;
    const referrerNewLifetime = (referrerData.lifetimeEarnings || 0) + bonus;

    transaction.update(referrerRef, {
      coinsBalance: referrerNewBalance,
      lifetimeEarnings: referrerNewLifetime,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create transaction records
    const txRef1 = db.collection("user_transactions").doc();
    transaction.set(txRef1, {
      userId,
      type: "credit",
      amount: bonus,
      reason: "referral_bonus",
      balanceBefore: userData.coinsBalance || 0,
      balanceAfter: newBalance,
      metadata: { referrerCode: formattedCode },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const txRef2 = db.collection("user_transactions").doc();
    transaction.set(txRef2, {
      userId: referrerId,
      type: "credit",
      amount: bonus,
      reason: "referral_reward",
      balanceBefore: referrerData.coinsBalance || 0,
      balanceAfter: referrerNewBalance,
      metadata: { referredUser: userId },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: `Code ${formattedCode} applied! +${bonus} Coins credited.`,
      newBalance,
      newLifetime,
    };
  });
});