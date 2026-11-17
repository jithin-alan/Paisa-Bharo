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
exports.updateUserCoins = updateUserCoins;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const helpers_1 = require("./helpers");
/**
 * Helper to atomically update user coins with validation
 */
async function updateUserCoins(userId, coinDelta, reason, metadata = {}) {
    const userRef = (0, helpers_1.getUserRef)(userId);
    return await helpers_1.db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User not found");
        }
        const userData = userDoc.data();
        const currentBalance = userData.coinsBalance || 0;
        const currentLifetime = userData.lifetimeEarnings || 0;
        const newBalance = Math.max(0, currentBalance + coinDelta);
        const newLifetime = coinDelta > 0 ? currentLifetime + coinDelta : currentLifetime;
        // Validate the change is reasonable
        if (coinDelta > 10000) {
            throw new functions.https.HttpsError("invalid-argument", "Coin delta exceeds maximum allowed");
        }
        transaction.update(userRef, {
            coinsBalance: newBalance,
            lifetimeEarnings: newLifetime,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Create transaction record
        const txRef = helpers_1.db.collection("user_transactions").doc();
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
    });
}
//# sourceMappingURL=wallet.js.map