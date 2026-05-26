import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
  isReady?: boolean; // VETERAN UPDATE: Orchestration Prop
}

export function SplashScreen({ onFinish, isReady = true }: SplashScreenProps) {
  const [isFading, setIsFading] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    // Mindestdauer der Animation: 2.4s
    const timer1 = setTimeout(() => {
      setAnimationDone(true);
    }, 2400);

    return () => clearTimeout(timer1);
  }, []);

  useEffect(() => {
    // Der Fade-Out startet erst, wenn die Animation fertig UND die App im Hintergrund ready ist
    if (animationDone && isReady) {
      setIsFading(true);
      const timer2 = setTimeout(() => onFinish(), 500);
      return () => clearTimeout(timer2);
    }
  }, [animationDone, isReady, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f1115] transition-opacity duration-500 ease-out will-change-opacity ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* LOGO CONTAINER */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center">
        {/* ATMOSPHERE: Grüner Schein im Hintergrund (Dezent) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-tennis-lime/5 rounded-full blur-[100px] animate-pulse"></div>

        <svg
          viewBox="0 0 650 400"
          className="w-full h-full relative z-10 overflow-visible"
        >
          <defs>
            {/* 1. CHROME TEXT GRADIENT (Bleibt Silber/Cool) */}
            <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="40%" stopColor="#e5e7eb" stopOpacity="1" />
              <stop offset="100%" stopColor="#9ca3af" stopOpacity="1" />
            </linearGradient>

            {/* 2. THE SILICON VALLEY BLADE GRADIENT */}
            <linearGradient
              id="vibrantBladeGrad"
              x1="0%"
              y1="100%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#65a30d" /> 
              <stop offset="40%" stopColor="#ccff00" /> 
              <stop offset="80%" stopColor="#d9f99d" /> 
              <stop offset="100%" stopColor="#ffffff" /> 
            </linearGradient>

            {/* 3. NEON GREEN GLOW (Farbiger Schein) */}
            <filter id="greenGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="6"
                floodColor="#ccff00"
                floodOpacity="0.6"
              />
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="12"
                floodColor="#ccff00"
                floodOpacity="0.3"
              />
            </filter>

            {/* 4. CHROME SHADOW (Text Tiefe) */}
            <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="8"
                stdDeviation="6"
                floodColor="#000"
                floodOpacity="0.6"
              />
            </filter>

            {/* GEOMETRIE DEFINITIONEN (Unverändert perfekt) */}
            <path
              id="bladeShape"
              d="M 20 380 Q 325 235 630 40 L 635 35 Q 325 265 15 390 Z"
            />

            <g id="baseLogo">
              <path
                d="M 60 80 L 250 80 C 300 80 320 90 320 130 C 320 160 300 180 270 185 C 310 190 330 220 330 270 C 330 320 290 340 220 340 L 20 340 L 60 80 Z 
                   M 115 130 L 105 180 L 210 180 C 240 180 250 170 250 155 C 250 140 240 130 210 130 L 115 130 Z
                   M 100 230 L 90 290 L 210 290 C 240 290 250 280 250 260 C 250 240 240 230 210 230 L 100 230 Z"
              />
              <path
                d="M 420 80 L 500 80 L 470 190 L 540 190 L 570 80 L 650 80 L 560 340 L 480 340 L 450 240 L 380 240 L 350 340 L 270 340 L 300 240 L 330 130 L 360 80 L 410 80 Z"
              />
            </g>

            {/* MASKEN */}
            <mask id="revealBladeMask">
              <path
                d="M 20 380 Q 325 240 630 40"
                fill="none"
                stroke="white"
                strokeWidth="70"
                strokeLinecap="round"
                className="animate-blade-mask"
                strokeDasharray="0 1000"
              />
            </mask>

            <mask id="maskTopSplit">
              <rect x="-100" y="-100" width="850" height="600" fill="white" />
              <path
                d="M 20 380 Q 325 240 630 40 L 650 600 L -100 600 Z"
                fill="black"
              />
            </mask>

            <mask id="maskBottomSplit">
              <rect x="-100" y="-100" width="850" height="600" fill="black" />
              <path
                d="M 20 395 Q 325 255 630 55 L 650 600 L -100 600 Z"
                fill="white"
              />
            </mask>
          </defs>

          {/* --- RENDER LAYERS --- */}
          <g
            mask="url(#maskTopSplit)"
            fill="url(#chromeGrad)"
            className="animate-split-top origin-center"
            filter="url(#textShadow)"
          >
            <use href="#baseLogo" />
          </g>

          <g
            mask="url(#maskBottomSplit)"
            fill="url(#chromeGrad)"
            className="animate-split-bottom origin-center"
            filter="url(#textShadow)"
          >
            <use href="#baseLogo" />
          </g>

          <g mask="url(#revealBladeMask)">
            <use
              href="#bladeShape"
              fill="url(#vibrantBladeGrad)"
              filter="url(#greenGlow)"
            />
            <path
              d="M 20 380 Q 325 235 630 40"
              fill="none"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="1.5"
              style={{ mixBlendMode: 'overlay' }}
            />
          </g>
        </svg>
      </div>

      {/* FOOTER */}
      <div
        className={`mt-8 flex flex-col items-center gap-2 transition-all duration-700 delay-500 ${
          isFading ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="flex items-center gap-2 opacity-50">
          <div className="w-1 h-1 bg-tennis-lime rounded-full animate-ping"></div>
          <span className="text-gray-500 text-[9px] font-bold tracking-[0.3em] font-mono uppercase">
            AI Scout Initializing...
          </span>
        </div>
      </div>
    </div>
  );
}