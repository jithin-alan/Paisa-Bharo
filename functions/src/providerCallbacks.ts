import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";

/**
 * Provider callback processor that:
 * 1. Records every provider transaction in Firestore for duplicate prevention
 * 2. Credits the wallet atomically in the same Firestore transaction
 * 3. Works across multiple server instances (not in-memory)
 */

interface ProviderCallbackInput {
  provider: 'adgem' | 'bitlabs' | 'cint' | 'affiliate';
  transactionId: string;
  userId: string;
  coinsAwarded: number;
  reason: string;
  metadata?: Record<string, any>;
}

interface ProviderCallbackResult {
  success: boolean;
  status: 'credited' | 'duplicate' | 'invalid_signature' | 'error';
  message: string;
  transactionId: string;
  userId: string;
  coinsAwarded: number;
  newBalance?: number;
}

/**
 * Processes a provider callback with atomic Firestore wallet transaction.
 * Uses Firestore transaction to prevent duplicate processing across instances.
 */
export async function processProviderCallback(
  input: ProviderCallbackInput
): Promise<ProviderCallbackResult> {
  const { provider, transactionId, userId, coinsAwarded, reason, metadata = {} } = input;

  if (!userId) {
    return {
      success: false,
      status: 'invalid_signature' as const,
      message: `Missing userId in ${provider} callback.`,
      transactionId,
      userId: '',
      coinsAwarded: 0,
    };
  }

  if (coinsAwarded <= 0) {
    return {
      success: false,
      status: 'invalid_signature' as const,
      message: `Invalid coinsAwarded value (${coinsAwarded}) in ${provider} callback.`,
      transactionId,
      userId,
      coinsAwarded: 0,
    };
  }

  // Use a single Firestore transaction to atomically:
  // 1. Check for duplicate transaction
  // 2. Record the transaction
  // 3. Credit the wallet
  try {
    const result = await db.runTransaction(async (transaction) => {
      const txRef = db.collection("provider_transactions").doc(`${provider}_${transactionId}`);
      const txDoc = await transaction.get(txRef);

      if (txDoc.exists) {
        const existing = txDoc.data()!;
        return {
          success: false,
          status: 'duplicate' as const,
          message: `Transaction ${transactionId} from ${provider} has already been credited.`,
          transactionId,
          userId,
          coinsAwarded: 0,
        };
      }

      // Record the transaction first (before crediting wallet)
      transaction.set(txRef, {
        provider,
        transactionId,
        userId,
        coinsAwarded,
        reason,
        metadata,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Credit the wallet atomically
      const walletResult = await updateUserCoinsInTransaction(
        userId,
        coinsAwarded,
        reason,
        metadata,
        transaction
      );

      return {
        success: true,
        status: 'credited' as const,
        message: `${provider} callback processed. +${coinsAwarded} coins credited to user ${userId}.`,
        transactionId,
        userId,
        coinsAwarded,
        newBalance: walletResult.newBalance,
      };
    });

    return result;
  } catch (error: any) {
    console.error(`[ProviderCallback] Error processing ${provider} callback:`, error);
    return {
      success: false,
      status: 'error' as const,
      message: error.message || `Failed to process ${provider} callback.`,
      transactionId,
      userId,
      coinsAwarded: 0,
    };
  }
}

/**
 * Atomically updates user coins within an existing Firestore transaction.
 * This ensures the wallet update and transaction record are atomic.
 */
async function updateUserCoinsInTransaction(
  userId: string,
  coinDelta: number,
  reason: string,
  metadata: Record<string, any>,
  transaction: admin.firestore.Transaction
): Promise<{ newBalance: number; newLifetime: number }> {
  const userRef = getUserRef(userId);
  const userDoc = await transaction.get(userRef);

  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", `User ${userId} not found`);
  }

  const userData = userDoc.data()!;
  const currentBalance = userData.coinsBalance || 0;
  const currentLifetime = userData.lifetimeEarnings || 0;

  const newBalance = Math.max(0, currentBalance + coinDelta);
  const newLifetime = coinDelta > 0 ? currentLifetime + coinDelta : currentLifetime;

  // Validate the change is reasonable
  if (coinDelta > 10000) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Coin delta (${coinDelta}) exceeds maximum allowed`
    );
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
}