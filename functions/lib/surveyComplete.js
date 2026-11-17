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
exports.completeSurvey = exports.requestSurveyVerification = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const helpers_1 = require("./helpers");
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
    const tokenRef = helpers_1.db.collection("survey_tokens").doc(tokenId);
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
    const tokenRef = helpers_1.db.collection("survey_tokens").doc(tokenId);
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
exports.requestSurveyVerification = functions.https.onCall(async (request, response) => {
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
    const surveyRef = helpers_1.db.collection("surveys").doc(surveyId);
    const surveySnap = await surveyRef.get();
    if (!surveySnap.exists) {
        throw new functions.https.HttpsError("not-found", "Survey not found");
    }
    const surveyData = surveySnap.data();
    if (surveyData.status !== 'active') {
        throw new functions.https.HttpsError("failed-precondition", "Survey is not currently active");
    }
    // Check if already completed
    const taskRef = helpers_1.db.collection("user_tasks").doc(`${surveyId}_${userId}`);
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
exports.completeSurvey = functions.https.onCall(async (request, response) => {
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
    const surveyRef = helpers_1.db.collection("surveys").doc(surveyId);
    const taskRef = helpers_1.db.collection("user_tasks").doc(`${surveyId}_${userId}`);
    const userRef = (0, helpers_1.getUserRef)(userId);
    const tokenRef = helpers_1.db.collection("survey_tokens").doc(`sv_${surveyId}_${userId}`);
    return await helpers_1.db.runTransaction(async (transaction) => {
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
        const txRef = helpers_1.db.collection("user_transactions").doc();
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