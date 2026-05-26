import { Loader2, Zap } from 'lucide-react';

interface LoadingScreenProps {
  message?: string; // Optional: Eigener Text (z.B. "Scanning Markets...")
}

export function LoadingScreen({ message = "Initializing Neural Core..." }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] backdrop-blur-sm">
      {/* Background Glow Effect */}
      <div className="absolute w-64 h-64 bg-tennis-lime/5 rounded-full blur-[100px] animate-pulse"></div>
      
      <div className="relative flex flex-col items-center gap-6">
        {/* Spinner Container */}
        <div className="relative">
          <div className="absolute inset-0 bg-tennis-lime/20 rounded-full blur-xl animate-pulse"></div>
          <div className="relative bg-[#1a1d26] p-4 rounded-full border border-white/5 shadow-2xl">
            <Loader2 className="animate-spin text-tennis-lime" size={40} />
          </div>
          {/* Small badge icon */}
          <div className="absolute -bottom-2 -right-2 bg-[#0a0a0a] p-1.5 rounded-full border border-white/10">
            <Zap size={12} className="text-white fill-tennis-lime" />
          </div>
        </div>

        {/* Text Animation */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-white font-black uppercase tracking-[0.2em] text-sm animate-pulse">
            {message}
          </span>
          <div className="flex gap-1 h-1">
            <div className="w-1 h-full bg-tennis-lime animate-[bounce_1s_infinite_0ms]"></div>
            <div className="w-1 h-full bg-tennis-lime animate-[bounce_1s_infinite_200ms]"></div>
            <div className="w-1 h-full bg-tennis-lime animate-[bounce_1s_infinite_400ms]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}