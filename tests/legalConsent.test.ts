import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getLegalDocumentUrls,
  PRIVACY_POLICY_VERSION,
  TERMS_VERSION,
} from '../src/config/legalLinks.ts';
import {
  buildConsentDocId,
  buildConsentPayload,
  recordUserConsent,
  UserConsentRecord,
} from '../src/services/consentService.ts';

const ROOT = process.cwd();

describe('TheoremReach Registration Consent & Policy Compliance', () => {
  it('resolves /terms and /privacy locally by default and GitHub Pages URLs when base URL is set', () => {
    const localUrls = getLegalDocumentUrls('');
    assert.equal(localUrls.termsOfServiceUrl, '/terms');
    assert.equal(localUrls.privacyPolicyUrl, '/privacy');

    const ghUrls = getLegalDocumentUrls('https://example-user.github.io/paisa-bharo///');
    assert.equal(ghUrls.termsOfServiceUrl, 'https://example-user.github.io/paisa-bharo/terms-of-service.html');
    assert.equal(ghUrls.privacyPolicyUrl, 'https://example-user.github.io/paisa-bharo/privacy-policy.html');
  });

  it('keeps clean standalone static HTML files in docs/ and public/', () => {
    const files = [
      'docs/index.html',
      'docs/terms-of-service.html',
      'docs/privacy-policy.html',
      'public/terms-of-service.html',
      'public/privacy-policy.html',
    ];

    for (const rel of files) {
      const fullPath = path.join(ROOT, rel);
      assert.equal(fs.existsSync(fullPath), true, `Missing static HTML file: ${rel}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(content.includes('<!doctype html>'), `${rel} must be a standalone HTML document`);
      assert.ok(content.includes('stickadmob@gmail.com'), `${rel} must include support contact`);
      assert.equal(content.includes('{" "}'), false, `${rel} must not contain raw JSX spacing syntax`);
    }
  });

  it('renders unchecked consent checkbox with exact wording and clickable policy links on LandingPage', () => {
    const landingSource = fs.readFileSync(path.join(ROOT, 'src/views/LandingPage.tsx'), 'utf8');
    assert.ok(landingSource.includes('useState(false)'), 'Consent checkbox must default to unchecked');
    assert.ok(landingSource.includes('id="registration-legal-consent"'));
    assert.ok(landingSource.includes('I have read and agree to the'));
    assert.ok(landingSource.includes('<span>Terms of Service</span>'));
    assert.ok(landingSource.includes('<span>Privacy Policy</span>'));
    assert.ok(landingSource.includes('href={termsOfServiceUrl}'));
    assert.ok(landingSource.includes('href={privacyPolicyUrl}'));
    assert.ok(landingSource.includes('if (!isExistingEmailLogin && !ensureLegalConsent())'));
    assert.ok(landingSource.includes('onClick={handleGoogleAuthClick}'));
    assert.ok(landingSource.includes('if (!ensureLegalConsent()) return;'), 'OTP verify must enforce consent');
  });

  it('preserves existing login without forcing re-registration while blocking unconsented new signups in App.tsx', () => {
    const appSource = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
    // Public /terms and /privacy routes rendered before auth/maintenance gates
    const policyRouteIdx = appSource.indexOf("if (currentPath === '/terms' || currentPath === '/privacy')");
    const authLoadingIdx = appSource.indexOf('if (authLoading)');
    const noUserIdx = appSource.indexOf('if (!user)');
    assert.ok(policyRouteIdx > 0 && policyRouteIdx < authLoadingIdx && policyRouteIdx < noUserIdx);

    // Email login must block auto-creating a new account when consentAccepted is false
    assert.ok(appSource.includes('if (!consentAccepted) {'), 'handleEmailLogin must block unconsented auto-signup');
    assert.ok(appSource.includes('recordUserConsent(cred.user.uid'), 'Must record consent for confirmed registrations');
  });

  it('includes complete policy disclosures on LegalPolicyPage without unverified certification claims', () => {
    const policySource = fs.readFileSync(path.join(ROOT, 'src/views/LegalPolicyPage.tsx'), 'utf8');
    assert.ok(policySource.includes('Terms of Service'));
    assert.ok(policySource.includes('Privacy Policy'));
    assert.ok(policySource.includes('Firebase Authentication'));
    assert.ok(policySource.includes('TheoremReach'));
    assert.ok(policySource.includes('1,000 Coins = $1.00 USD'));
    assert.ok(policySource.includes('stickadmob@gmail.com'));
  });

  it('records immutable consent with UID, server timestamp, and policy versions', async () => {
    const mockTimestamp = { _type: 'serverTimestamp' };
    const written = new Map<string, UserConsentRecord>();

    const firstResult = await recordUserConsent('uid_test_123', 'email', {
      getExistingDoc: async (docId) => written.has(docId),
      writeDoc: async (docId, payload) => {
        written.set(docId, payload);
      },
      serverTime: () => mockTimestamp,
    });

    const expectedDocId = buildConsentDocId('uid_test_123', TERMS_VERSION, PRIVACY_POLICY_VERSION);
    assert.equal(firstResult.recorded, true);
    assert.equal(firstResult.alreadyRecorded, false);
    assert.equal(firstResult.docId, expectedDocId);

    const saved = written.get(expectedDocId);
    assert.ok(saved, 'Consent record must be persisted against UID');
    assert.deepEqual(
      saved,
      buildConsentPayload('uid_test_123', 'email', mockTimestamp, TERMS_VERSION, PRIVACY_POLICY_VERSION)
    );
    assert.equal(saved.uid, 'uid_test_123');
    assert.equal(saved.consentStatus, 'accepted');
    assert.equal(saved.termsVersion, TERMS_VERSION);
    assert.equal(saved.privacyPolicyVersion, PRIVACY_POLICY_VERSION);
    assert.equal(saved.consentedAt, mockTimestamp);

    // Subsequent login by existing user with same version must not overwrite or fail
    let writeCount = 0;
    const secondResult = await recordUserConsent('uid_test_123', 'google', {
      getExistingDoc: async (docId) => written.has(docId),
      writeDoc: async () => {
        writeCount += 1;
      },
      serverTime: () => mockTimestamp,
    });

    assert.equal(secondResult.recorded, true);
    assert.equal(secondResult.alreadyRecorded, true);
    assert.equal(writeCount, 0, 'Existing consent record must not be overwritten');
  });

  it('rejects invalid UIDs when building consent document IDs', () => {
    assert.throws(() => buildConsentDocId(''), /Invalid Firebase UID/);
    assert.throws(() => buildConsentDocId('bad/uid'), /Invalid Firebase UID/);
  });
});
