import { Lock, Crown, Zap } from 'lucide-react';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface PremiumLockProps {
  title: string;
  description: string;
  minTier: 'ELITE' | 'PREMIUM' | string;
  blurAmount?: string; 
  children: ReactNode;
  isLocked: boolean;
}

export function PremiumLock({ title, description, minTier, blurAmount = "blur-md", children, isLocked }: PremiumLockProps) {
  const navigate = useNavigate();

  if (!isLocked) {
    return <>{children}</>;
  }

  const tierKey = (minTier || 'ELITE').toString().toUpperCase().trim();

  // Einfache Styles ohne externe Abhängigkeiten
  const isElite = tierKey === 'ELITE';
  const borderColor = isElite ? 'border-yellow-500/30' : 'border-fuchsia-500/30';
  const iconColor = isElite ? 'text-yellow-400' : 'text-fuchsia-400';
  const Icon = isElite ? Zap : Crown;

  return (
    <div className="relative overflow-hidden rounded-2xl group min-h-[400px] bg-[#15171e] border border-white/5 w-full">
      
      {/* Blurred Content */}
      <div className={`filter ${blurAmount} opacity-20 pointer-events-none select-none absolute inset-0 h-full w-full`}>
        {children}
      </div>

      {/* Lock Overlay (Kein Framer Motion -> Kein Absturzrisiko) */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
        <div className={`bg-[#0a0c10]/90 border ${borderColor} p-8 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center backdrop-blur-xl`}>
          
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 ring-1 ring-white/10">
             <Icon size={32} className={iconColor} />
          </div>
          
          <h3 className="text-white font-black uppercase tracking-wider text-xl mb-3 flex items-center justify-center gap-2">
            <Lock size={20} className="text-gray-400"/> Locked Feature
          </h3>
          
          <p className="text-gray-400 text-sm font-medium mb-8 leading-relaxed">
            {description}
          </p>

          <button
            onClick={(e) => {
                e.stopPropagation();
                navigate('/pricing');
            }}
            className="w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs bg-white text-black hover:bg-gray-200 transition-colors shadow-lg"
          >
            Unlock {tierKey}
          </button>
        </div>
      </div>
    </div>
  );
}