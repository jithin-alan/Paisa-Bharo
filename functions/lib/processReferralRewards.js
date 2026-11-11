import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef, isAdminUser } from "./helpers";
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
                // Idempotency check: Ensure reward isn't already completed
                if (rewardData.status === 'completed') {
                    continue;
                }
                const targetUserId = rewardData.userId;
                const targetUserRef = getUserRef(targetUserId);
                const userDoc = await transaction.get(targetUserRef);
                if (!userDoc.exists) {
                    console.warn(`User ${targetUserId} not found for reward ${rewardDoc.id}`);
                    transaction.update(rewardRef, {
                        status: "revoked",
                        revokedAt: now,
                        revokeReason: "User not found",
                    });
                    errorCount++;
                    continue;
                }
                const userData = userDoc.data();
                // Award the coins to the target user of the reward record
                const currentBalance = userData.coinsBalance || 0;
                const currentLifetime = userData.lifetimeEarnings || 0;
                const newBalance = currentBalance + rewardData.amount;
                const newLifetime = currentLifetime + rewardData.amount;
                // Update user balance
                transaction.update(targetUserRef, {
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
                    userId: targetUserId,
                    type: "credit",
                    amount: rewardData.amount,
                    reason: rewardData.type === 'bonus' ? "referral_bonus_qualified" : "referral_reward_qualified",
                    balanceBefore: currentBalance,
                    balanceAfter: newBalance,
                    metadata: {
                        rewardId: rewardDoc.id,
                        referralCode: rewardData.referralCode,
                        referrerId: rewardData.referrerId,
                        processingType: "pending_qualification",
                    },
                    createdAt: now,
                });
                // If this was a referrer reward, update referrer tracking stats
                if (rewardData.type === 'referral_reward') {
                    const referrerRef = getUserRef(rewardData.referrerId);
                    transaction.update(referrerRef, {
                        referralRewardsGiven: admin.firestore.FieldValue.increment(1),
                        updatedAt: now,
                    });
                }
                processedCount++;
                console.log(`Processed reward ${rewardDoc.id} for user ${targetUserId}`);
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
    if (!isOwner && !isAdminUser(context)) {
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
//# sourceMappingURL=processReferralRewards.js.map