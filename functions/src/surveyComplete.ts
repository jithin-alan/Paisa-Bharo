import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";

export const completeSurvey = functions.https.onCall(async (request, response) => {
  const context = request.auth;
  if (!context) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const { surveyId, answers } = request.data as { surveyId: string; answers: Record<string, any> };
  const userId = context.uid;

  if (!surveyId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing surveyId");
  }

  const surveyRef = db.collection("surveys").doc(surveyId);
  const taskRef = db.collection("user_tasks").doc(`${surveyId}_${userId}`);
  const userRef = getUserRef(userId);

  return await db.runTransaction(async (transaction) => {
    const surveyDoc = await transaction.get(surveyRef);
    if (!surveyDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Survey not found");
    }

    const surveyData = surveyDoc.data()!;

    // Check if already completed
    const existingTask = await transaction.get(taskRef);
    if (existingTask.exists && existingTask.data()?.status === "completed") {
      throw new functions.https.HttpsError("already-exists", "Survey already completed");
    }

    const reward = surveyData.rewardCoins || 0;
    const userDoc = await transaction.get(userRef);
    const userData = userDoc.data()!;

    const newBalance = (userData.coinsBalance || 0) + reward;
    const newLifetime = (userData.lifetimeEarnings || 0) + reward;

    // Record completion
    transaction.set(taskRef, {
      id: `${surveyId}_${userId}`,
      userId,
      offerId: surveyId,
      status: "completed",
      rewardCoins: reward,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      answers: answers || {},
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
      amount: reward,
      reason: "survey_complete",
      balanceBefore: userData.coinsBalance || 0,
      balanceAfter: newBalance,
      metadata: { surveyId },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      reward,
      newBalance,
      newLifetime,
    };
  });
});