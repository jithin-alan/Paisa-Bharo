import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";

// Scratch card reward table — server decides the outcome, never the client.
// Weighted distribution: small wins common, big wins rare.
const SCRATCH_REWARDS = [10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500];
const SCRATCH_WEIGHTS = [18, 16, 14, 12, 10, 8, 6, 5, 4, 3, 2, 1, 1];

/**
 * Deterministic server-side reward selection.
 * Seeded by userId + date so the result is stable per user per day
 * (a user cannot re-roll by retrying), yet unpredictable in advance.
 */
function generateScratchReward(userId: string, dateStr: string): number {
  // FNV-1a hash over the seed string
  let hash = 2166136261;
  const seed = `${userId}_${dateStr}`;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Map hash onto the weighted reward table
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

  // SECURITY: The client must NOT decide the reward. The server generates it.
  const userId = context.uid;
  const today = new Date().toISOString().split("T")[0];
  const scratchKey = `scratch_${userId}_${today}`;
  const scratchRef = db.collection("scratch_cards").doc(scratchKey);

  // Server-side deterministic reward generation
  const coins = generateScratchReward(userId, today);

  const userRef = getUserRef(userId);

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

    const userData = userDoc.data()!;
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