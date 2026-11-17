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
exports.claimDailyCheckIn = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const helpers_1 = require("./helpers");
exports.claimDailyCheckIn = functions.https.onCall(async (request, response) => {
    const context = request.auth;
    if (!context) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const userId = context.uid;
    const userRef = (0, helpers_1.getUserRef)(userId);
    return await helpers_1.db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User not found");
        }
        const userData = userDoc.data();
        const requestData = (request.data || {});
        // Resolve user's timezone consistently
        const userTimezone = (0, helpers_1.resolveTimezone)(requestData.timezone, userData.timezone, userData.country);
        // Get current calendar date in user's timezone (YYYY-MM-DD)
        const today = (0, helpers_1.getDateInTimezone)(new Date(), userTimezone);
        const lastCheckIn = userData.lastCheckInDate;
        const currentStreak = userData.streakDays || 0;
        let newStreak = 1;
        if (lastCheckIn) {
            const diffDays = (0, helpers_1.getDaysDifference)(lastCheckIn, today);
            if (diffDays <= 0) {
                throw new functions.https.HttpsError("already-exists", `Already claimed daily bonus today (${today}) in timezone ${userTimezone}`);
            }
            else if (diffDays === 1) {
                // Consecutive check-in day: increment streak
                newStreak = currentStreak + 1;
            }
            else {
                // Missed one or more days: reset streak to 1
                newStreak = 1;
            }
        }
        else {
            // First check-in
            newStreak = 1;
        }
        // 7-day bonus reward cycle:
        // Day 1: 20, Day 2: 30, Day 3: 45, Day 4: 60, Day 5: 80, Day 6: 100, Day 7: 150
        const rewardsMap = [0, 20, 30, 45, 60, 80, 100, 150];
        const cycleDay = ((newStreak - 1) % 7) + 1;
        const bonus = rewardsMap[cycleDay] || 50;
        const newBalance = (userData.coinsBalance || 0) + bonus;
        const newLifetime = (userData.lifetimeEarnings || 0) + bonus;
        transaction.update(userRef, {
            coinsBalance: newBalance,
            lifetimeEarnings: newLifetime,
            streakDays: newStreak,
            lastCheckInDate: today,
            timezone: userTimezone,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Create transaction record
        const txRef = helpers_1.db.collection("user_transactions").doc();
        transaction.set(txRef, {
            userId,
            type: "credit",
            amount: bonus,
            reason: "daily_checkin",
            balanceBefore: userData.coinsBalance || 0,
            balanceAfter: newBalance,
            metadata: {
                streak: newStreak,
                cycleDay,
                checkInDate: today,
                timezone: userTimezone,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            bonus,
            newBalance,
            newLifetime,
            streak: newStreak,
            cycleDay,
            lastCheckInDate: today,
            timezone: userTimezone,
        };
    });
});
//# sourceMappingURL=dailyCheckin.js.map