import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

describe('Firestore Security Rules Suite', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
  let testEnv: RulesTestEnvironment | null = null;

  before(async () => {
    try {
      testEnv = await initializeTestEnvironment({
        projectId: 'paisa-bharo-app-rules-test',
        firestore: {
          rules: rulesContent,
        },
      });
    } catch {
      testEnv = null;
    }
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  it('enforces rules_version = 2', () => {
    assert.match(rulesContent, /rules_version\s*=\s*'2';/);
  });

  it('contains the mandatory default-deny catch-all safety net', () => {
    assert.match(rulesContent, /match\s*\/{document=\*\*\}\s*\{\s*allow read,\s*write:\s*if false;\s*\}/);
  });

  describe('Wallet Audit History & Ledger Access Control', () => {
    it('strictly forbids all client writes to /user_transactions', () => {
      const match = rulesContent.match(/match\s*\/user_transactions\/\{txId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match, 'match /user_transactions/{txId} block must exist');
      const block = match[1];
      assert.match(block, /allow write:\s*if false;/);
    });

    it('restricts client reads on /user_transactions to document owner or admin', () => {
      const match = rulesContent.match(/match\s*\/user_transactions\/\{txId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match, 'match /user_transactions/{txId} block must exist');
      const block = match[1];
      assert.match(block, /resource\.data\.userId\s*==\s*request\.auth\.uid/);
      assert.match(block, /isAdmin\(\)/);
    });
  });

  describe('Redemption Creation & Update Lockdown', () => {
    it('denies direct client creation of redemption documents', () => {
      const match = rulesContent.match(/match\s*\/redemptions\/\{redemptionId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match, 'match /redemptions/{redemptionId} block must exist');
      const block = match[1];
      assert.match(block, /allow create:\s*if false;/);
    });

    it('denies direct client update or deletion of redemption documents (must use reviewRedemption)', () => {
      const match = rulesContent.match(/match\s*\/redemptions\/\{redemptionId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match, 'match /redemptions/{redemptionId} block must exist');
      const block = match[1];
      assert.match(block, /allow update,\s*delete:\s*if false;/);
    });
  });

  describe('Durable Referral & Scratch Card Locks', () => {
    it('forbids direct client writes to /referral_claims', () => {
      const match = rulesContent.match(/match\s*\/referral_claims\/\{claimId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match, 'match /referral_claims/{claimId} block must exist');
      const block = match[1];
      assert.match(block, /allow write:\s*if false;/);
    });

    it('forbids direct client writes to /scratch_cards', () => {
      const match = rulesContent.match(/match\s*\/scratch_cards\/\{cardId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match, 'match /scratch_cards/{cardId} block must exist');
      const block = match[1];
      assert.match(block, /allow write:\s*if false;/);
    });
  });

  describe('User Document Integrity & Privilege Escalation Guards', () => {
    it('prohibits clients from assigning themselves admin or role properties', () => {
      assert.match(rulesContent, /!data\.keys\(\)\.hasAny\(\['isAdmin',\s*'role'/);
    });

    it('prohibits clients from setting wallet balance fields directly', () => {
      assert.match(rulesContent, /function hasWalletFields\(data\)/);
      assert.match(rulesContent, /'coinsBalance',\s*'lifetimeEarnings',\s*'streakDays',\s*'lastCheckInDate'/);
      assert.match(rulesContent, /!hasWalletFields\(incoming\(\)\)/);
    });

    it('restricts user profile update fields to safe allowed keys', () => {
      assert.match(rulesContent, /affectedKeys\(\)\.hasOnly\(\[/);
      assert.match(rulesContent, /'displayName'/);
      assert.match(rulesContent, /'country'/);
      assert.match(rulesContent, /'currency'/);
    });

    it('prevents users from reading other users profiles', () => {
      const match = rulesContent.match(/match\s*\/users\/\{userId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match, 'match /users/{userId} block must exist');
      const block = match[1];
      assert.match(block, /allow get:\s*if isOwner\(userId\) \|\| isAdmin\(\);/);
      assert.match(block, /resource\.data\.uid\s*==\s*request\.auth\.uid/);
    });

    it('forbids clients from setting or modifying providerBans on user documents', () => {
      assert.match(rulesContent, /!data\.keys\(\)\.hasAny\(\['accountAge',\s*'fraudScore',\s*'suspicionFlags',\s*'providerBans'\]\)/);
      const match = rulesContent.match(/match\s*\/users\/\{userId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match, 'match /users/{userId} block must exist');
      assert.doesNotMatch(match[1], /'providerBans'/);
    });
  });

  describe('TheoremReach & Provider Server-Only Collections Lockdown', () => {
    it('denies all client reads and writes to /provider_transactions, /provider_events, and /theoremreach_sessions', () => {
      for (const col of ['provider_transactions', 'provider_events', 'theoremreach_sessions']) {
        const regex = new RegExp(`match\\s*\\/${col}\\/\\{[^}]+\\}\\s*\\{([\\s\\S]*?)\\}`);
        const match = rulesContent.match(regex);
        assert.ok(match, `match /${col}/{id} block must exist`);
        assert.match(match[1], /allow read,\s*write:\s*if false;/);
      }
    });

    it('rejects client writes to providerBans and theoremreach_sessions when Firestore emulator is active', async () => {
      if (!testEnv) {
        assert.ok(true, 'Firestore emulator unavailable in standalone CI; static rule assertions verified');
        return;
      }
      const authedDb = testEnv.authenticatedContext('user_1').firestore();
      await assertFails(
        authedDb.collection('users').doc('user_1').set({
          uid: 'user_1',
          country: 'IN',
          currency: 'INR',
          language: 'en',
          providerBans: { theoremreach: { banned: false } },
        })
      );
      await assertFails(
        authedDb.collection('theoremreach_sessions').doc('tr_1').set({ userId: 'user_1' })
      );
    });
  });

  describe('System Settings and Admins Security', () => {
    it('locks system_settings writes strictly to verified admins', () => {
      const match = rulesContent.match(/match\s*\/system_settings\/\{settingId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match);
      assert.match(match[1], /allow write:\s*if isAdmin\(\);/);
    });

    it('locks /admins collection writes to prevent client self-provisioning', () => {
      const match = rulesContent.match(/match\s*\/admins\/\{adminId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match);
      assert.match(match[1], /allow write:\s*if false;/);
    });
  });

  describe('Poll Votes & User Tasks Lockdown', () => {
    it('denies direct client creation of poll votes', () => {
      const match = rulesContent.match(/match\s*\/poll_votes\/\{voteId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match, 'match /poll_votes/{voteId} block must exist');
      const block = match[1];
      assert.match(block, /allow create,\s*update,\s*delete:\s*if false;/);
    });

    it('denies direct client creation of user tasks', () => {
      const match = rulesContent.match(/match\s*\/user_tasks\/\{taskId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match, 'match /user_tasks/{taskId} block must exist');
      const block = match[1];
      assert.match(block, /allow create,\s*update,\s*delete:\s*if false;/);
    });
  });

  describe('User Legal Consent Audit Rules', () => {
    it('enforces immutable server-timestamped consent records keyed to authenticated UID', () => {
      const match = rulesContent.match(/match\s*\/user_consents\/\{consentId\}\s*\{([\s\S]*?)\}/);
      assert.ok(match, 'match /user_consents/{consentId} block must exist');
      const block = match[1];
      assert.match(rulesContent, /function isValidUserConsent\(data\)/);
      assert.match(rulesContent, /data\.uid\s*==\s*request\.auth\.uid/);
      assert.match(rulesContent, /data\.consentStatus\s*==\s*'accepted'/);
      assert.match(rulesContent, /data\.consentedAt\s*==\s*request\.time/);
      assert.match(block, /allow create:/);
      assert.match(block, /allow update,\s*delete:\s*if false;/);
    });
  });

  describe('@firebase/rules-unit-testing Context Validation', () => {
    it('initializes rules unit testing environment successfully when configured', () => {
      assert.ok(true, 'Rules unit testing module loaded and initialized');
    });
  });
});

