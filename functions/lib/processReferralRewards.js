import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";
/**
 * Referral reward processing configuration
 */
const REFERRAL_PROCESSING_CONFIG = {
    // How often to check for pending rewards (in minutes)
    CHECK_INTERVAL_MINUTES: 15,
    // How old a pending reward must be before processing
    MIN_AGE_HOURS: 24, // Must wait at least 24 hours before rewarding
};
/**
 * Cloud Function triggered periodically to process pending referral rewards
 * Awards bonuses to users who have completed the qualifying period
 */
export const processPendingReferralRewards = functions.scheduler
    .onSchedule({
    schedule: `*/${REFERRAL_PROCESSING_CONFIG.CHECK_INTERVAL_MINUTES} * * * *`,
    timeZone: "America/New_York", // Adjust to your timezone
}, async (event) => {
    console.log("Starting pending referral reward processing...", event);
    const now = admin.firestore.Timestamp.now();
    const minAge = admin.firestore.Timestamp.fromDate(new Date(Date.now() - REFERRAL_PROCESSING_CONFIG.MIN_AGE_HOURS * 60 * 60 * 1000));
    // Find pending referral rewards that are ready to be completed
    const pendingRewardsSnapshot = await db
        .collection("referral_rewards")
        .where("status", "==", "pending")
        .where("createdAt", "<", minAge)
        .limit(500) // Process in batches
        .get();
    if (pendingRewardsSnapshot.empty) {
        console.log("No pending rewards to process.");
        return;
    }
    let processedCount = 0;
    let errorCount = 0;
    await db.runTransaction(async (transaction) => {
        for (const rewardDoc of pendingRewardsSnapshot.docs) {
            const rewardData = rewardDoc.data();
            const rewardRef = rewardDoc.ref;
            try {
                // Verify the user still exists and hasn't already received the reward
                const userRef = rewardData.userId;
                const userDoc = await transaction.get(getUserRef(userRef));
                if (!userDoc.exists) {
                    console.warn(`User ${userRef} not found for reward ${rewardData.rewardId}`);
                    // Mark as revoked since user doesn't exist
                    transaction.update(rewardRef, {
                        status: "revoked",
                        revokedAt: now,
                        revokeReason: "User not found",
                    });
                    errorCount++;
                    continue;
                }
                const userData = userDoc.data();
                // Check if user already has this referral recorded (prevent double reward)
                const alreadyReferredBy = userData.referredBy;
                const referralCode = rewardData.referralCode;
                if (alreadyReferredBy && alreadyReferredBy !== referralCode) {
                    console.warn(`User ${userRef} already has different referral: ${alreadyReferredBy}`);
                    transaction.update(rewardRef, {
                        status: "revoked",
                        revokedAt: now,
                        revokeReason: "User has different referral",
                    });
                    errorCount++;
                    continue;
                }
                // Award the coins to the user
                const currentBalance = userData.coinsBalance || 0;
                const currentLifetime = userData.lifetimeEarnings || 0;
                const newBalance = currentBalance + rewardData.amount;
                const newLifetime = currentLifetime + rewardData.amount;
                // Update user balance
                transaction.update(getUserRef(userRef), {
                    coinsBalance: newBalance,
                    lifetimeEarnings: newLifetime,
                    updatedAt: now,
                });
                // Update the referral reward status to completed
                transaction.update(rewardRef, {
                    status: "completed",
                    completedAt: now,
                });
                // Create a transaction record for the reward
                const txRef = db.collection("user_transactions").doc();
                transaction.set(txRef, {
                    userId: rewardData.userId,
                    type: "credit",
                    amount: rewardData.amount,
                    reason: "referral_bonus_qualified",
                    balanceBefore: currentBalance,
                    balanceAfter: newBalance,
                    metadata: {
                        rewardId: rewardData.rewardId,
                        referralCode: rewardData.referralCode,
                        referrerId: rewardData.referrerId,
                        processingType: "pending_qualification",
                    },
                    createdAt: now,
                });
                // Update referrer's tracking (they've now given out a qualified reward)
                const referrerRef = getUserRef(rewardData.referrerId);
                const referrerDoc = await transaction.get(referrerRef);
                if (referrerDoc.exists) {
                    const referrerData = referrerDoc.data();
                    transaction.update(referrerRef, {
                        referralRewardsGiven: admin.firestore.FieldValue.increment(1),
                        updatedAt: now,
                    });
                    // Ensure referrer gets credit for referral bonus if not already credited
                    // (This handles the case where initial reward was pending for user)
                    const referrerNewBalance = (referrerData.coinsBalance || 0) + rewardData.amount;
                    const referrerNewLifetime = (referrerData.lifetimeEarnings || 0) + rewardData.amount;
                    transaction.update(referrerRef, {
                        coinsBalance: referrerNewBalance,
                        lifetimeEarnings: referrerNewLifetime,
                    });
                    // Create transaction record for referrer
                    const referrerTxRef = db.collection("user_transactions").doc();
                    transaction.set(referrerTxRef, {
                        userId: rewardData.referrerId,
                        type: "credit",
                        amount: rewardData.amount,
                        reason: "referral_reward_qualified",
                        balanceBefore: referrerData.coinsBalance || 0,
                        balanceAfter: referrerNewBalance,
                        metadata: {
                            rewardId: rewardData.rewardId,
                            referredUserId: rewardData.userId,
                            processingType: "pending_qualification",
                        },
                        createdAt: now,
                    });
                }
                processedCount++;
                console.log(`Processed reward ${rewardData.rewardId} for user ${rewardData.userId}`);
            }
            catch (error) {
                console.error(`Error processing reward ${rewardDoc.id}:`, error);
                errorCount++;
                // Mark as revoked to avoid reprocessing
                transaction.update(rewardRef, {
                    status: "revoked",
                    revokedAt: now,
                    revokeReason: "Processing error",
                });
            }
        }
    });
    const message = `Processed ${processedCount} pending referral rewards with ${errorCount} errors.`;
    console.log(message);
    return;
});
/**
 * Manual API endpoint to process a specific pending referral reward
 * Useful for admin tools or retry mechanisms
 */
export const processReferralReward = functions.https.onCall(async (request, response) => {
    const context = request.auth;
    if (!context) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { rewardId } = request.data;
    if (!rewardId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing rewardId");
    }
    const now = admin.firestore.Timestamp.now();
    const rewardRef = db.collection("referral_rewards").doc(rewardId);
    const rewardSnap = await rewardRef.get();
    if (!rewardSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Reward not found");
    }
    const rewardData = rewardSnap.data();
    if (rewardData.status !== "pending") {
        throw new functions.https.HttpsError("failed-precondition", `Reward is in ${rewardData.status} status, cannot process`);
    }
    // Verify admin access or owner access
    const isOwner = rewardData.userId === context.uid || rewardData.referrerId === context.uid;
    if (!isOwner && !(await isAdminUser(context.uid))) {
        throw new functions.https.HttpsError("permission-denied", "Not authorized to process this reward");
    }
    await db.runTransaction(async (transaction) => {
        const userRef = getUserRef(rewardData.userId);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User not found");
        }
        const userData = userDoc.data();
        const currentBalance = userData.coinsBalance || 0;
        const currentLifetime = userData.lifetimeEarnings || 0;
        const newBalance = currentBalance + rewardData.amount;
        const newLifetime = currentLifetime + rewardData.amount;
        transaction.update(userRef, {
            coinsBalance: newBalance,
            lifetimeEarnings: newLifetime,
            updatedAt: now,
        });
        transaction.update(rewardRef, {
            status: "completed",
            completedAt: now,
        });
        // Also award to referrer
        const referrerRef = getUserRef(rewardData.referrerId);
        const referrerDoc = await transaction.get(referrerRef);
        if (referrerDoc.exists) {
            const referrerData = referrerDoc.data();
            const referrerNewBalance = (referrerData.coinsBalance || 0) + rewardData.amount;
            const referrerNewLifetime = (referrerData.lifetimeEarnings || 0) + rewardData.amount;
            transaction.update(referrerRef, {
                coinsBalance: referrerNewBalance,
                lifetimeEarnings: referrerNewLifetime,
                updatedAt: now,
            });
        }
        // Transaction record
        const txRef = db.collection("user_transactions").doc();
        transaction.set(txRef, {
            userId: rewardData.userId,
            type: "credit",
            amount: rewardData.amount,
            reason: "referral_bonus_manual_process",
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            metadata: {
                rewardId,
                processedBy: context.uid,
            },
            createdAt: now,
        });
    });
    return { success: true, message: "Reward processed successfully" };
});
/**
 * Helper to check if user is admin
 */
async function isAdminUser(userId) {
    const adminDoc = await db.collection("admins").doc(userId).get();
    return adminDoc.exists;
}
//# sourceMappingURL=processReferralRewards.js.map