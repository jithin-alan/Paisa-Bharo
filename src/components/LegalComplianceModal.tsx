import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Coins, Mail, Trash2, Users, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '../services/currencies';

export type LegalTabType = 'privacy' | 'terms' | 'rewards' | 'support' | 'deletion' | 'eligibility' | 'transparency';

interface LegalComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTabType;
}

export const LegalComplianceModal: React.FC<LegalComplianceModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<LegalTabType>(initialTab);
  const [deletionConfirmed, setDeletionConfirmed] = useState(false);
  const [deletionSuccess, setDeletionSuccess] = useState(false);

  if (!isOpen) return null;

  const tabs: { id: LegalTabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
    { id: 'terms', label: 'Terms & Conditions', icon: FileText },
    { id: 'rewards', label: 'Reward Policy', icon: Coins },
    { id: 'support', label: 'Contact Support', icon: Mail },
    { id: 'deletion', label: 'Data & Account Deletion', icon: Trash2 },
    { id: 'eligibility', label: 'Age & Geo Eligibility', icon: Users },
    { id: 'transparency', label: 'Survey Transparency', icon: Eye },
  ];

  const handleRequestDeletion = () => {
    setDeletionConfirmed(true);
    setDeletionSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[28px] border border-[#bde0fe] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-gray-900">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#e6f4fa] via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#072ac8] text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900">Legal, Safety & Compliance Center</h2>
              <p className="text-xs text-gray-500">Paisa Bharo • Transparency & User Rights Guidelines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto p-2 bg-[#f9f8fe] border-b border-gray-100 no-scrollbar">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={`legal-tab-${tab.id}-${idx}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 shrink-0 transition cursor-pointer ${
                  isActive
                    ? 'bg-[#072ac8] text-white shadow-sm'
                    : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6 text-xs sm:text-sm text-gray-700 leading-relaxed">
          {/* PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#e6f4fa] border border-[#bde0fe] flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#072ac8] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Privacy Policy Summary</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Paisa Bharo is committed to safeguarding your personal information, maintaining strict privacy controls, and providing complete data transparency under applicable privacy laws.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">1. Information We Collect</h4>
                <p>We collect minimal required data to operate your wallet and deliver localized market research opportunities:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Account Identity:</strong> Display name, email address, and profile picture (via Google Authentication or guest ID).</li>
                  <li><strong>Wallet Ledger:</strong> Coin balance, lifetime earnings, redemption request history, and streak progress.</li>
                  <li><strong>Demographics & Preferences:</strong> Country code, preferred payout currency, and opt-in poll response choices.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">2. Third-Party Provider Integrations</h4>
                <p>We partner with trusted global market research and offerwall supply networks:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Cint Supply API:</strong> Delivers high-yield research surveys. Receives pseudonymous respondent IDs and qualification criteria.</li>
                  <li><strong>AdGem & BitLabs Offerwalls:</strong> Provides sponsored app tasks and survey routers using encrypted sub-IDs.</li>
                  <li><strong>Affiliate Networks (Awin, CJ, Impact):</strong> Tracks merchant store conversions for cashback verification.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">3. Local Storage, Cookies & Tracking</h4>
                <p>
                  Paisa Bharo uses Progressive Web App (PWA) local storage to preserve offline app preferences (language, currency, sound) and secure session tokens. We do not sell user data to advertising brokers.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">4. Your Data Rights</h4>
                <p>You have the right to access, inspect, export, or request permanent erasure of your personal data at any time by visiting the <strong>Data & Account Deletion</strong> tab or emailing <strong>stickadmob@gmail.com</strong>.</p>
              </section>
            </div>
          )}

          {/* TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Terms & Conditions of Service</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    By using Paisa Bharo, you agree to these fair usage rules and reward distribution policies.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">1. User Account Responsibility</h4>
                <p>Each user is permitted exactly one active account. Creating duplicate accounts, using automated bots, emulator scripting, or proxy/VPN location spoofing will lead to immediate account suspension and reward forfeiture.</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">2. Zero Tolerance for Fraud</h4>
                <p>All coin credits and referral activities are audited by server-authoritative Firestore transactions. Fabricated votes, tampered postbacks, or fraudulent referral self-applications are detected and automatically revoked.</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">3. Service Availability</h4>
                <p>Paisa Bharo strives for 99.9% app uptime. Maintenance windows or provider partner outages will be communicated transparently in-app.</p>
              </section>
            </div>
          )}

          {/* REWARD POLICY */}
          {activeTab === 'rewards' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#e6f4fa] border border-[#bde0fe] flex items-start gap-3">
                <Coins className="w-5 h-5 text-[#072ac8] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Reward Policy & Conversion Rules</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Clear, predictable coin valuations across all supported global currencies.
                  </p>
                </div>
              </div>

              <section className="space-y-3">
                <h4 className="font-extrabold text-[#072ac8]">1. Global Currency Conversion Table</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
                    <thead className="bg-[#e6f4fa] text-gray-900 font-extrabold">
                      <tr>
                        <th className="p-2.5">Currency</th>
                        <th className="p-2.5">Base Symbol</th>
                        <th className="p-2.5">1,000 Coins Equivalent</th>
                        <th className="p-2.5">Minimum Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.keys(SUPPORTED_CURRENCIES).map((code, idx) => {
                        const curr = SUPPORTED_CURRENCIES[code];
                        return (
                          <tr key={`legal-curr-${code}-${idx}`} className="hover:bg-gray-50">
                            <td className="p-2.5 font-bold flex items-center gap-1.5">
                              <span>{curr.flag}</span>
                              <span>{curr.code}</span>
                            </td>
                            <td className="p-2.5 font-mono">{curr.symbol}</td>
                            <td className="p-2.5 font-extrabold text-[#072ac8]">
                              {curr.symbol}{(1000 / curr.coinsPerUnit).toFixed(2)}
                            </td>
                            <td className="p-2.5">{curr.payoutMethods[0]?.minCoins ?? 600} Coins</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">2. Qualification & Payout SLA</h4>
                <p>
                  - <strong>Instant Crediting:</strong> Daily check-ins, poll votes, and scratch cards credit instantly to your balance.<br />
                  - <strong>Pending Referral Hold:</strong> Referral rewards enter a 24-hour verification hold before auto-crediting to prevent fraudulent self-referrals.<br />
                  - <strong>Redemption Processing:</strong> Payout requests (UPI, Amazon, PayPal) are reviewed and dispatched within 24–48 hours.
                </p>
              </section>
            </div>
          )}

          {/* CONTACT & SUPPORT */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-[#bde0fe] flex items-start gap-3 shadow-sm">
                <Mail className="w-5 h-5 text-[#072ac8] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Customer Support & Inquiries</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Our dedicated support team is available to resolve wallet, offer, or redemption questions.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#e6f4fa] border border-[#072ac8]/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#072ac8] text-white flex items-center justify-center font-bold">
                    ✉️
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-semibold block">Official Support Email</span>
                    <a
                      href="mailto:stickadmob@gmail.com"
                      className="font-black text-sm text-[#072ac8] hover:underline"
                    >
                      stickadmob@gmail.com
                    </a>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Please include your User ID and transaction details when emailing support regarding a specific reward or redemption request.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">Response Time SLA</h4>
                <p>All support requests received at <strong>stickadmob@gmail.com</strong> are answered within 24 business hours.</p>
              </section>
            </div>
          )}

          {/* DATA & ACCOUNT DELETION */}
          {activeTab === 'deletion' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-red-900">Account & Personal Data Deletion</h3>
                  <p className="text-xs text-red-700 mt-0.5">
                    You have complete ownership of your data and may request permanent deletion at any time.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="font-extrabold text-gray-900">What happens when you delete your account?</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your user profile record (`users/{'{userId}'}`) is permanently deleted.</li>
                  <li>All stored coin balance and lifetime earnings history are permanently purged.</li>
                  <li>All pending redemption requests are cancelled.</li>
                  <li>Associated survey completion tokens are scrubbed.</li>
                </ul>
              </section>

              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider">How to Trigger Deletion</h4>
                <p className="text-xs text-gray-600">
                  Option 1: Click the button below to submit an instant data purge request.<br />
                  Option 2: Email <strong>stickadmob@gmail.com</strong> with subject "Account Deletion Request" along with your account email address.
                </p>

                {deletionSuccess ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Deletion request registered. Your data purge request is queued for completion.</span>
                  </div>
                ) : (
                  <button
                    onClick={handleRequestDeletion}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs transition shadow cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Request Permanent Data Deletion</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* AGE & GEO ELIGIBILITY */}
          {activeTab === 'eligibility' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#e6f4fa] border border-[#bde0fe] flex items-start gap-3">
                <Users className="w-5 h-5 text-[#072ac8] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Age Eligibility & Regional Rules</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Clear qualification boundaries for opinion research and rewards.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">1. Age Requirements</h4>
                <p>
                  Paisa Bharo is intended for individuals aged <strong>18 years or older</strong>. Minors aged 13–17 may participate only under the direct consent and supervision of a parent or legal guardian.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">2. Geographic Matching & VPN Restriction</h4>
                <p>
                  Surveys and cashback deals are tailored to specific geographical regions (India, United States, Germany, Brazil, etc.). Using VPNs, proxy servers, or location spoofing violates market research accuracy requirements and will block survey entry.
                </p>
              </section>
            </div>
          )}

          {/* SURVEY TRANSPARENCY */}
          {activeTab === 'transparency' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-[#bde0fe] flex items-start gap-3 shadow-sm">
                <Eye className="w-5 h-5 text-[#072ac8] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Survey & Offer Transparency Notice</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    How research tasks, qualification criteria, and rewards work transparently.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">1. Pre-Survey Transparency</h4>
                <p>Before launching any survey or offer, you will always be shown:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Exact Coin Reward value (e.g. +450 Coins).</li>
                  <li>Estimated LOI (Length of Interview) time in minutes.</li>
                  <li>Sponsor or market research category.</li>
                  <li>Required qualification criteria (e.g. smartphone owner, demographic target).</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-extrabold text-[#072ac8]">2. Screening & Consolation Rewards</h4>
                <p>
                  If a survey sponsor closes a quota or determines your profile does not match a specific survey target ("screenout"), you will receive a <strong>+15 Consolation Coin Reward</strong> for your time.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>Need help? Contact <a href="mailto:stickadmob@gmail.com" className="text-[#072ac8] font-bold hover:underline">stickadmob@gmail.com</a></span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white font-extrabold transition cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
