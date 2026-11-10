import React from 'react';

// Purple 3D Wallet with cash sticking out (matches PollPe reference image left card)
export const WalletIllustration: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="walletGrad" x1="10%" y1="10%" x2="90%" y2="90%">
        <stop offset="0%" stopColor="#8E52F5" />
        <stop offset="60%" stopColor="#6C2EE8" />
        <stop offset="100%" stopColor="#4F1DB8" />
      </linearGradient>
      <linearGradient id="cashGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ADE80" />
        <stop offset="100%" stopColor="#16A34A" />
      </linearGradient>
      <linearGradient id="cashGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#86EFAC" />
        <stop offset="100%" stopColor="#22C55E" />
      </linearGradient>
      <filter id="shadowWallet" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#4F1DB8" floodOpacity="0.25" />
      </filter>
    </defs>

    {/* Green Cash Notes Fan */}
    <g transform="rotate(-15 45 45)">
      <rect x="24" y="24" width="60" height="36" rx="5" fill="url(#cashGrad1)" />
      <circle cx="54" cy="42" r="8" fill="#15803D" opacity="0.6" />
      <rect x="28" y="28" width="52" height="28" rx="3" fill="none" stroke="#BBF7D0" strokeWidth="1.5" strokeDasharray="3 2" />
    </g>
    <g transform="rotate(5 55 45)">
      <rect x="36" y="22" width="60" height="36" rx="5" fill="url(#cashGrad2)" />
      <circle cx="66" cy="40" r="8" fill="#16A34A" opacity="0.6" />
      <rect x="40" y="26" width="52" height="28" rx="3" fill="none" stroke="#DCFCE7" strokeWidth="1.5" strokeDasharray="3 2" />
    </g>

    {/* Purple Leather Wallet Body */}
    <g filter="url(#shadowWallet)">
      <rect x="14" y="44" width="86" height="60" rx="14" fill="url(#walletGrad)" />
      {/* Wallet flap highlight */}
      <path d="M14 54 Q57 48 100 54 L100 84 Q57 88 14 84 Z" fill="#7C3AED" opacity="0.4" />
      {/* Golden buckle strap */}
      <rect x="76" y="62" width="28" height="18" rx="7" fill="#581C87" />
      <rect x="76" y="64" width="24" height="14" rx="5" fill="#6B21A8" />
      {/* Gold snap button */}
      <circle cx="86" cy="71" r="4.5" fill="#FACC15" stroke="#EAB308" strokeWidth="1.5" />
      <circle cx="85" cy="70" r="1.5" fill="#FEF08A" />
    </g>
  </svg>
);

// Cute Purple Monster holding Golden Gift Box with red ribbon (matches PollPe reference image right card)
export const MascotReferIllustration: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="mascotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9D65FC" />
        <stop offset="50%" stopColor="#7848F4" />
        <stop offset="100%" stopColor="#5522C7" />
      </linearGradient>
      <linearGradient id="giftBoxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="60%" stopColor="#EAB308" />
        <stop offset="100%" stopColor="#CA8A04" />
      </linearGradient>
    </defs>

    {/* Monster Ears/Horns */}
    <ellipse cx="40" cy="30" rx="7" ry="12" fill="#7848F4" transform="rotate(-20 40 30)" />
    <ellipse cx="80" cy="30" rx="7" ry="12" fill="#7848F4" transform="rotate(20 80 30)" />

    {/* Monster Head & Body */}
    <rect x="28" y="24" width="64" height="66" rx="28" fill="url(#mascotGrad)" />

    {/* Eyes */}
    <ellipse cx="44" cy="48" rx="7" ry="9" fill="#FFFFFF" />
    <circle cx="45" cy="48" r="4.5" fill="#1E1B4B" />
    <circle cx="43" cy="46" r="1.5" fill="#FFFFFF" />

    <ellipse cx="76" cy="48" rx="7" ry="9" fill="#FFFFFF" />
    <circle cx="75" cy="48" r="4.5" fill="#1E1B4B" />
    <circle cx="73" cy="46" r="1.5" fill="#FFFFFF" />

    {/* Cheerful Smile */}
    <path d="M50 62 Q60 70 70 62" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />

    {/* Golden Gift Box Held in Front */}
    <g transform="translate(32, 64)">
      {/* Box */}
      <rect x="0" y="10" width="56" height="38" rx="6" fill="url(#giftBoxGrad)" stroke="#A16207" strokeWidth="1" />
      {/* Box Lid */}
      <rect x="-3" y="4" width="62" height="10" rx="3" fill="#FACC15" />
      {/* Red Ribbon Vertical */}
      <rect x="23" y="4" width="10" height="44" fill="#EF4444" />
      {/* Red Ribbon Horizontal */}
      <rect x="0" y="22" width="56" height="8" fill="#EF4444" />
      {/* Bow */}
      <ellipse cx="22" cy="2" rx="7" ry="5" fill="#DC2626" transform="rotate(-20 22 2)" />
      <ellipse cx="34" cy="2" rx="7" ry="5" fill="#DC2626" transform="rotate(20 34 2)" />
      <circle cx="28" cy="4" r="3.5" fill="#B91C1C" />
    </g>

    {/* Sparkles */}
    <polygon points="18,36 20,40 24,40 21,43 22,47 18,44 14,47 15,43 12,40 16,40" fill="#FACC15" />
    <polygon points="102,40 104,44 108,44 105,47 106,51 102,48 98,51 99,47 96,44 100,44" fill="#FACC15" />
  </svg>
);

// Quest Conqueror Purple Monster Flag Badge (matches top right of Woohoo Quest card)
export const QuestConquerorBadge: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 80 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Flag Pole */}
    <rect x="22" y="10" width="3" height="60" rx="1.5" fill="#4B5563" />
    {/* Purple Flag */}
    <path d="M25 12 L56 22 L25 32 Z" fill="#6B21A8" />
    {/* Mini Monster Face */}
    <rect x="36" y="30" width="28" height="26" rx="8" fill="#7848F4" />
    <circle cx="44" cy="40" r="3" fill="#FFFFFF" />
    <circle cx="44.5" cy="40" r="1.5" fill="#1E1B4B" />
    <circle cx="56" cy="40" r="3" fill="#FFFFFF" />
    <circle cx="55.5" cy="40" r="1.5" fill="#1E1B4B" />
    <path d="M47 47 Q50 50 53 47" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    {/* Ribbon banner */}
    <rect x="20" y="56" width="46" height="13" rx="3" fill="#2E1065" />
    <text x="43" y="65" fill="#FACC15" fontSize="6" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
      QUEST CONQUEROR
    </text>
  </svg>
);

// Gold Coin Icon matching PollPe exactly
export const PollPeCoin: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" fill="url(#ppCoinGrad)" stroke="#B45309" strokeWidth="1" />
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="#FEF08A" strokeWidth="1" strokeDasharray="3 2" />
    <text x="12" y="16" fontSize="11" fontWeight="900" fontFamily="system-ui, sans-serif" fill="#78350F" textAnchor="middle">
      P
    </text>
    <defs>
      <linearGradient id="ppCoinGrad" x1="0" y1="0" x2="24" y2="24">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="60%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
  </svg>
);
