import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";

export const claimDailyCheckIn = functions.https.onCall(async (request, response) => {
  const context = request.auth;
  if (!context) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const userId = context.uid;
  const today = new Date().toISOString().split("T")[0];

  const userRef = getUserRef(userId);

  return await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data()!;
    const lastCheckIn = userData.lastCheckInDate;

    if (lastCheckIn === today) {
      throw new functions.https.HttpsError(
        "already-exists",
        "Already claimed today"
      );
    }

    const currentStreak = userData.streakDays || 0;
    const newStreak = currentStreak >= 7 ? 1 : currentStreak + 1;

    // Reward map: Day 1: 20, Day 2: 30, Day 3: 45, Day 4: 60, Day 5: 80, Day 6: 100, Day 7: 150
    const rewardsMap = [0, 20, 30, 45, 60, 80, 100, 150];
    const bonus = rewardsMap[newStreak] || 50;

    const newBalance = (userData.coinsBalance || 0) + bonus;
    const newLifetime = (userData.lifetimeEarnings || 0) + bonus;

    transaction.update(userRef, {
      coinsBalance: newBalance,
      lifetimeEarnings: newLifetime,
      streakDays: newStreak,
      lastCheckInDate: today,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create transaction record
    const txRef = db.collection("user_transactions").doc();
    transaction.set(txRef, {
      userId,
      type: "credit",
      amount: bonus,
      reason: "daily_checkin",
      balanceBefore: userData.coinsBalance || 0,
      balanceAfter: newBalance,
      metadata: { streak: newStreak },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      bonus,
      newBalance,
      newLifetime,
      streak: newStreak,
    };
  });
});