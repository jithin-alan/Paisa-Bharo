import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import pure helpers and logic functions
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
});
