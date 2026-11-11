import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";
export const votePoll = functions.https.onCall(async (request, response) => {
    const context = request.auth;
    // Verify authentication
    if (!context) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { pollId, optionIndex } = request.data;
    if (!pollId || optionIndex === undefined) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }
    if (optionIndex < 0) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid option index");
    }
    const userId = context.uid;
    const userRef = getUserRef(userId);
    const pollRef = db.collection("polls").doc(pollId);
    const voteId = `${pollId}_${userId}`;
    const voteRef = db.collection("poll_votes").doc(voteId);
    return await db.runTransaction(async (transaction) => {
        // Check if user already voted
        const existingVote = await transaction.get(voteRef);
        if (existingVote.exists) {
            throw new functions.https.HttpsError("already-exists", "You have already voted in this poll");
        }
        // Get poll data
        const pollDoc = await transaction.get(pollRef);
        if (!pollDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Poll not found");
        }
        const pollData = pollDoc.data();
        // Server-side validation of poll status
        if (pollData.status && pollData.status !== 'active') {
            throw new functions.https.HttpsError("failed-precondition", "Poll is closed or inactive");
        }
        if (optionIndex >= pollData.options.length) {
            throw new functions.https.HttpsError("invalid-argument", "Invalid option index");
        }
        const rewardCoins = pollData.rewardCoins || 0;
        // Server-side validation of reward limits
        if (rewardCoins < 0 || rewardCoins > 500) {
            throw new functions.https.HttpsError("invalid-argument", "Invalid poll reward limit");
        }
        // Record the vote
        transaction.set(voteRef, {
            pollId,
            userId,
            selectedOptionIndex: optionIndex,
            earnedCoins: rewardCoins,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update poll vote count
        const updatedOptions = [...pollData.options];
        updatedOptions[optionIndex].votes = (updatedOptions[optionIndex].votes || 0) + 1;
        transaction.update(pollRef, {
            options: updatedOptions,
            totalVotes: (pollData.totalVotes || 0) + 1,
        });
        // Update user balance if reward > 0
        let newBalance = 0;
        let newLifetime = 0;
        if (rewardCoins > 0) {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new functions.https.HttpsError("not-found", "User not found");
            }
            const userData = userDoc.data();
            const currentBalance = userData.coinsBalance || 0;
            const currentLifetime = userData.lifetimeEarnings || 0;
            newBalance = currentBalance + rewardCoins;
            newLifetime = currentLifetime + rewardCoins;
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
                amount: rewardCoins,
                reason: `Poll vote: ${pollData.title}`,
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
                metadata: { pollId, optionIndex },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        return {
            success: true,
            reward: rewardCoins,
            newBalance,
            newLifetime,
        };
    });
});
//# sourceMappingURL=pollVote.js.map