import React from 'react';
import { ArrowLeft, ShieldCheck, FileText } from 'lucide-react';
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from '../config/legalLinks';

export type LegalPolicyPageType = 'terms' | 'privacy';

interface LegalPolicyPageProps {
  page: LegalPolicyPageType;
  onNavigate?: (path: string) => void;
}

export const LegalPolicyPage: React.FC<LegalPolicyPageProps> = ({ page, onNavigate }) => {
  const isTerms = page === 'terms';

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(path);
    }
  };

  return (
    <div className="min-h-[var(--viewport-height)] bg-[#f7f8fc] text-[#1e1b2e] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#d0e8f7] px-4 sm:px-8 py-3.5 safe-top safe-x">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 sm:gap-8">
          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            className="text-xl font-black tracking-tight text-[#1e1b2e] whitespace-nowrap shrink-0"
          >
            <span className="text-[#072ac8]">Paisa</span>
            <span className="text-[#fb8500]">Bharo</span>
          </a>

          <nav className="hidden sm:flex items-center gap-6 text-sm font-semibold text-gray-600">
            <a
              href="/terms"
              onClick={(e) => handleLinkClick(e, '/terms')}
              aria-current={isTerms ? 'page' : undefined}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                isTerms
                  ? 'text-[#072ac8] underline underline-offset-4'
                  : 'hover:text-[#072ac8]'
              }`}
            >
              Terms of Service
            </a>
            <a
              href="/privacy"
              onClick={(e) => handleLinkClick(e, '/privacy')}
              aria-current={!isTerms ? 'page' : undefined}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                !isTerms
                  ? 'text-[#072ac8] underline underline-offset-4'
                  : 'hover:text-[#072ac8]'
              }`}
            >
              Privacy Policy
            </a>
            <a
              href="mailto:stickadmob@gmail.com"
              className="whitespace-nowrap shrink-0 hover:text-[#072ac8] transition-colors"
            >
              Support
            </a>
          </nav>

          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to App</span>
          </a>
        </div>
      </header>

      {/* Mobile Sub-Navigation for Switching Between Terms & Privacy */}
      <div className="sm:hidden bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-4 text-xs font-bold">
        <a
          href="/terms"
          onClick={(e) => handleLinkClick(e, '/terms')}
          aria-current={isTerms ? 'page' : undefined}
          className={isTerms ? 'text-[#072ac8] underline underline-offset-4' : 'text-gray-600'}
        >
          Terms of Service
        </a>
        <span aria-hidden="true" className="text-gray-300">/</span>
        <a
          href="/privacy"
          onClick={(e) => handleLinkClick(e, '/privacy')}
          aria-current={!isTerms ? 'page' : undefined}
          className={!isTerms ? 'text-[#072ac8] underline underline-offset-4' : 'text-gray-600'}
        >
          Privacy Policy
        </a>
      </div>

      {/* Main Policy Document */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 safe-x">
        <article className="bg-white border border-[#bde0fe] rounded-3xl p-6 sm:p-10 shadow-[0_4px_20px_rgba(7,42,200,0.04)]">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-3">
            {isTerms ? (
              <FileText className="w-4 h-4 text-[#072ac8] shrink-0" aria-hidden="true" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#072ac8] shrink-0" aria-hidden="true" />
            )}
            <span>Effective Date: November 20, 2026</span>
            <span aria-hidden="true">&middot;</span>
            <span>Version {isTerms ? TERMS_VERSION : PRIVACY_POLICY_VERSION}</span>
          </div>

          {isTerms ? (
            <div className="space-y-7 text-sm sm:text-[15px] text-gray-700 leading-relaxed max-w-[72ch]">
              <header className="pb-6 border-b border-gray-200">
                <h1 className="text-2xl sm:text-4xl font-black text-[#1e1b2e] tracking-tight mb-3">
                  Terms of Service
                </h1>
                <p className="text-gray-600">
                  Welcome to Paisa Bharo. By registering an account or accessing the Paisa Bharo web
                  application or Progressive Web App, you agree to these Terms of Service and our{' '}
                  <a
                    href="/privacy"
                    onClick={(e) => handleLinkClick(e, '/privacy')}
                    className="font-bold text-[#072ac8] underline underline-offset-2"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </header>

              <section className="space-y-2.5">
                <h2 className="text-lg font-extrabold text-[#072ac8]">
                  1. Rewards Platform Overview
                </h2>
                <p>
                  Paisa Bharo is an online opinion and rewards platform where registered members earn
                  platform Coins by participating in market research surveys, community polls, daily
                  check-ins, partner offerwalls, and referral programs. Coins may be redeemed for
                  supported payout options once minimum thresholds are met.
                </p>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg font-extrabold text-[#072ac8]">
                  2. Eligibility &amp; User Responsibilities
                </h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Age Requirement:</strong> You must be at least 18 years old (or 13&ndash;17
                    years old with explicit parent or legal guardian consent where permitted) to
                    register and participate.
                  </li>
                  <li>
                    <strong>One Account Per Person:</strong> Each individual may maintain only one
                    active Paisa Bharo account. Creating duplicate accounts to claim extra check-in
                    bonuses, referrals, or survey rewards is strictly prohibited.
                  </li>
                  <li>
                    <strong>Truthful Participation:</strong> You agree to provide accurate,
                    honest, and consistent demographic and survey responses.
                  </li>
                  <li>
                    <strong>Account Security:</strong> You are responsible for maintaining the
                    confidentiality of your authentication credentials and payout details.
                  </li>
                </ul>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg font-extrabold text-[#072ac8]">
                  3. Surveys &amp; Third-Party Integrations
                </h2>
                <p>
                  Paisa Bharo integrates independent market research and offerwall providers,
                  including <strong>TheoremReach</strong>, Cint, AdGem, BitLabs, and affiliate
                  cashback networks.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Survey inventory, qualification screening, completion checks, and reward amounts
                    are verified through server-to-server callbacks from the relevant provider.
                  </li>
                  <li>
                    If a survey provider disqualifies or reverses a reward due to speeding,
                    inconsistent answers, duplicate entries, or automated quality checks, Paisa
                    Bharo will deduct the reversed Coins from your balance and may restrict access to
                    that provider.
                  </li>
                </ul>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg font-extrabold text-[#072ac8]">
                  4. Coins, Rewards &amp; Payouts
                </h2>
                <div className="rounded-2xl bg-[#e6f4fa] border border-[#bde0fe] p-4 text-gray-800">
                  <strong>Standard Valuation:</strong> 1,000 Coins = $1.00 USD equivalent. Local
                  currency payout equivalents (such as INR via UPI or Gift Cards) and minimum
                  thresholds are displayed clearly in the Cashout view before submitting a request.
                </div>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Coins are promotional loyalty credits within Paisa Bharo and hold no monetary or
                    cash value outside the platform until redeemed through an approved payout method.
                  </li>
                  <li>
                    Redemption requests undergo automated and manual fraud verification and are
                    typically processed within 24&ndash;48 hours.
                  </li>
                  <li>
                    Paisa Bharo reserves the right to adjust reward rates, minimum payout limits, or
                    supported payout methods with reasonable notice in the app.
                  </li>
                </ul>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg font-extrabold text-[#072ac8]">
                  5. Prohibited Activities
                </h2>
                <p>
                  You may not engage in any activity designed to manipulate rewards or bypass
                  verification controls, including:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Using VPNs, proxy servers, Tor exit nodes, GPS spoofers, or residential relays
                    to mask or falsify your geographic location.
                  </li>
                  <li>
                    Using bots, scripts, emulators, headless browsers, or automation tools to
                    complete polls, surveys, check-ins, or offers.
                  </li>
                  <li>
                    Submitting fraudulent referrals, self-referrals, or attempting to tamper with
                    callback URLs, signatures, or client state.
                  </li>
                </ul>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg font-extrabold text-[#072ac8]">
                  6. Account Suspension, Termination &amp; Limitations
                </h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Suspension &amp; Forfeiture:</strong> Violations of these Terms or
                    research partner quality policies may result in immediate account suspension,
                    provider bans, or forfeiture of fraudulently obtained Coins.
                  </li>
                  <li>
                    <strong>Service Availability &amp; Disclaimers:</strong> Paisa Bharo is provided
                    on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We do not
                    guarantee uninterrupted survey availability, specific earning amounts, or
                    uninterrupted access during maintenance or third-party provider outages.
                  </li>
                  <li>
                    <strong>Limitation of Liability:</strong> To the maximum extent permitted by
                    applicable law, Paisa Bharo is not liable for indirect or consequential damages
                    arising from third-party survey screening, partner reversals, or service
                    interruptions.
                  </li>
                  <li>
                    <strong>Account Deletion:</strong> You may request permanent account deletion
                    at any time via the in-app Legal &amp; Compliance Center or by emailing{' '}
                    <a
                      href="mailto:stickadmob@gmail.com"
                      className="font-bold text-[#072ac8] underline"
                    >
                      stickadmob@gmail.com
                    </a>
                    .
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-extrabold text-[#072ac8]">7. Contact Us</h2>
                <p>
                  For questions about these Terms of Service, survey rewards, or account status,
                  email{' '}
                  <a
                    href="mailto:stickadmob@gmail.com"
                    className="font-bold text-[#072ac8] underline"
                  >
                    stickadmob@gmail.com
                  </a>
                  .
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-7 text-sm sm:text-[15px] text-gray-700 leading-relaxed max-w-[72ch]">
              <header className="pb-6 border-b border-gray-200">
                <h1 className="text-2xl sm:text-4xl font-black text-[#1e1b2e] tracking-tight mb-3">
                  Privacy Policy
                </h1>
                <p className="text-gray-600">
                  Paisa Bharo respects your privacy. This Privacy Policy explains what information
                  is collected when you register and use Paisa Bharo, how Firebase Authentication and
                  survey partners process data, and how you can manage or delete your information.
                </p>
              </header>

              <section className="space-y-2.5">
                <h2 className="text-lg font-extrabold text-[#072ac8]">
                  1. Firebase Authentication &amp; User Account Data
                </h2>
                <p>
                  We use <strong>Firebase Authentication</strong> to securely sign you in via Phone
                  OTP, Email &amp; Password, or Google Sign-In. Depending on your chosen sign-in
                  method, we collect only the necessary account fields:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Account Identifiers:</strong> Firebase unique user identifier (UID),
                    email address, phone number (when authenticating via Phone OTP), display name,
                    and profile image URL.
                  </li>
                  <li>
                    <strong>Preferences &amp; Localization:</strong> Country code, preferred payout
                    currency, selected language, and timezone used for survey matching and daily
                    check-in calculations.
                  </li>
                  <li>
                    <strong>Consent Audit Record:</strong> When you register, we store your Firebase
                    UID, consent status, server timestamp, and the Terms of Service and Privacy
                    Policy versions accepted.
                  </li>
                </ul>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg font-extrabold text-[#072ac8]">
                  2. Reward Transactions &amp; Payout Data
                </h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    We maintain server-authoritative wallet records in Cloud Firestore covering your
                    Coin balance, lifetime earnings, daily check-in streaks, poll votes, and
                    referral attribution.
                  </li>
                  <li>
                    When you submit a payout redemption, we record your chosen payout method, Coin
                    amount, and recipient details (such as a UPI ID or gift card delivery email)
                    solely to verify and fulfill the payout.
                  </li>
                </ul>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg font-extrabold text-[#072ac8]">
                  3. Survey-Provider Integrations
                </h2>
                <div className="rounded-2xl bg-[#e6f4fa] border border-[#bde0fe] p-4 text-gray-800">
                  <strong>Pseudonymous Identifiers Only:</strong> When launching a survey or
                  offerwall, Paisa Bharo sends your pseudonymous account identifier (Firebase UID /
                  session transaction ID)&mdash;never your password or payout account credentials.
                </div>
                <p>We integrate with external survey and offerwall partners, including:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>TheoremReach:</strong> Receives cryptographically signed launch
                    parameters containing your pseudonymous identifier so surveys can be matched and
                    reward or reversal callbacks can be credited to your account.
                  </li>
                  <li>
                    <strong>Cint, AdGem, BitLabs &amp; Affiliate Merchants:</strong> Receive
                    pseudonymous sub-IDs to verify survey completions, offer completions, and
                    merchant cashback events.
                  </li>
                </ul>
                <p>
                  Third-party survey partners may collect demographic or survey answers directly
                  within their survey frames according to their own privacy notices. We do not sell
                  your personal contact information to third-party data brokers.
                </p>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg font-extrabold text-[#072ac8]">
                  4. Cookies, Local Storage &amp; PWA Caches
                </h2>
                <p>
                  Paisa Bharo uses essential Firebase Authentication session storage/tokens and
                  browser <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">localStorage</code>{' '}
                  along with Progressive Web App service-worker caches to remember your language,
                  currency, and authentication session. Third-party survey providers embedded in
                  frames may use their own functional cookies for fraud prevention and survey state.
                </p>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg font-extrabold text-[#072ac8]">
                  5. Data Handling, Security &amp; Retention
                </h2>
                <p>
                  Wallet balances, reward callbacks, redemptions, and consent records are protected
                  by server-side Cloud Functions, HMAC cryptographic signature checks, and Firestore
                  security rules restricting client access to authorized records. We retain account
                  and transaction records only for as long as needed to provide the platform, resolve
                  payouts, and prevent fraud or abuse.
                </p>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-lg font-extrabold text-[#072ac8]">
                  6. Your Rights &amp; Data Deletion
                </h2>
                <p>
                  You may request access to or permanent deletion of your account and personal data
                  at any time using the Data &amp; Account Deletion option in Settings or by
                  emailing{' '}
                  <a
                    href="mailto:stickadmob@gmail.com"
                    className="font-bold text-[#072ac8] underline"
                  >
                    stickadmob@gmail.com
                  </a>{' '}
                  with the subject line &ldquo;Account Deletion Request&rdquo;.
                </p>
              </section>
            </div>
          )}
        </article>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 px-4 sm:px-8 text-xs text-gray-500 safe-x">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; 2026 Paisa Bharo. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-4 font-semibold text-gray-700">
            <a
              href="/terms"
              onClick={(e) => handleLinkClick(e, '/terms')}
              className="hover:text-[#072ac8] hover:underline"
            >
              Terms of Service
            </a>
            <span aria-hidden="true">&middot;</span>
            <a
              href="/privacy"
              onClick={(e) => handleLinkClick(e, '/privacy')}
              className="hover:text-[#072ac8] hover:underline"
            >
              Privacy Policy
            </a>
            <span aria-hidden="true">&middot;</span>
            <a href="mailto:stickadmob@gmail.com" className="hover:text-[#072ac8] hover:underline">
              stickadmob@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
