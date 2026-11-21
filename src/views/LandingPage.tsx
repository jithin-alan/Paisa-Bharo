import React, { useRef, useState, useEffect } from 'react';
import { Moon, Globe, Mail, Smartphone, AlertCircle, ExternalLink, Star } from 'lucide-react';
import { LegalComplianceModal, LegalTabType } from '../components/LegalComplianceModal';
import { getLegalDocumentUrls } from '../config/legalLinks';

// Standard SVG Icons (inline for no external dependencies)
const PayPalIcon = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.52 16.34c-.24.42-.6.72-1.02 1.02-1.2.84-2.58 1.44-4.5 1.44-3.66 0-6.6-2.58-6.6-5.76 0-2.04 1.08-3.96 2.88-5.16-.12-.12-.24-.3-.24-.48 0-.42.24-.78.72-1.02.42-.24.96-.36 1.56-.36.9 0 1.62.48 1.92 1.2.24.6 1.2 1.2 2.58 1.2 1.5 0 2.82-.96 3.36-2.28.18-.36.18-.78.06-1.08-.12-.18-.48-.36-.9-.36-.6 0-1.02.36-1.14.78-.12.36-.3.96-.6 1.62-.6 1.32-1.8 2.76-1.8 4.56 0 2.94 2.22 5.16 5.76 5.16 1.98 0 3.66-1.14 4.56-2.94.18-.36.18-.78 0-1.14-.12-.3-.42-.54-.78-.66zM7.2 11.52c0-1.8 1.32-3.24 3.24-3.24 1.2 0 2.22.6 2.76 1.56.06.12.18.18.3.18.12 0 .18-.06.3-.18.6-.96 1.68-1.56 2.88-1.56 1.92 0 3.24 1.44 3.24 3.24 0 1.74-1.32 3.18-3.24 3.18-1.92 0-3.24-1.44-3.24-3.18zm8.64 0c0 1.86-1.38 3.36-3.36 3.36-1.14 0-2.22-.6-2.76-1.56-.06-.12-.18-.18-.3-.18-.12 0-.24.06-.3.18-.54.96-1.62 1.56-2.82 1.56-1.98 0-3.3-1.5-3.3-3.36 0-1.8 1.32-3.24 3.3-3.24 1.14 0 2.22.6 2.76 1.56.06.12.12.18.24.18.12 0 .18-.06.24-.18.6-.96 1.62-1.56 2.82-1.56 1.92 0 3.36 1.44 3.36 3.24z"/>
  </svg>
);

const UPIIcon = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M2 10h20"/>
    <path d="M7 14h10"/>
    <circle cx="12" cy="7" r="2" fill="currentColor"/>
    <path d="M12 9v3M12 16v-3"/>
  </svg>
);

// Social Media Icons (B&W)
const FacebookIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const InstagramIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const XIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 9.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 1.75h-3.308l7.227-8.26-8.502-9.24h3.583l5.214 6.817L19.01 2.25h3.318l-7.73 8.835 5.214 6.817h-3.583l-4.713-6.231z"/>
  </svg>
);

const YouTubeIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const DiscordIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.442.778-.693 1.206a17.77 17.77 0 0 0-5.315 1.323.077.077 0 0 1-.083-.028.077.077 0 0 0-.083.028 21.327 21.327 0 0 0-.944.868.077.077 0 0 1-.155.006.077.077 0 0 0-.082-.123 19.525 19.525 0 0 0-3.086-3.086.077.077 0 0 1-.006-.155.077.077 0 0 0-.123-.082c-.36-.215-.75-.407-1.163-.577a.076.076 0 0 1-.028-.083.077.077 0 0 0-.028.083 17.234 17.234 0 0 0-1.323-5.315.077.077 0 0 1-.028-.083.077.077 0 0 0-.028.083c-.429.25-.83.483-1.205.694a19.796 19.796 0 0 0-1.516 4.885.077.077 0 0 1-.083.028.077.077 0 0 0-.083-.028c-.376-.21-.779-.442-1.206-.693a17.77 17.77 0 0 0-1.323 5.315.077.077 0 0 1 .028.083.077.077 0 0 0 .028-.083c.215-.36.407-.75.577-1.163a.077.077 0 0 1 .083-.028.077.077 0 0 0 .083.028c.36.215.75.407 1.163.577a.077.077 0 0 1 .083.028.077.077 0 0 0 .083-.028c.215.36.407.75.577 1.163a.077.077 0 0 1-.028.083.077.077 0 0 0-.028.083c-.25.428-.482.83-.693 1.205a19.796 19.796 0 0 0 4.885 1.516.077.077 0 0 1 .083-.028.077.077 0 0 0 .083.028c.376.21.779.442 1.206.693a17.77 17.77 0 0 0 1.323-5.315.077.077 0 0 1-.028-.083.077.077 0 0 0-.028-.083c-.428-.25-.83-.482-1.205-.694a.077.077 0 0 1 .028-.083.077.077 0 0 0 .028-.083c.428-.25.83-.483 1.205-.694a19.791 19.791 0 0 0 1.515-4.885.077.077 0 0 1 .083-.028.077.077 0 0 0 .083.028c.375.21.778.442 1.205.693a17.77 17.77 0 0 0 5.315-1.323.077.077 0 0 1 .083.028.077.077 0 0 0 .083-.028c.36-.215.75-.407 1.163-.577a.076.076 0 0 1 .028-.083.077.077 0 0 0 .028-.083c-.215-.36-.407-.75-.577-1.163a.077.077 0 0 1-.083-.028.077.077 0 0 0-.083.028c-.36-.215-.75-.407-1.163-.577a.077.077 0 0 1-.083.028.077.077 0 0 0-.083-.028c-.215-.36-.407-.75-.577-1.163a.077.077 0 0 1 .028-.083.077.077 0 0 0 .028-.083c.25-.428.482-.83.693-1.205a19.796 19.796 0 0 0-1.515-4.885.077.077 0 0 1-.083.028.077.077 0 0 0-.083-.028zM12 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6zm0-2c2.209 0 4-1.791 4-4S14.209 8 12 8 8 9.791 8 12s1.791 4 4 4z"/>
  </svg>
);

// App Screenshots from assets
const APP_SCREENSHOTS = [
  '/assets/aistudio/Screenshot_2026-11-09_at_10.09.43_AM_8c2dbb14.png',
  '/assets/aistudio/Screenshot_2026-11-18_at_8.44.09_PM_0816a48d.png',
];

// Dummy Reviews
const DUMMY_REVIEWS = [
  {
    name: 'Priya Sharma',
    avatar: 'PS',
    rating: 5,
    text: 'Amazing app! Earned ₹2,500 in my first month just by sharing opinions. UPI withdrawal was instant.',
    date: '2 days ago',
  },
  {
    name: 'Rahul K.',
    avatar: 'RK',
    rating: 5,
    text: 'Best survey app I\'ve used. No disqualifications like other apps. The referral bonus is a nice touch.',
    date: '1 week ago',
  },
  {
    name: 'Anita Desai',
    avatar: 'AD',
    rating: 4,
    text: 'Good variety of surveys and offers. Customer support responds quickly. Would love more payout options.',
    date: '2 weeks ago',
  },
  {
    name: 'Mohammed Ali',
    avatar: 'MA',
    rating: 5,
    text: 'Legit earning app. Cashed out ₹5,000 to PayPal last week, received in 24 hours. Highly recommended!',
    date: '3 weeks ago',
  },
];

interface Props {
  onGoogleLogin: (consentAccepted: boolean) => void;
  onSendOtp: () => Promise<void>;
  onVerifyOtp: (otp: string, consentAccepted: boolean) => Promise<void>;
  onEmailLogin: (email: string, password: string, consentAccepted: boolean) => Promise<void>;
  onEmailSignup: (email: string, password: string, consentAccepted: boolean) => Promise<void>;
  onNavigatePath?: (path: string) => void;

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
  onNavigatePath,
}) => {
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [selectedLegalTab, setSelectedLegalTab] = useState<LegalTabType>('privacy');
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
  const [legalConsentError, setLegalConsentError] = useState('');
  const consentCheckboxRef = useRef<HTMLInputElement | null>(null);
  const [marqueeOffset, setMarqueeOffset] = useState(0);
  const { termsOfServiceUrl, privacyPolicyUrl } = getLegalDocumentUrls();

  // Marquee animation for payment methods banner
  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      setMarqueeOffset((prev) => prev - 0.5);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const openLegalModal = (tab: LegalTabType) => {
    setSelectedLegalTab(tab);
    setLegalModalOpen(true);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTabChange = (mode: 'phone' | 'email') => {
    setAuthMode(mode);
    setPhoneStep('idle');
    setOtp('');
  };

  const ensureLegalConsent = (): boolean => {
    if (acceptedLegalTerms) {
      if (legalConsentError) setLegalConsentError('');
      return true;
    }
    setLegalConsentError('Please accept the Terms of Service and Privacy Policy to continue.');
    consentCheckboxRef.current?.focus();
    return false;
  };

  const handleFooterPolicyLink = (
    e: React.MouseEvent<HTMLAnchorElement>,
    url: string,
    localPath: '/terms' | '/privacy'
  ) => {
    if (url.startsWith('/') && onNavigatePath) {
      e.preventDefault();
      onNavigatePath(localPath);
    }
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

    const isExistingEmailLogin = authMode === 'email' && isLogin;
    if (!isExistingEmailLogin && !ensureLegalConsent()) {
      return;
    }

    try {
      if (authMode === 'phone') {
        if (phoneStep === 'idle') {
          await onSendOtp();
        }
      } else if (isLogin) {
        await onEmailLogin(email, password, acceptedLegalTerms);
      } else {
        await onEmailSignup(email, password, acceptedLegalTerms);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  const handleGoogleAuthClick = () => {
    if (!ensureLegalConsent()) {
      return;
    }
    onGoogleLogin(true);
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (otp.length !== 6) return;
    if (!ensureLegalConsent()) return;

    try {
      await onVerifyOtp(otp, acceptedLegalTerms);
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

  // Duplicate items for seamless marquee loop
  const marqueeItems = [
    { icon: <PayPalIcon className="w-10 h-10 text-[#003087]" />, label: 'PayPal', color: '#003087' },
    { icon: <UPIIcon className="w-10 h-10 text-[#6A1B9A]" />, label: 'UPI', color: '#6A1B9A' },
  ];

  const duplicatedItems = [...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems];

  return (
    <div className="min-h-screen bg-white text-[#1e1b2e]">
      {/* Header */}
      <header className="w-full border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Paisa Bharo Logo"
              className="w-9 h-9 rounded-xl object-cover shadow-sm"
            />

            <span className="text-2xl font-extrabold">
              <span className="text-[#072ac8]">Paisa</span>
              <span className="text-[#fb8500]">Bharo</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-700">
            {[
              { id: 'how', label: 'How It Works' },
              { id: 'earn', label: 'Earn' },
              { id: 'reviews', label: 'Reviews' },
              { id: 'faq', label: 'FAQ' },
            ].map((item, idx) => (
              <button
                key={`landing-nav-${item.id}-${idx}`}
                type="button"
                onClick={() => scrollTo(item.id)}
                className="hover:text-[#072ac8]"
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
              className="hidden sm:inline-block px-5 py-2.5 rounded-lg bg-[#072ac8] text-white font-bold"
            >
              START EARNING
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[calc(var(--viewport-height)-80px)] flex items-center justify-center">
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
            <div className="bg-[#f7f8fc] rounded-3xl border border-[#bde0fe] p-8 shadow-sm">
              <h2 className="text-2xl font-extrabold mb-4">Join for free!</h2>

              {/* Required User Consent for All Registration Methods */}
              <div
                className={`mb-5 rounded-2xl border p-3.5 transition-colors ${
                  legalConsentError
                    ? 'bg-red-50 border-red-300'
                    : 'bg-white border-[#bde0fe]'
                }`}
              >
                <label
                  htmlFor="registration-legal-consent"
                  className="flex items-start gap-3 cursor-pointer min-h-[44px] text-xs sm:text-[13px] leading-relaxed text-[#1e1b2e]"
                >
                  <input
                    ref={consentCheckboxRef}
                    id="registration-legal-consent"
                    type="checkbox"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(legalConsentError)}
                    checked={acceptedLegalTerms}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAcceptedLegalTerms(checked);
                      if (checked && legalConsentError) {
                        setLegalConsentError('');
                      }
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-[#072ac8] accent-[#072ac8] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#072ac8] focus-visible:ring-offset-2"
                  />
                  <span>
                    I have read and agree to the{' '}
                    <a
                      href={termsOfServiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-0.5 font-bold text-[#072ac8] underline underline-offset-2 hover:text-[#05219e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#072ac8] rounded"
                    >
                      <span>Terms of Service</span>
                      <ExternalLink className="w-3 h-3 inline shrink-0" aria-hidden="true" />
                    </a>{' '}
                    and{' '}
                    <a
                      href={privacyPolicyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-0.5 font-bold text-[#072ac8] underline underline-offset-2 hover:text-[#05219e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#072ac8] rounded"
                    >
                      <span>Privacy Policy</span>
                      <ExternalLink className="w-3 h-3 inline shrink-0" aria-hidden="true" />
                    </a>
                    .
                  </span>
                </label>

                {legalConsentError && (
                  <div
                    role="alert"
                    className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-red-700 pl-8"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{legalConsentError}</span>
                  </div>
                )}
              </div>

              {/* Authentication Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => handleTabChange('phone')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                    authMode === 'phone'
                      ? 'bg-[#072ac8] text-white'
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
                      ? 'bg-[#072ac8] text-white'
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
                            className="w-28 px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#072ac8] bg-white text-sm appearance-none cursor-pointer"
                          >
                            {sortedCountryCodes.map((country, idx) => (
                              <option key={`country-${country.code}-${country.name}-${idx}`} value={country.code}>
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
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#072ac8]"
                        />
                      </div>
                    </div>

                    {phoneError && (
                      <div className="text-red-600 text-sm">{phoneError}</div>
                    )}

                    <button
                      type="submit"
                      disabled={phoneLoading || phoneNumber.length !== 10}
                      className="w-full py-3 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white font-bold disabled:opacity-60 cursor-pointer transition shadow-sm"
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
                      className="w-full py-2 text-sm text-[#072ac8] font-semibold"
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#072ac8]"
                  />

                  <input
                    type="password"
                    placeholder={isLogin ? 'Password' : 'Create password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isLogin ? undefined : 6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#072ac8]"
                  />

                  {emailError && (
                    <div className="text-red-600 text-sm">{emailError}</div>
                  )}

                  <button
                    type="submit"
                    disabled={phoneLoading}
                    className="w-full py-3 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white font-bold disabled:opacity-60 cursor-pointer transition shadow-sm"
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
                    className="w-full py-2 text-sm text-[#072ac8] font-semibold"
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
                onClick={handleGoogleAuthClick}
                disabled={googleLoading}
                className="w-full py-3 rounded-xl border-2 border-[#072ac8] bg-white text-[#072ac8] font-bold flex items-center justify-center gap-3 hover:bg-[#e6f4fa] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {googleLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#072ac8] border-t-transparent rounded-full animate-spin" />
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
                  {googleError.toLowerCase().includes('not authorized') ? (
                    <div className="space-y-1.5 pt-1">
                      {typeof window !== 'undefined' && (
                        <div className="text-[11px] text-gray-700">
                          Domain to authorize:{' '}
                          <code className="px-1.5 py-0.5 rounded bg-white border border-red-200 font-mono text-[11px] select-all">
                            {window.location.hostname}
                          </code>
                        </div>
                      )}
                      {typeof window !== 'undefined' &&
                        window.location.hostname !== 'paisa-bharo-app.web.app' && (
                          <a
                            href="https://paisa-bharo-app.web.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-xs text-[#072ac8] font-bold underline hover:text-[#05219e]"
                          >
                            Open authorized app (paisa-bharo-app.web.app) &rarr;
                          </a>
                        )}
                    </div>
                  ) : (
                    (googleError.toLowerCase().includes('pop-up') ||
                      googleError.toLowerCase().includes('tab') ||
                      googleError.toLowerCase().includes('block')) && (
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1 text-xs text-[#072ac8] font-bold underline hover:text-[#05219e]"
                      >
                        Open app in a new browser tab &rarr;
                      </a>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Payment Methods - Moving Banner */}
      <section className="bg-white border-y border-gray-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h3 className="text-xl font-semibold text-gray-700 mb-6 text-center">
            Withdraw your earnings via
          </h3>
          <div className="relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
            <div
              className="flex items-center gap-8 whitespace-nowrap will-change-transform"
              style={{
                transform: `translateX(${marqueeOffset}px)`,
                animationDuration: '30s',
              }}
              aria-label="Payment methods"
            >
              {duplicatedItems.map((item, idx) => (
                <div
                  key={`marquee-${item.label}-${idx}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 shrink-0"
                  style={{ minWidth: '120px' }}
                >
                  <span className="text-gray-400">{item.icon}</span>
                  <span className="font-semibold text-gray-700 whitespace-nowrap">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - App Screenshots */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1e1b2e] mb-4">How It Works</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Simple steps to start earning real money with your opinions
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: 1, title: 'Sign Up Free', desc: 'Create account in seconds with phone, email, or Google' },
            { step: 2, title: 'Complete Surveys', desc: 'Answer polls, surveys & offers from top brands' },
            { step: 3, title: 'Earn Coins', desc: 'Every completion adds coins to your balance instantly' },
            { step: 4, title: 'Cash Out', desc: 'Withdraw via UPI or PayPal - fast & secure' },
          ].map((item, idx) => (
            <div
              key={`how-${item.step}`}
              className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:border-[#072ac8] hover:shadow-lg transition-all duration-300"
            >
              <div className="absolute -top-3 left-6 w-8 h-8 rounded-full bg-[#072ac8] text-white font-extrabold text-sm flex items-center justify-center">
                {item.step}
              </div>
              <h3 className="text-lg font-bold text-[#1e1b2e] mt-8 mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}

          {/* App Screenshots Carousel */}
          <div className="md:col-span-2 lg:col-span-4 mt-8 relative">
            <div className="grid md:grid-cols-2 gap-6">
              {APP_SCREENSHOTS.map((src, idx) => (
                <div
                  key={`screenshot-${idx}`}
                  className="relative group rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-[16/10] cursor-pointer"
                >
                  <img
                    src={src}
                    alt={`Paisa Bharo App Screenshot ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-4 left-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <p className="font-semibold text-lg">App Preview {idx + 1}</p>
                    <p className="text-sm text-white/80">Tap to explore the interface</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Earn Section */}
      <section id="earn" className="max-w-7xl mx-auto px-6 py-20 bg-[#f7f8fc] rounded-3xl my-20 mx-6">
        <div className="text-center mb-12 px-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1e1b2e] mb-4">Ways to Earn</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Multiple earning opportunities tailored for you
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 px-6">
          {[
            { icon: '📊', title: 'Daily Polls', desc: 'Quick 30-sec opinion polls', reward: '50-100 Coins' },
            { icon: '📝', title: 'Surveys', desc: 'In-depth market research', reward: '200-1000 Coins' },
            { icon: '🎮', title: 'Offerwalls', desc: 'Games, apps & trials', reward: '500-5000 Coins' },
            { icon: '👥', title: 'Referrals', desc: 'Invite friends, earn 10% lifetime', reward: '500 Coins + 10%' },
          ].map((item, idx) => (
            <div
              key={`earn-${idx}`}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-[#072ac8] hover:shadow-lg transition-all duration-300 text-center group"
            >
              <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">{item.icon}</span>
              <h3 className="text-lg font-bold text-[#1e1b2e] mb-1">{item.title}</h3>
              <p className="text-gray-600 text-sm mb-3">{item.desc}</p>
              <span className="inline-block px-3 py-1 rounded-full bg-[#e6f4fa] text-[#072ac8] text-xs font-bold">
                {item.reward}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1e1b2e] mb-4">Trusted by Thousands</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Real users, real earnings, real feedback
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {DUMMY_REVIEWS.map((review, idx) => (
            <div
              key={`review-${idx}`}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-[#072ac8] hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#e6f4fa] text-[#072ac8] font-bold flex items-center justify-center">
                  {review.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{review.name}</p>
                  <p className="text-xs text-gray-500">{review.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={`star-${i}`}
                    className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="text-gray-600 text-sm flex-1 leading-relaxed">"{review.text}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6 safe-x">
          {/* Centered App Name - Exact header colors/font */}
          <div className="text-center">
            <span className="text-2xl font-extrabold">
              <span className="text-[#072ac8]">Paisa</span>
              <span className="text-[#fb8500]">Bharo</span>
            </span>
          </div>

          {/* Social Icons - B&W */}
          <div className="flex items-center gap-6">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 transition-colors" aria-label="Facebook">
              <FacebookIcon className="w-5 h-5" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 transition-colors" aria-label="Instagram">
              <InstagramIcon className="w-5 h-5" />
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 transition-colors" aria-label="X (Twitter)">
              <XIcon className="w-5 h-5" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 transition-colors" aria-label="YouTube">
              <YouTubeIcon className="w-5 h-5" />
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 transition-colors" aria-label="Discord">
              <DiscordIcon className="w-5 h-5" />
            </a>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-gray-600">
            <a
              href={privacyPolicyUrl}
              onClick={(e) => handleFooterPolicyLink(e, privacyPolicyUrl, '/privacy')}
              target={privacyPolicyUrl.startsWith('/') ? undefined : '_blank'}
              rel={privacyPolicyUrl.startsWith('/') ? undefined : 'noopener noreferrer'}
              className="hover:text-[#072ac8] transition cursor-pointer"
            >
              Privacy Policy
            </a>
            <span className="text-gray-400">•</span>
            <a
              href={termsOfServiceUrl}
              onClick={(e) => handleFooterPolicyLink(e, termsOfServiceUrl, '/terms')}
              target={termsOfServiceUrl.startsWith('/') ? undefined : '_blank'}
              rel={termsOfServiceUrl.startsWith('/') ? undefined : 'noopener noreferrer'}
              className="hover:text-[#072ac8] transition cursor-pointer"
            >
              Terms of Service
            </a>
            <span className="text-gray-400">•</span>
            <button onClick={() => openLegalModal('rewards')} className="hover:text-[#072ac8] transition cursor-pointer">
              Reward Policy (1000 Coins = $1.00)
            </button>
            <span className="text-gray-400">•</span>
            <button onClick={() => openLegalModal('support')} className="hover:text-[#072ac8] transition cursor-pointer">
              Customer Support
            </button>
            <span className="text-gray-400">•</span>
            <button onClick={() => openLegalModal('deletion')} className="hover:text-[#072ac8] text-red-600 transition cursor-pointer">
              Data & Account Deletion
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            © 2025 Paisa Bharo. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Firebase reCAPTCHA container: kept mounted so the verifier isn't torn down */}
      <div id="recaptcha-container" style={{ visibility: 'hidden' }} />

      {/* Legal Modal Render */}
      <LegalComplianceModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={selectedLegalTab}
      />
    </div>
  );
};