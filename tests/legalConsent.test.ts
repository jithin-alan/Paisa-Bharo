import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getLegalDocumentUrls } from '../src/config/legalLinks.ts';

const ROOT = process.cwd();

describe('Legal Consent & Public GitHub Pages Static Legal Documents', () => {
  it('resolves local standalone paths by default and GitHub Pages URLs when base URL is provided', () => {
    const localUrls = getLegalDocumentUrls('');
    assert.equal(localUrls.termsOfServiceUrl, '/terms-of-service.html');
    assert.equal(localUrls.privacyPolicyUrl, '/privacy-policy.html');

    const ghUrls = getLegalDocumentUrls('https://example-user.github.io/paisa-bharo///');
    assert.equal(ghUrls.termsOfServiceUrl, 'https://example-user.github.io/paisa-bharo/terms-of-service.html');
    assert.equal(ghUrls.privacyPolicyUrl, 'https://example-user.github.io/paisa-bharo/privacy-policy.html');
  });

  it('provides clean standalone static HTML files in both docs/ (GitHub Pages) and public/', () => {
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

    const privacyHtml = fs.readFileSync(path.join(ROOT, 'docs/privacy-policy.html'), 'utf8');
    assert.ok(privacyHtml.includes('TheoremReach'), 'Privacy Policy must explicitly disclose TheoremReach');

    const termsHtml = fs.readFileSync(path.join(ROOT, 'docs/terms-of-service.html'), 'utf8');
    assert.ok(termsHtml.includes('TheoremReach'), 'Terms of Service must explicitly disclose TheoremReach');
  });

  it('enforces required consent checkbox across Phone, Email, and Google sign-in on LandingPage', () => {
    const landingSource = fs.readFileSync(path.join(ROOT, 'src/views/LandingPage.tsx'), 'utf8');
    assert.ok(landingSource.includes('id="registration-legal-consent"'));
    assert.ok(landingSource.includes('required'));
    assert.ok(landingSource.includes('aria-required="true"'));
    assert.ok(landingSource.includes('target="_blank"'));
    assert.ok(landingSource.includes('rel="noopener noreferrer"'));
    assert.ok(landingSource.includes('if (!ensureLegalConsent())'), 'Phone and Email handler must check consent');
    assert.ok(landingSource.includes('onClick={handleGoogleAuthClick}'), 'Google button must check consent');
  });
});
