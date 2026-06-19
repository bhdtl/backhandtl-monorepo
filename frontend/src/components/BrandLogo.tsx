
export function BrandLogo({ className = "", withText = false }: { className?: string, withText?: boolean }) {
  // Statische ID verhindert Hydration-Probleme
  const maskId = "brand-logo-mask-final";
  
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* ViewBox -20 bis 140 gibt genug "Fleisch" oben und unten */}
      <svg
        viewBox="0 -20 240 140" 
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
            {/* Der Schnitt verläuft dynamisch durch das Logo */}
            <path id="slash-def" d="M 5 100 L 235 10" />
            
            <mask id={maskId}>
                <rect width="100%" height="100%" fill="white" />
                {/* Der "Radiergummi" - etwas breiter als der grüne Strich */}
                <path d="M -10 105 L 250 5 L 250 25 L -10 125 Z" fill="black" />
            </mask>
        </defs>

        {/* Text Layer - Arial Black ist auf jedem PC verfügbar und sehr fett */}
        <g mask={`url(#${maskId})`}>
            <text 
                x="50%" 
                y="55%" 
                dominantBaseline="middle" 
                textAnchor="middle"
                fontFamily="Arial Black, Arial, sans-serif" 
                fontWeight="900" 
                fontSize="115"    
                fontStyle="italic" 
                fill="currentColor" 
                letterSpacing="-8" 
                transform="scale(1.15, 1) skewX(-12)" 
            >
                BH
            </text>
        </g>

        {/* Der Neon Slash */}
        <path 
            d="M 5 100 L 235 10 L 238 13 L 2 103 Z" 
            fill="#84cc16"
            style={{ filter: "drop-shadow(0 0 8px rgba(132,204,22,0.9))" }} 
        />
      </svg>

      {withText && (
        <span className="font-black tracking-tighter text-white italic leading-none ml-2 text-xl" style={{ fontFamily: 'Arial Black, sans-serif' }}>
          BACKHAND<span className="text-tennis-lime">TL</span>
        </span>
      )}
    </div>
  );
}