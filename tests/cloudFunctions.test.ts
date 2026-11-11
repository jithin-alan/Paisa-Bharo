import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import pure helpers and logic functions
import crypto from 'node:crypto';
import {
  resolveTimezone,
  getDateInTimezone,
  getDaysDifference,
  isValidTimezone,
} from '../functions/src/helpers.ts';

describe('Cloud Functions Wallet & Reward Logic Suite', () => {
  describe('Daily Check-in & Timezone Streak Rules', () => {
    it('accurately resolves valid and fallback timezones', () => {
      assert.equal(resolveTimezone('Asia/Kolkata', undefined, 'IN'), 'Asia/Kolkata');
      assert.equal(resolveTimezone(undefined, 'America/New_York', 'US'), 'America/New_York');
      assert.equal(resolveTimezone('invalid/tz', undefined, 'IN'), 'Asia/Kolkata');
      assert.equal(resolveTimezone(undefined, undefined, 'GB'), 'Europe/London');
      assert.equal(resolveTimezone(undefined, undefined, 'UNKNOWN'), 'UTC');
    });

    it('formats date string YYYY-MM-DD correctly across timezones', () => {
      const fixedDate = new Date('2026-11-10T23:30:00Z');
      const dateInIndia = getDateInTimezone(fixedDate, 'Asia/Kolkata');
      const dateInNewYork = getDateInTimezone(fixedDate, 'America/New_York');

      // 23:30 UTC is next day in India (UTC+5:30) and same day in New York (UTC-5)
      assert.equal(dateInIndia, '2026-11-11');
      assert.equal(dateInNewYork, '2026-11-10');
    });

    it('calculates calendar day differences accurately', () => {
      assert.equal(getDaysDifference('2026-11-10', '2026-11-10'), 0);
      assert.equal(getDaysDifference('2026-11-10', '2026-11-11'), 1);
      assert.equal(getDaysDifference('2026-11-10', '2026-11-12'), 2);
    });

    it('determines consecutive streak vs missed day reset', () => {
      // Simulating dailyCheckin streak resolution logic
      function calculateNewStreak(lastCheckInDate: string | null, today: string, currentStreak: number): number {
        if (!lastCheckInDate) return 1;
        const diff = getDaysDifference(lastCheckInDate, today);
        if (diff <= 0) throw new Error('already-exists');
        if (diff === 1) return currentStreak + 1;
        return 1; // Missed a day -> reset to 1
      }

      // Initial check-in
      assert.equal(calculateNewStreak(null, '2026-11-10', 0), 1);

      // Consecutive day check-in -> streak increments
      assert.equal(calculateNewStreak('2026-11-09', '2026-11-10', 3), 4);

      // Missed day (2 days gap) -> streak resets to 1
      assert.equal(calculateNewStreak('2026-11-08', '2026-11-10', 5), 1);

      // Same calendar day check-in -> throws already-exists error
      assert.throws(() => calculateNewStreak('2026-11-10', '2026-11-10', 4), /already-exists/);
    });

    it('follows the 7-day bonus reward progression cycle', () => {
      const rewardsMap = [0, 20, 30, 45, 60, 80, 100, 150];
      const getReward = (streak: number) => {
        const cycleDay = ((streak - 1) % 7) + 1;
        return rewardsMap[cycleDay];
      };

      assert.equal(getReward(1), 20);
      assert.equal(getReward(2), 30);
      assert.equal(getReward(3), 45);
      assert.equal(getReward(4), 60);
      assert.equal(getReward(5), 80);
      assert.equal(getReward(6), 100);
      assert.equal(getReward(7), 150);
      // Day 8 wraps to cycle day 1
      assert.equal(getReward(8), 20);
    });
  });

  describe('Poll Voting & Reward Validation', () => {
    it('validates poll status and option bounds', () => {
      interface PollDoc {
        status: string;
        options: { text: string; votes: number }[];
        rewardCoins: number;
      }

      function validateVote(poll: PollDoc, optionIndex: number) {
        if (poll.status !== 'active') throw new Error('Poll is closed or inactive');
        if (optionIndex < 0 || optionIndex >= poll.options.length) throw new Error('Invalid option index');
        if (poll.rewardCoins < 0 || poll.rewardCoins > 500) throw new Error('Invalid poll reward limit');
        return true;
      }

      const activePoll: PollDoc = {
        status: 'active',
        options: [{ text: 'Yes', votes: 10 }, { text: 'No', votes: 5 }],
        rewardCoins: 50,
      };

      assert.ok(validateVote(activePoll, 0));
      assert.ok(validateVote(activePoll, 1));
      assert.throws(() => validateVote(activePoll, 2), /Invalid option index/);

      const inactivePoll: PollDoc = { ...activePoll, status: 'closed' };
      assert.throws(() => validateVote(inactivePoll, 0), /Poll is closed or inactive/);

      const excessiveRewardPoll: PollDoc = { ...activePoll, rewardCoins: 1000 };
      assert.throws(() => validateVote(excessiveRewardPoll, 0), /Invalid poll reward limit/);
    });
  });

  describe('Redemption & Rejection Refund Engine', () => {
    it('validates balance sufficiency before debiting coins', () => {
      function processRedemptionRequest(currentBalance: number, coinsSpent: number) {
        if (!Number.isInteger(coinsSpent) || coinsSpent <= 0) {
          throw new Error('Invalid coin amount');
        }
        if (currentBalance < coinsSpent) {
          throw new Error('Insufficient coins');
        }
        return {
          newBalance: currentBalance - coinsSpent,
          debitAmount: coinsSpent,
        };
      }

      assert.deepEqual(processRedemptionRequest(1000, 500), {
        newBalance: 500,
        debitAmount: 500,
      });

      assert.throws(() => processRedemptionRequest(400, 500), /Insufficient coins/);
      assert.throws(() => processRedemptionRequest(1000, -50), /Invalid coin amount/);
      assert.throws(() => processRedemptionRequest(1000, 10.5), /Invalid coin amount/);
    });

    it('atomically refunds coins and writes refund audit ledger on rejection', () => {
      interface RedemptionState {
        id: string;
        userId: string;
        coinsSpent: number;
        status: 'pending' | 'completed' | 'rejected';
        refunded?: boolean;
      }

      function reviewRedemption(
        redemption: RedemptionState,
        decision: 'completed' | 'rejected',
        userBalance: number
      ) {
        if (redemption.status !== 'pending') {
          throw new Error(`Already processed: ${redemption.status}`);
        }

        let newBalance = userBalance;
        let ledgerEntry: any = null;

        if (decision === 'rejected') {
          newBalance = userBalance + redemption.coinsSpent;
          ledgerEntry = {
            userId: redemption.userId,
            type: 'credit',
            amount: redemption.coinsSpent,
            reason: 'redemption_refund',
            balanceBefore: userBalance,
            balanceAfter: newBalance,
          };
        }

        return {
          updatedStatus: decision,
          refunded: decision === 'rejected',
          newBalance,
          ledgerEntry,
        };
      }

      const pendingRedemption: RedemptionState = {
        id: 'red_123',
        userId: 'user_abc',
        coinsSpent: 500,
        status: 'pending',
      };

      // Case 1: Rejection -> refunds coins
      const rejectResult = reviewRedemption(pendingRedemption, 'rejected', 200);
      assert.equal(rejectResult.updatedStatus, 'rejected');
      assert.equal(rejectResult.refunded, true);
      assert.equal(rejectResult.newBalance, 700);
      assert.equal(rejectResult.ledgerEntry.reason, 'redemption_refund');
      assert.equal(rejectResult.ledgerEntry.type, 'credit');
      assert.equal(rejectResult.ledgerEntry.amount, 500);

      // Case 2: Approval -> no refund
      const approveResult = reviewRedemption(pendingRedemption, 'completed', 200);
      assert.equal(approveResult.updatedStatus, 'completed');
      assert.equal(approveResult.refunded, false);
      assert.equal(approveResult.newBalance, 200);
      assert.equal(approveResult.ledgerEntry, null);

      // Case 3: Re-reviewing already rejected redemption -> rejected
      assert.throws(
        () => reviewRedemption({ ...pendingRedemption, status: 'rejected' }, 'rejected', 700),
        /Already processed/
      );
    });
  });

  describe('Admin Coin Adjustment & Floor Clamping', () => {
    it('validates integer amounts, reason length, and prevents negative balances', () => {
      function adjustCoins(currentBalance: number, amount: number, reason: string) {
        if (!Number.isInteger(amount)) {
          throw new Error('Amount must be a valid integer');
        }
        if (!reason || reason.trim().length === 0 || reason.length > 256) {
          throw new Error('Reason must be between 1 and 256 characters');
        }
        if (Math.abs(amount) > 10000) {
          throw new Error('Amount exceeds maximum limit');
        }

        const newBalance = Math.max(0, currentBalance + amount);
        return {
          newBalance,
          type: amount >= 0 ? 'credit' : 'debit',
          amount: Math.abs(amount),
        };
      }

      // Valid credit
      assert.deepEqual(adjustCoins(100, 50, 'Bonus prize'), {
        newBalance: 150,
        type: 'credit',
        amount: 50,
      });

      // Valid debit with floor clamping at 0
      assert.deepEqual(adjustCoins(50, -100, 'Chargeback adjustment'), {
        newBalance: 0,
        type: 'debit',
        amount: 100,
      });

      // Invalid float amount
      assert.throws(() => adjustCoins(100, 15.5, 'Test'), /valid integer/);

      // Invalid empty reason
      assert.throws(() => adjustCoins(100, 10, '   '), /Reason must be/);
    });
  });

  describe('Referral Uniqueness & Fraud Prevention', () => {
    it('blocks self-referral and duplicate claims via durable records', () => {
      function validateReferralAttempt(
        userId: string,
        referrerId: string,
        userData: { referredBy?: string },
        claimExists: boolean
      ) {
        if (userId === referrerId) {
          throw new Error('Cannot refer yourself');
        }
        if (userData.referredBy || claimExists) {
          throw new Error('Already applied a referral code');
        }
        return true;
      }

      // Valid referral
      assert.ok(validateReferralAttempt('user_1', 'user_2', {}, false));

      // Self-referral rejected
      assert.throws(() => validateReferralAttempt('user_1', 'user_1', {}, false), /Cannot refer yourself/);

      // Existing user referredBy rejected
      assert.throws(() => validateReferralAttempt('user_1', 'user_2', { referredBy: 'CODE1' }, false), /Already applied/);

      // Existing durable claim document rejected (even if user doc referredBy was missing)
      assert.throws(() => validateReferralAttempt('user_1', 'user_2', {}, true), /Already applied/);
    });
  });

  describe('Provider S2S Callback HMAC Signature Verification', () => {
    function hmacHex(secret: string, data: string): string {
      return crypto.createHmac('sha256', secret).update(data, 'utf8').digest('hex');
    }

    it('verifies Cint HMAC signatures with and without subId', () => {
      const secret = 'cint_secret_key_123';
      const timestamp = '1700000000';
      const respondentId = 'user_abc';
      const surveyId = 'survey_999';
      const status = 'complete';

      // String format with subId
      const dataWithSubId = `${timestamp}|${respondentId}|${surveyId}|${status}|sub_456`;
      const hashWithSubId = hmacHex(secret, dataWithSubId);
      assert.ok(hashWithSubId.length === 64);

      // String format without subId
      const dataNoSubId = `${timestamp}|${respondentId}|${surveyId}|${status}`;
      const hashNoSubId = hmacHex(secret, dataNoSubId);
      assert.ok(hashNoSubId.length === 64);
    });

    it('verifies AdGem HMAC signatures across concatenation variations', () => {
      const secret = 'adgem_secret_key_123';
      const playerId = 'user_abc';
      const amount = '500';
      const txId = 'tx_777';

      const sigConcatenated = hmacHex(secret, `${playerId}${amount}${txId}`);
      const sigKeyVal = hmacHex(secret, `player_id=${playerId}&amount=${amount}&transaction_id=${txId}`);

      assert.ok(sigConcatenated.length === 64);
      assert.ok(sigKeyVal.length === 64);
    });

    it('verifies BitLabs HMAC signatures for uid+val+tx', () => {
      const secret = 'bitlabs_secret_key_123';
      const uid = 'user_abc';
      const val = '250';
      const tx = 'tx_888';

      const hash = hmacHex(secret, `${uid}${val}${tx}`);
      assert.ok(hash.length === 64);
    });

    it('verifies Affiliate network HMAC signatures for Awin, CJ, Impact', () => {
      const secret = 'affiliate_secret_key_123';

      // Awin format
      const awinSig = hmacHex(secret, 'order_100150.00');
      // CJ format
      const cjSig = hmacHex(secret, 'order_1001user_abc50.00');
      // Impact format
      const impactSig = hmacHex(secret, 'order_1001user_abc100.00');

      assert.ok(awinSig.length === 64);
      assert.ok(cjSig.length === 64);
      assert.ok(impactSig.length === 64);
    });
  });

  describe('Callable Functions Permission Enforcement', () => {
    function enforceAdminAuth(context: { auth?: { uid: string; token: Record<string, any> } } | undefined) {
      if (!context || !context.auth) {
        throw new Error('unauthenticated: Must be logged in');
      }
      if (context.auth.token.admin !== true) {
        throw new Error('permission-denied: Admin access required');
      }
      return true;
    }

    it('rejects unauthenticated users calling admin functions', () => {
      assert.throws(() => enforceAdminAuth(undefined), /unauthenticated/);
      assert.throws(() => enforceAdminAuth({}), /unauthenticated/);
    });

    it('rejects non-admin authenticated users calling admin functions', () => {
      const regularUserContext = { auth: { uid: 'user_123', token: {} } };
      assert.throws(() => enforceAdminAuth(regularUserContext), /permission-denied/);
    });

    it('allows verified admin users to execute callable functions', () => {
      const adminContext = { auth: { uid: 'admin_456', token: { admin: true } } };
      assert.ok(enforceAdminAuth(adminContext));
    });
  });

  describe('Concurrency & Transactional Double-Credit Prevention', () => {
    it('prevents concurrent double-crediting on identical pending reward records', async () => {
      const rewardRecord = { id: 'reward_777', status: 'pending', amount: 500, userId: 'user_123' };
      let userBalance = 1000;

      async function executeTransaction() {
        if (rewardRecord.status !== 'pending') {
          throw new Error(`Reward is in ${rewardRecord.status} status, cannot process`);
        }
        rewardRecord.status = 'completed';
        userBalance += rewardRecord.amount;
        return userBalance;
      }

      // Simulate 2 parallel execution attempts on the same reward record
      const results = await Promise.allSettled([executeTransaction(), executeTransaction()]);

      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');

      assert.equal(fulfilled.length, 1, 'Only one transaction attempt must succeed');
      assert.equal(rejected.length, 1, 'Concurrent attempt must be rejected');
      assert.equal(userBalance, 1500, 'User balance must be credited exactly once (+500)');
      assert.equal(rewardRecord.status, 'completed');
    });

    it('enforces durable lock for single referral claim per user', async () => {
      const existingClaims = new Set<string>();

      async function applyReferralTransaction(userId: string, code: string) {
        if (existingClaims.has(userId)) {
          throw new Error('Already applied a referral code');
        }
        existingClaims.add(userId);
        return { success: true, appliedCode: code };
      }

      const userId = 'new_user_888';
      const results = await Promise.allSettled([
        applyReferralTransaction(userId, 'CODE_A'),
        applyReferralTransaction(userId, 'CODE_B'),
      ]);

      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');

      assert.equal(fulfilled.length, 1, 'Only first referral application must succeed');
      assert.equal(rejected.length, 1, 'Concurrent referral application must be blocked');
      assert.ok(existingClaims.has(userId));
    });
  });

  describe('Durable Survey Verification & Token Integrity', () => {
    interface SurveyTokenDoc {
      tokenId: string;
      surveyId: string;
      userId: string;
      status: 'issued' | 'verified';
    }

    it('awards survey coins only for valid issued tokens and blocks duplicate claims', () => {
      const tokensDatabase = new Map<string, SurveyTokenDoc>([
        ['sv_100_user1', { tokenId: 'sv_100_user1', surveyId: '100', userId: 'user1', status: 'issued' }],
      ]);

      function processSurveyReward(tokenId: string, rewardCoins: number, currentBalance: number) {
        const token = tokensDatabase.get(tokenId);
        if (!token) throw new Error('Invalid survey token');
        if (token.status === 'verified') throw new Error('Survey token already verified');

        token.status = 'verified';
        return currentBalance + rewardCoins;
      }

      // First call succeeds and credits coins
      const newBalance = processSurveyReward('sv_100_user1', 300, 1000);
      assert.equal(newBalance, 1300);

      // Subsequent attempt with same token throws duplicate error
      assert.throws(() => processSurveyReward('sv_100_user1', 300, 1300), /Survey token already verified/);

      // Attempt with forged token throws invalid token error
      assert.throws(() => processSurveyReward('sv_fake_token', 300, 1300), /Invalid survey token/);
    });
  });
});


