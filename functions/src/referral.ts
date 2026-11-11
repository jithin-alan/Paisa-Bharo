import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db, getUserRef } from "./helpers";

/**
 * Referral eligibility configuration
 * Adjust these thresholds based on your fraud risk tolerance
 */
const REFERRAL_CONFIG = {
  // Minimum account age in milliseconds before a user can participate in referrals
  MIN_ACCOUNT_AGE_MS: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Minimum activity score (e.g., daily check-ins) required to refer others
  MIN_ACTIVITY_SCORE: 3,

  // Number of days between referral reward distributions (rate limiting)
  MIN_REFERRALS_PER_DAY: 5,

  // Maximum coins a referrer can earn per day from referrals
  DAILY_REFERRED_REWARD_CAP: 1000,

  // Bonus amount awarded
  REFERRAL_BONUS: 100,

  // How long a referral takes to "qualify" (time for new user to become eligible)
  QUALIFYING_WAIT_PERIOD_MS: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Calculates referral eligibility for a user
 */
async function checkReferralEligibility(
  userId: string,
  transaction: admin.firestore.Transaction
): Promise<{ eligible: boolean; reason?: string; fraudScore?: number }> {
  const userDoc = await transaction.get(getUserRef(userId));

  if (!userDoc.exists) {
    return { eligible: false, reason: "User not found" };
  }

  const userData = userDoc.data()!;
  const createdAt = userData.createdAt?.toDate?.() || userData.createdAt;
  const now = new Date();

  // Check account age
  if (createdAt && createdAt instanceof Date) {
    const accountAge = now.getTime() - createdAt.getTime();
    if (accountAge < REFERRAL_CONFIG.MIN_ACCOUNT_AGE_MS) {
      return { eligible: false, reason: "Account too new for referrals" };
    }
  }

  // Check activity score (assumes user_tasks collection exists with daily check-in tasks)
  const activityScore = userData.activityScore || userData.streakDays || 0;
  if (activityScore < REFERRAL_CONFIG.MIN_ACTIVITY_SCORE) {
    return { eligible: false, reason: "Insufficient activity to refer others" };
  }

  return { eligible: true };
}

/**
 * Detects potential fraud and returns fraud score (0-100)
 */
async function calculateFraudScore(
  userId: string,
  transaction: admin.firestore.Transaction
): Promise<number> {
  const userDoc = await transaction.get(getUserRef(userId));
  if (!userDoc.exists) return 100; // Suspicious - user not found

  const userData = userDoc.data()!;
  let score = 0;

  // Flag if too many accounts from same IP recently (needs IP tracking field)
  // Note: In production, store lastKnownIP and loginIP in user doc
  const ipCount = (userData.recentIpCount || 1);
  if (ipCount > 3) score += 30;

  // Check referral chain depth (no circular or deep chains)
  let depth = 0;
  let currentReferrer = userData.referralCode;
  while (currentReferrer && depth < 10) {
    depth++;
    const referrerQuery = await db
      .collection("users")
      .where("referralCode", "==", currentReferrer)
      .limit(1)
      .get();

    if (referrerQuery.empty) break;
    currentReferrer = referrerQuery.docs[0].data()?.referredBy;
  }

  if (depth > 5) score += 20;

  // Check for pattern of receiving rewards without qualifying action
  const referralRecordCount = userData.referralRewardsGiven || 0;
  const referralBonusCount = userData.referralBonusesClaimed || 0;

  // High ratio of referral records to bonuses may indicate farming
  if (referralRecordCount > 10 && referralBonusCount === 0) score += 25;

  // Check for duplicate IP usage across multiple devices
  const duplicateIpCount = userData.duplicateIpCount || 0;
  score += Math.min(duplicateIpCount * 10, 40);

  return Math.min(score, 100);
}

/**
 * Creates a durable one-time referral reward record
 */
async function createReferralRewardRecord(
  transaction: admin.firestore.Transaction,
  params: {
    rewardId: string;
    userId: string;
    referrerId: string;
    referralCode: string;
    amount: number;
    type: "bonus" | "referral_reward";
    status: "pending" | "completed" | "revoked";
    expiresAt?: admin.firestore.Timestamp;
  }
): Promise<void> {
  const rewardRef = db.collection("referral_rewards").doc(params.rewardId);
  transaction.set(rewardRef, {
    id: params.rewardId,
    userId: params.userId,
    referrerId: params.referrerId,
    referralCode: params.referralCode,
    amount: params.amount,
    type: params.type,
    status: params.status,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    completedAt: null,
    revokedAt: null,
    expiresAt: params.expiresAt || null,
    // Metadata for audit
    recordId: params.rewardId,
  });
}

/**
 * Verifies that the referred user will be eligible for rewards
 * (checks if reward should be issued immediately or held pending qualification)
 */
async function shouldIssueImmediateReward(
  referredUserId: string,
  transaction: admin.firestore.Transaction
): Promise<boolean> {
  const userDoc = await transaction.get(getUserRef(referredUserId));
  if (!userDoc.exists) return false;

  const userData = userDoc.data()!;
  const createdAt = userData.createdAt?.toDate?.() || userData.createdAt;
  const now = new Date();

  // Only issue immediately if account has been around long enough
  // to demonstrate legitimate use
  if (createdAt && createdAt instanceof Date) {
    const accountAge = now.getTime() - createdAt.getTime();
    return accountAge >= REFERRAL_CONFIG.QUALIFYING_WAIT_PERIOD_MS;
  }

  return false;
}

export const applyReferralCode = functions.https.onCall(async (request, response) => {
  const context = request.auth;
  if (!context) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const { code } = request.data as { code: string };
  const userId = context.uid;

  if (!code || code.length < 5) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid referral code format");
  }

  const formattedCode = code.trim().toUpperCase();
  const userRef = getUserRef(userId);

  return await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data()!;

    // Can't use own code
    if (formattedCode === userData.referralCode) {
      throw new functions.https.HttpsError("invalid-argument", "Cannot use your own referral code");
    }

    // Already applied
    if (userData.referredBy) {
      throw new functions.https.HttpsError("already-exists", "Already applied a referral code");
    }

    // Check referral eligibility (account age, activity requirements)
    const eligibility = await checkReferralEligibility(userId, transaction);
    if (!eligibility.eligible) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        eligibility.reason || "Not eligible for referrals"
      );
    }

    // Find referrer
    const referrerQuery = await db
      .collection("users")
      .where("referralCode", "==", formattedCode)
      .limit(1)
      .get();

    if (referrerQuery.empty) {
      throw new functions.https.HttpsError("not-found", "Invalid referral code");
    }

    const referrerDoc = referrerQuery.docs[0];
    const referrerId = referrerDoc.id;
    const referrerData = referrerDoc.data()!;

    // Can't refer yourself
    if (referrerId === userId) {
      throw new functions.https.HttpsError("invalid-argument", "Cannot refer yourself");
    }

    // Check referrer eligibility
    const referrerEligibility = await checkReferralEligibility(referrerId, transaction);
    if (!referrerEligibility.eligible) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        referrerEligibility.reason || "Referrer not eligible"
      );
    }

    // Calculate fraud scores
    const [userFraudScore, referrerFraudScore] = await Promise.all([
      calculateFraudScore(userId, transaction),
      calculateFraudScore(referrerId, transaction),
    ]);

    const totalFraudScore = userFraudScore + referrerFraudScore;

    // Block high-fraud-score referrals
    if (totalFraudScore > 80) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Suspicious account pattern detected. Referral blocked."
      );
    }

    // Warn on medium fraud score (log for review)
    if (totalFraudScore > 40) {
      console.warn(
        `Medium fraud score for referral ${formattedCode}: user=${userId}, referrer=${referrerId}, score=${totalFraudScore}`
      );
    }

    // Check referrer's daily referral limit
    const referrerRef = getUserRef(referrerId);
    const referrerTodayReferrals = referrerData.dailyReferralsCount || 0;
    if (referrerTodayReferrals >= REFERRAL_CONFIG.MIN_REFERRALS_PER_DAY) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Referrer has reached daily referral limit"
      );
    }

    // Check referrer's daily reward cap
    const referrerTodayRewards = referrerData.dailyReferralRewards || 0;
    if (referrerTodayRewards >= REFERRAL_CONFIG.DAILY_REFERRED_REWARD_CAP) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Referrer has reached daily referral reward cap"
      );
    }

    // Check for referral chain (prevent circular/referral rings)
    if (userData.referralHistory) {
      const referralHistory = userData.referralHistory;
      if (referralHistory.includes(referrerId)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Referral chain detected - circular referral not allowed"
        );
      }
    }

    const bonus = REFERRAL_CONFIG.REFERRAL_BONUS;
    const newBalance = (userData.coinsBalance || 0) + bonus;
    const newLifetime = (userData.lifetimeEarnings || 0) + bonus;

    // Determine if reward should be issued immediately or held pending
    const shouldIssueImmediately = await shouldIssueImmediateReward(userId, transaction);

    // Create durable referral records BEFORE issuing rewards
    // User bonus record
    await createReferralRewardRecord(transaction, {
      rewardId: `bonus_${userId}_${Date.now()}`,
      userId,
      referrerId,
      referralCode: formattedCode,
      amount: bonus,
      type: "bonus",
      status: shouldIssueImmediately ? "completed" : "pending",
    });

    // Referrer reward record
    await createReferralRewardRecord(transaction, {
      rewardId: `reward_${referrerId}_${userId}`,
      userId: referrerId,
      referrerId,
      referralCode: formattedCode,
      amount: bonus,
      type: "referral_reward",
      status: shouldIssueImmediately ? "completed" : "pending",
    });

    // Update user (new user who applied code)
    transaction.update(userRef, {
      coinsBalance: newBalance,
      lifetimeEarnings: newLifetime,
      referredBy: formattedCode,
      referralHistory: admin.firestore.FieldValue.arrayUnion(referrerId),
      referralBonusesClaimed: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Award referrer (if immediate or pending - stored in durable record)
    const referrerNewBalance = (referrerData.coinsBalance || 0) + bonus;
    const referrerNewLifetime = (referrerData.lifetimeEarnings || 0) + bonus;

    transaction.update(referrerRef, {
      coinsBalance: referrerNewBalance,
      lifetimeEarnings: referrerNewLifetime,
      dailyReferralsCount: admin.firestore.FieldValue.increment(1),
      referralRewardsGiven: admin.firestore.FieldValue.increment(1),
      dailyReferralRewards: admin.firestore.FieldValue.increment(bonus),
      referralBonusesClaimed: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create transaction records for audit trail
    const statusText = shouldIssueImmediately ? "qualified" : "pending_qualification";

    const txRef1 = db.collection("user_transactions").doc();
    transaction.set(txRef1, {
      userId,
      type: "credit",
      amount: bonus,
      reason: `referral_bonus_${statusText}`,
      balanceBefore: userData.coinsBalance || 0,
      balanceAfter: newBalance,
      metadata: {
        referrerCode: formattedCode,
        referrerId,
        fraudScore: totalFraudScore,
        status: statusText,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const txRef2 = db.collection("user_transactions").doc();
    transaction.set(txRef2, {
      userId: referrerId,
      type: "credit",
      amount: bonus,
      reason: `referral_reward_${statusText}`,
      balanceBefore: referrerData.coinsBalance || 0,
      balanceAfter: referrerNewBalance,
      metadata: {
        referredUser: userId,
        fraudScore: totalFraudScore,
        status: statusText,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: shouldIssueImmediately
        ? `Code ${formattedCode} applied! +${bonus} Coins credited.`
        : `Code ${formattedCode} applied! +${bonus} Coins awarded to referrer. Your bonus will be issued after 24 hours.`,
      newBalance,
      newLifetime,
      fraudScore: totalFraudScore,
      status: statusText,
      qualifyingRequired: !shouldIssueImmediately,
    };
  });
});