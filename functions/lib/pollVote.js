"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.votePoll = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const helpers_1 = require("./helpers");
exports.votePoll = functions.https.onCall(async (request, response) => {
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
    const userRef = (0, helpers_1.getUserRef)(userId);
    const pollRef = helpers_1.db.collection("polls").doc(pollId);
    const voteId = `${pollId}_${userId}`;
    const voteRef = helpers_1.db.collection("poll_votes").doc(voteId);
    return await helpers_1.db.runTransaction(async (transaction) => {
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
            const txRef = helpers_1.db.collection("user_transactions").doc();
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