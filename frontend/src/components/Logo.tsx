import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-lg', sub: 'text-[9px]' },
    md: { icon: 38, text: 'text-xl', sub: 'text-[10px]' },
    lg: { icon: 48, text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 64, text: 'text-4xl', sub: 'text-sm' },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Distinctive Logo SVG: Book + Neural Network Nodes + Radiant Filament Lightbulb */}
      <div className="relative flex items-center justify-center">
        <svg
          width={current.icon}
          height={current.icon}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300 hover:scale-105"
        >
          <defs>
            <linearGradient id="bookGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4F46E5" />
              <stop offset="0.5" stopColor="#7C3AED" />
              <stop offset="1" stopColor="#9333EA" />
            </linearGradient>
            <linearGradient id="neuralGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="1" stopColor="#818CF8" />
            </linearGradient>
            <radialGradient id="bulbGlow" cx="50" cy="40" r="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FDE047" stopOpacity="0.9" />
              <stop offset="0.6" stopColor="#F59E0B" stopOpacity="0.5" />
              <stop offset="1" stopColor="#E11D48" stopOpacity="0" />
            </radialGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Rounded Shield */}
          <rect x="5" y="5" width="90" height="90" rx="22" fill="url(#bookGrad)" />

          {/* Open Book Base Silhouette */}
          <path
            d="M20 72 C 32 66, 42 66, 50 71 C 58 66, 68 66, 80 72 L 80 78 C 68 72, 58 72, 50 77 C 42 72, 32 72, 20 78 Z"
            fill="#FFFFFF"
            fillOpacity="0.95"
          />
          <path
            d="M20 54 C 32 48, 42 48, 50 53 C 58 48, 68 48, 80 54 L 80 68 C 68 62, 58 62, 50 67 C 42 62, 32 62, 20 68 Z"
            fill="#FFFFFF"
            fillOpacity="0.8"
          />

          {/* Lightbulb Silhouette radiating from the book spine */}
          <circle cx="50" cy="38" r="16" fill="url(#bulbGlow)" filter="url(#glowFilter)" />
          <path
            d="M44 48 C 42 44, 38 38, 38 32 C 38 25, 43 20, 50 20 C 57 20, 62 25, 62 32 C 62 38, 58 44, 56 48 Z"
            fill="#FFFFFF"
            fillOpacity="0.9"
          />
          <rect x="45" y="48" width="10" height="3" rx="1.5" fill="#E2E8F0" />
          <rect x="46" y="52" width="8" height="2" rx="1" fill="#CBD5E1" />

          {/* Neural Synapse Nodes & Interconnections */}
          <g stroke="url(#neuralGrad)" strokeWidth="1.75" strokeLinecap="round" opacity="0.95">
            {/* Synaptic paths connecting book and lightbulb */}
            <line x1="28" y1="36" x2="38" y2="30" />
            <line x1="72" y1="36" x2="62" y2="30" />
            <line x1="50" y1="16" x2="50" y2="22" />
            <line x1="32" y1="22" x2="42" y2="24" />
            <line x1="68" y1="22" x2="58" y2="24" />
          </g>

          {/* Neural Nodes (Circles) */}
          <circle cx="28" cy="36" r="3" fill="#38BDF8" />
          <circle cx="72" cy="36" r="3" fill="#38BDF8" />
          <circle cx="32" cy="22" r="2.5" fill="#A78BFA" />
          <circle cx="68" cy="22" r="2.5" fill="#A78BFA" />
          <circle cx="50" cy="15" r="3" fill="#FDE047" />
          <circle cx="50" cy="34" r="2" fill="#7C3AED" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-extrabold tracking-tight bg-gradient-to-r from-indigo-900 via-indigo-600 to-violet-600 dark:from-white dark:via-indigo-200 dark:to-violet-400 bg-clip-text text-transparent ${current.text}`}>
              Knowlix
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-indigo-700 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/80 rounded border border-indigo-200/60 dark:border-indigo-800">
              AI
            </span>
          </div>
          <span className={`text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase ${current.sub}`}>
            Learn Smarter. Remember Longer.
          </span>
        </div>
      )}
    </div>
  );
};
