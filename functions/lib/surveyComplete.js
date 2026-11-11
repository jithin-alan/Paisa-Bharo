import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";
/**
 * Environment flag - set to true for development/testing to allow
 * client-invoked survey completion. Set to false for production.
 */
const DEV_MODE = process.env.SURVEY_DEV_MODE === 'true' ||
    process.env.NODE_ENV !== 'production';
/**
 * Server-only function to start a survey completion verification.
 * This generates a token record in Firestore that must be verified
 * by a provider callback before coins can be awarded.
 */
async function generateVerificationToken(surveyId, userId) {
    const tokenId = `sv_${surveyId}_${userId}`;
    const tokenRef = db.collection("survey_tokens").doc(tokenId);
    // Store the pending verification
    await tokenRef.set({
        userId,
        surveyId,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return tokenId;
}
/**
 * Verifies that a survey completion record exists and is marked as 'verified'
 * by a provider callback.
 */
async function verifyToken(surveyId, userId) {
    const tokenId = `sv_${surveyId}_${userId}`;
    const tokenRef = db.collection("survey_tokens").doc(tokenId);
    const tokenDoc = await tokenRef.get();
    if (!tokenDoc.exists)
        return false;
    const data = tokenDoc.data();
    return data?.status === 'verified';
}
/**
 * HTTPS callable to request survey completion verification token.
 * Only available in dev mode or when called through an authenticated flow.
 */
export const requestSurveyVerification = functions.https.onCall(async (request, response) => {
    const context = request.auth;
    if (!context) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { surveyId } = request.data;
    const userId = context.uid;
    if (!surveyId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing surveyId");
    }
    // Check if survey exists
    const surveyRef = db.collection("surveys").doc(surveyId);
    const surveySnap = await surveyRef.get();
    if (!surveySnap.exists) {
        throw new functions.https.HttpsError("not-found", "Survey not found");
    }
    const surveyData = surveySnap.data();
    if (surveyData.status !== 'active') {
        throw new functions.https.HttpsError("failed-precondition", "Survey is not currently active");
    }
    // Check if already completed
    const taskRef = db.collection("user_tasks").doc(`${surveyId}_${userId}`);
    const existingTask = await taskRef.get();
    if (existingTask.exists && existingTask.data()?.status === "completed") {
        throw new functions.https.HttpsError("already-exists", "Survey already completed");
    }
    // Generate verification token
    const token = await generateVerificationToken(surveyId, userId);
    return {
        success: true,
        token,
        expiresAt: Date.now() + 10 * 60 * 1000,
    };
});
/**
 * Complete survey - awards coins after verification.
 *
 * SECURITY: In production mode, this function requires a valid verification token
 * obtained from requestSurveyVerification. This prevents direct client calls with
 * arbitrary coin amounts.
 *
 * For development/testing (DEV_MODE=true), token verification is bypassed.
 */
export const completeSurvey = functions.https.onCall(async (request, response) => {
    const context = request.auth;
    if (!context) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { surveyId, answers, verificationToken } = request.data;
    const userId = context.uid;
    if (!surveyId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing surveyId");
    }
    // SECURITY: In production, require verification token
    if (!DEV_MODE) {
        if (!await verifyToken(surveyId, userId)) {
            throw new functions.https.HttpsError("failed-precondition", "Survey not verified by provider. Complete survey through provider link first.");
        }
    }
    const surveyRef = db.collection("surveys").doc(surveyId);
    const taskRef = db.collection("user_tasks").doc(`${surveyId}_${userId}`);
    const userRef = getUserRef(userId);
    const tokenRef = db.collection("survey_tokens").doc(`sv_${surveyId}_${userId}`);
    return await db.runTransaction(async (transaction) => {
        const surveyDoc = await transaction.get(surveyRef);
        if (!surveyDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Survey not found");
        }
        const surveyData = surveyDoc.data();
        // Check if already completed - prevents duplicate rewards
        const existingTask = await transaction.get(taskRef);
        if (existingTask.exists && existingTask.data()?.status === "completed") {
            throw new functions.https.HttpsError("already-exists", "Survey already completed");
        }
        const reward = surveyData.rewardCoins || 0;
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.data();
        const newBalance = (userData.coinsBalance || 0) + reward;
        const newLifetime = (userData.lifetimeEarnings || 0) + reward;
        // Record completion with answers for audit trail
        transaction.set(taskRef, {
            id: `${surveyId}_${userId}`,
            userId,
            offerId: surveyId,
            status: "completed",
            rewardCoins: reward,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            answers: answers || {},
        });
        // Mark token as completed
        transaction.update(tokenRef, {
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update user balance atomically
        transaction.update(userRef, {
            coinsBalance: newBalance,
            lifetimeEarnings: newLifetime,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Create transaction record for audit trail
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
//# sourceMappingURL=surveyComplete.js.map