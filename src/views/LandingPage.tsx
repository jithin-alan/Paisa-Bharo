import React from 'react';
import { Moon, Globe, Mail, Smartphone } from 'lucide-react';

interface Props {
  onGoogleLogin: () => void;
  onSendOtp: () => Promise<void>;
  onVerifyOtp: (otp: string) => Promise<void>;
  onEmailLogin: (email: string, password: string) => Promise<void>;
  onEmailSignup: (email: string, password: string) => Promise<void>;

  phoneStep: 'idle' | 'code';
  setPhoneStep: (v: 'idle' | 'code') => void;

  countryCode: string;
  setCountryCode: (v: string) => void;

  phoneNumber: string;
  setPhoneNumber: (v: string) => void;

  otp: string;
  setOtp: (v: string) => void;

  phoneError: string;
  phoneLoading: boolean;

  authMode: 'phone' | 'email';
  setAuthMode: (v: 'phone' | 'email') => void;

  email: string;
  setEmail: (v: string) => void;

  password: string;
  setPassword: (v: string) => void;

  isLogin: boolean;
  setIsLogin: (v: boolean) => void;

  emailError: string;
  googleLoading?: boolean;
  googleError?: string;
}

export const LandingPage: React.FC<Props> = ({
  onGoogleLogin,
  onSendOtp,
  onVerifyOtp,
  onEmailLogin,
  onEmailSignup,
  phoneStep,
  setPhoneStep,
  countryCode,
  setCountryCode,
  phoneNumber,
  setPhoneNumber,
  otp,
  setOtp,
  phoneError,
  phoneLoading,
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  isLogin,
  setIsLogin,
  emailError,
  googleLoading = false,
  googleError = '',
}) => {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTabChange = (mode: 'phone' | 'email') => {
    setAuthMode(mode);
    setPhoneStep('idle');
    setOtp('');
  };

  // Country codes for phone auth
  const countryCodes = [
    { code: '+91', name: 'India 🇮🇳' },
    { code: '+1', name: 'USA/Canada 🇺🇸🇨🇦' },
    { code: '+44', name: 'United Kingdom 🇬🇧' },
    { code: '+971', name: 'UAE 🇦🇪' },
    { code: '+966', name: 'Saudi Arabia 🇸🇦' },
    { code: '+965', name: 'Kuwait 🇰🇼' },
    { code: '+974', name: 'Qatar 🇶🇦' },
    { code: '+973', name: 'Bahrain 🇧🇭' },
    { code: '+968', name: 'Oman 🇴🇲' },
    { code: '+972', name: 'Israel 🇮🇱' },
    { code: '+90', name: 'Turkey 🇹🇷' },
    { code: '+61', name: 'Australia 🇦🇺' },
    { code: '+65', name: 'Singapore 🇸🇬' },
    { code: '+852', name: 'Hong Kong 🇭🇰' },
    { code: '+81', name: 'Japan 🇯🇵' },
    { code: '+82', name: 'South Korea 🇰🇷' },
    { code: '+86', name: 'China 🇨🇳' },
    { code: '+49', name: 'Germany 🇩🇪' },
    { code: '+33', name: 'France 🇫🇷' },
    { code: '+39', name: 'Italy 🇮🇹' },
    { code: '+34', name: 'Spain 🇪🇸' },
    { code: '+31', name: 'Netherlands 🇳🇱' },
    { code: '+41', name: 'Switzerland 🇨🇭' },
    { code: '+46', name: 'Sweden 🇸🇪' },
    { code: '+47', name: 'Norway 🇳🇴' },
    { code: '+45', name: 'Denmark 🇩🇰' },
    { code: '+358', name: 'Finland 🇫🇮' },
    { code: '+353', name: 'Ireland 🇮🇪' },
    { code: '+351', name: 'Portugal 🇵🇹' },
    { code: '+352', name: 'Luxembourg 🇱🇺' },
    { code: '+354', name: 'Iceland 🇮🇸' },
    { code: '+370', name: 'Lithuania 🇱🇹' },
    { code: '+371', name: 'Latvia 🇱🇻' },
    { code: '+372', name: 'Estonia 🇪🇪' },
    { code: '+374', name: 'Armenia 🇦🇲' },
    { code: '+375', name: 'Belarus 🇧🇾' },
    { code: '+380', name: 'Ukraine 🇺🇦' },
    { code: '+381', name: 'Serbia 🇷🇸' },
    { code: '+385', name: 'Croatia 🇭🇷' },
    { code: '+386', name: 'Slovenia 🇸🇮' },
    { code: '+387', name: 'Bosnia 🇧🇦' },
    { code: '+389', name: 'North Macedonia 🇲🇰' },
    { code: '+420', name: 'Czech Republic 🇨🇿' },
    { code: '+421', name: 'Slovakia 🇸🇰' },
    { code: '+423', name: 'Liechtenstein 🇱🇮' },
    { code: '+359', name: 'Bulgaria 🇧🇬' },
    { code: '+355', name: 'Albania 🇦🇱' },
    { code: '+356', name: 'Malta 🇲🇹' },
    { code: '+357', name: 'Cyprus 🇨🇾' },
    { code: '+383', name: 'Kosovo 🇽🇰' },
    { code: '+995', name: 'Georgia 🇬🇪' },
    { code: '+994', name: 'Azerbaijan 🇦🇿' },
    { code: '+996', name: 'Kyrgyzstan 🇰🇬' },
    { code: '+992', name: 'Tajikistan 🇹🇯' },
    { code: '+993', name: 'Turkmenistan 🇹🇲' },
    { code: '+998', name: 'Uzbekistan 🇺🇿' },
    { code: '+976', name: 'Mongolia 🇲🇳' },
    { code: '+880', name: 'Bangladesh 🇧🇩' },
    { code: '+94', name: 'Sri Lanka 🇱🇰' },
    { code: '+977', name: 'Nepal 🇳🇵' },
    { code: '+975', name: 'Bhutan 🇧🇹' },
    { code: '+960', name: 'Maldives 🇲🇻' },
    { code: '+855', name: 'Cambodia 🇰🇭' },
    { code: '+84', name: 'Vietnam 🇻🇳' },
    { code: '+62', name: 'Indonesia 🇮🇩' },
    { code: '+60', name: 'Malaysia 🇲🇾' },
    { code: '+63', name: 'Philippines 🇵🇭' },
    { code: '+66', name: 'Thailand 🇹🇭' },
    { code: '+95', name: 'Myanmar 🇲🇲' },
    { code: '+856', name: 'Laos 🇱🇦' },
    { code: '+597', name: 'Suriname 🇸🇷' },
    { code: '+592', name: 'Guyana 🇬🇾' },
    { code: '+591', name: 'Bolivia 🇧🇴' },
    { code: '+593', name: 'Ecuador 🇪🇨' },
    { code: '+595', name: 'Paraguay 🇵🇾' },
    { code: '+598', name: 'Uruguay 🇺🇾' },
    { code: '+54', name: 'Argentina 🇦🇷' },
    { code: '+55', name: 'Brazil 🇧🇷' },
    { code: '+56', name: 'Chile 🇨🇱' },
    { code: '+57', name: 'Colombia 🇨🇴' },
    { code: '+58', name: 'Venezuela 🇻🇪' },
    { code: '+503', name: 'El Salvador 🇸🇻' },
    { code: '+502', name: 'Guatemala 🇬🇹' },
    { code: '+504', name: 'Honduras 🇭🇳' },
    { code: '+505', name: 'Nicaragua 🇳🇮' },
    { code: '+506', name: 'Costa Rica 🇨🇷' },
    { code: '+507', name: 'Panama 🇵🇦' },
    { code: '+52', name: 'Mexico 🇲🇽' },
    { code: '+53', name: 'Cuba 🇨🇺' },
    { code: '+1', name: 'Puerto Rico 🇵🇷' },
    { code: '+1', name: 'US Virgin Islands 🇻🇮' },
    { code: '+27', name: 'South Africa 🇿🇦' },
    { code: '+20', name: 'Egypt 🇪🇬' },
    { code: '+212', name: 'Morocco 🇲🇦' },
    { code: '+213', name: 'Algeria 🇩🇿' },
    { code: '+216', name: 'Tunisia 🇹🇳' },
    { code: '+218', name: 'Libya 🇱🇾' },
    { code: '+234', name: 'Nigeria 🇳🇬' },
    { code: '+233', name: 'Ghana 🇬🇭' },
    { code: '+254', name: 'Kenya 🇰🇪' },
    { code: '+255', name: 'Tanzania 🇹🇿' },
    { code: '+256', name: 'Uganda 🇺🇬' },
    { code: '+258', name: 'Mozambique 🇲🇿' },
    { code: '+260', name: 'Zambia 🇿🇲' },
    { code: '+263', name: 'Zimbabwe 🇿🇼' },
  ];

  // Sort by priority: India, USA/Canada, UK, Middle East, then alphabetical
  const sortedCountryCodes = [...countryCodes].sort((a, b) => {
    const priority = ['+91', '+1', '+44', '+971', '+966', '+965', '+974', '+973', '+968', '+972', '+90'];
    const indexA = priority.indexOf(a.code);
    const indexB = priority.indexOf(b.code);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleContinue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (authMode === 'phone') {
        if (phoneStep === 'idle') {
          await onSendOtp();
        }
      } else if (isLogin) {
        await onEmailLogin(email, password);
      } else {
        await onEmailSignup(email, password);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (otp.length !== 6) return;

    try {
      await onVerifyOtp(otp);
    } catch (error) {
      console.error('OTP verification error:', error);
    }
  };

  const handleResendOtp = async () => {
    try {
      await onSendOtp();
    } catch (error) {
      console.error('Resend OTP error:', error);
    }
  };

  const handleBackToPhone = () => {
    setAuthMode('phone');
    setPhoneStep('idle');
    setOtp('');
  };

  return (
    <div className="min-h-screen bg-white text-[#1e1b2e]">
      {/* Header */}
      <header className="w-full border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#7848f4] flex items-center justify-center text-white font-black">
              PB
            </div>

            <span className="text-2xl font-extrabold">
              <span className="text-[#7848f4]">Paisa</span>
              <span className="text-[#f59e0b]">Bharo</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-700">
            {[
              { id: 'how', label: 'How It Works' },
              { id: 'earn', label: 'Earn' },
              { id: 'reviews', label: 'Reviews' },
              { id: 'faq', label: 'FAQ' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                className="hover:text-[#7848f4]"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Theme"
              className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center"
            >
              <Moon className="w-4 h-4" />
            </button>

            <button
              type="button"
              aria-label="Language"
              className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center"
            >
              <Globe className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => scrollTo('join')}
              className="hidden sm:inline-block px-5 py-2.5 rounded-lg bg-[#7848f4] text-white font-bold"
            >
              START EARNING
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-4">
              <span>🏆</span>
              #1 Earning App
            </div>

            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-4">
              Get Paid to Share
              <br />
              Your Opinion
            </h1>

            <p className="text-lg text-gray-600 mb-10 max-w-xl">
              Turn your spare time into real money with surveys and offers
              anytime, anywhere.
            </p>
          </div>

          {/* Registration Card */}
          <div id="join" className="lg:pl-12">
            <div className="bg-[#f7f8fc] rounded-3xl border border-[#e5dcfa] p-8 shadow-sm">
              <h2 className="text-2xl font-extrabold mb-2">Join for free!</h2>

              <p className="text-sm text-[#7848f4] font-semibold mb-6">
                🎉 Signup now and claim your ₹10 bonus
              </p>

              {/* Authentication Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => handleTabChange('phone')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                    authMode === 'phone'
                      ? 'bg-[#7848f4] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Smartphone className="w-4 h-4 inline mr-1" />
                  Phone
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('email')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                    authMode === 'email'
                      ? 'bg-[#7848f4] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </button>
              </div>

              {/* Phone / Email authentication */}
              {authMode === 'phone' ? (
                phoneStep === 'idle' ? (
                  <form onSubmit={handleContinue} className="space-y-4">
                    <div className="relative">
                      <div className="flex gap-2">
                        {/* Country Code Selector */}
                        <div className="relative">
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="w-28 px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7848f4] bg-white text-sm appearance-none cursor-pointer"
                          >
                            {sortedCountryCodes.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.code} {country.name.split(' ').pop()}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        <input
                          type="tel"
                          placeholder="Mobile number"
                          value={phoneNumber}
                          onChange={(e) =>
                            setPhoneNumber(
                              e.target.value.replace(/\D/g, '').slice(0, 10)
                            )
                          }
                          maxLength={10}
                          required
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7848f4]"
                        />
                      </div>
                    </div>

                    {phoneError && (
                      <div className="text-red-600 text-sm">{phoneError}</div>
                    )}

                    <button
                      type="submit"
                      disabled={phoneLoading || phoneNumber.length !== 10}
                      className="w-full py-3 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] text-white font-bold disabled:opacity-60"
                    >
                      {phoneLoading ? 'Processing...' : 'CONTINUE'}
                    </button>
                  </form>
                ) : (
                  /* OTP verification */
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <p className="text-sm text-gray-600 text-center">
                      Enter the 6-digit verification code sent to your mobile.
                    </p>

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center tracking-widest"
                    />

                    {phoneError && (
                      <div className="text-red-600 text-sm">{phoneError}</div>
                    )}

                    <button
                      type="submit"
                      disabled={phoneLoading || otp.length !== 6}
                      className="w-full py-3 rounded-xl bg-[#1e1b2e] text-white font-bold disabled:opacity-60"
                    >
                      {phoneLoading ? 'Verifying...' : 'VERIFY OTP'}
                    </button>

                    <button
                      type="button"
                      onClick={handleBackToPhone}
                      className="w-full py-2 text-sm text-[#7848f4] font-semibold"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={phoneLoading}
                      className="w-full py-2 text-sm text-gray-600 font-semibold"
                    >
                      Resend OTP
                    </button>
                  </form>
                )
              ) : (
                /* Email authentication */
                <form onSubmit={handleContinue} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7848f4]"
                  />

                  <input
                    type="password"
                    placeholder={isLogin ? 'Password' : 'Create password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isLogin ? undefined : 6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7848f4]"
                  />

                  {emailError && (
                    <div className="text-red-600 text-sm">{emailError}</div>
                  )}

                  <button
                    type="submit"
                    disabled={phoneLoading}
                    className="w-full py-3 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] text-white font-bold disabled:opacity-60"
                  >
                    {phoneLoading
                      ? 'Processing...'
                      : isLogin
                      ? 'LOGIN'
                      : 'SIGN UP'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="w-full py-2 text-sm text-[#7848f4] font-semibold"
                  >
                    {isLogin
                      ? "Don't have an account? Sign up"
                      : 'Already have an account? Login'}
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-500">OR</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* Google Login */}
              <button
                type="button"
                onClick={onGoogleLogin}
                disabled={googleLoading}
                className="w-full py-3 rounded-xl border-2 border-[#7848f4] bg-white text-[#7848f4] font-bold flex items-center justify-center gap-3 hover:bg-[#f7f4fe] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {googleLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#7848f4] border-t-transparent rounded-full animate-spin" />
                    <span>OPENING GOOGLE SIGN-IN...</span>
                  </div>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.8S8.9 5.8 12 5.8c1.7 0 2.8.7 3.5 1.3l2.4-2.3C16.7 3.6 14.6 2.8 12 2.8 6.9 2.8 2.9 6.8 2.9 12s4 9.2 9.1 9.2c5.2 0 8.8-3.7 8.8-9 0-.6-.1-1-.2-1.4H12z"
                      />
                    </svg>
                    <span>CONTINUE WITH GOOGLE</span>
                  </>
                )}
              </button>

              {googleError && (
                <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-left space-y-2">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span className="text-red-500 font-bold">!</span> Google Sign-In Notice
                  </div>
                  <div>{googleError}</div>
                  {(googleError.toLowerCase().includes('pop-up') ||
                    googleError.toLowerCase().includes('tab') ||
                    googleError.toLowerCase().includes('domain') ||
                    googleError.toLowerCase().includes('block')) && (
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-xs text-[#7848f4] font-bold underline hover:text-[#5d31cf]"
                    >
                      Open app in a new browser tab &rarr;
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="border-y border-gray-100 bg-[#f7f8fc]">
        <div className="max-w-7xl mx-auto px-6 py-10 text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-6">
            Withdraw cash via UPI or Gift Cards
          </h3>

          <div className="flex flex-wrap items-center justify-center gap-10 opacity-80">
            {[
              'PayPal',
              'Google Play',
              'zomato',
              'JioHotstar',
              'amazon',
              'PhonePe',
              'zepto',
            ].map((item, idx) => (
              <div key={`brand-${idx}-${item}`} className="font-bold text-gray-600">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Information Sections */}
      <section id="how" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-extrabold mb-4">How It Works</h2>
        <p className="text-gray-600">
          Sign up, complete surveys and offers, earn coins, cash out.
        </p>
      </section>

      <section id="earn" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-extrabold mb-4">Earn</h2>
        <p className="text-gray-600">
          Polls, surveys, offerwalls, referrals and cashback.
        </p>
      </section>

      <section id="reviews" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-extrabold mb-4">Reviews</h2>
        <p className="text-gray-600">Trusted by thousands of users worldwide.</p>
      </section>

      <section id="faq" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-extrabold mb-4">FAQ</h2>
        <p className="text-gray-600">Answers to common questions.</p>
      </section>

      {/* Firebase reCAPTCHA container: kept mounted so the verifier isn't torn down */}
      <div id="recaptcha-container" style={{ visibility: 'hidden' }} />
    </div>
  );
};