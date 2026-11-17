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
exports.awardCoins = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const helpers_1 = require("./helpers");
exports.awardCoins = functions.https.onCall(async (request, response) => {
    const context = request.auth;
    // Verify admin via custom claims
    if (!context) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    // Check custom claim for admin access
    if (context.token.admin !== true) {
        throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }
    const { userId, amount, reason } = request.data;
    if (!userId || amount === undefined || !reason) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }
    // Validate integer amounts
    if (!Number.isInteger(amount)) {
        throw new functions.https.HttpsError("invalid-argument", "Amount must be a valid integer");
    }
    // Validate reason length
    if (typeof reason !== "string" || reason.trim().length === 0 || reason.length > 256) {
        throw new functions.https.HttpsError("invalid-argument", "Reason must be between 1 and 256 characters");
    }
    if (Math.abs(amount) > 10000) {
        throw new functions.https.HttpsError("invalid-argument", "Amount exceeds maximum limit of 10,000");
    }
    const userRef = (0, helpers_1.getUserRef)(userId);
    return await helpers_1.db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User not found");
        }
        const userData = userDoc.data();
        const currentBalance = userData.coinsBalance || 0;
        // Negative balance handling (cannot drop below 0)
        const newBalance = Math.max(0, currentBalance + amount);
        const newLifetime = amount > 0 ? (userData.lifetimeEarnings || 0) + amount : (userData.lifetimeEarnings || 0);
        transaction.update(userRef, {
            coinsBalance: newBalance,
            lifetimeEarnings: newLifetime,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const txRef = helpers_1.db.collection("user_transactions").doc();
        transaction.set(txRef, {
            userId,
            type: amount >= 0 ? "credit" : "debit",
            amount: Math.abs(amount),
            reason: reason.trim(),
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            metadata: { adminId: context.uid },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            newBalance,
            newLifetime,
        };
    });
});
//# sourceMappingURL=admin.js.map