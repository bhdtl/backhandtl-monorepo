import { Trophy, Zap, MapPin, Activity, Clock } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useTranslation } from 'react-i18next'; // 1. Import

interface MatchupCardProps {
  playerA?: { name: string; image?: string; rank?: number; country?: string; };
  playerB?: { name: string; image?: string; rank?: number; country?: string; };
  prediction?: { winner: string; score: number; keyFactor: string; summary: string; };
  context?: { surface: string; bsi: number; };
}

export function MatchupCard({ playerA, playerB, prediction, context }: MatchupCardProps) {
  const { t } = useTranslation(); // 2. Hook

  // Safe Defaults
  const pA = playerA || { name: 'Player A', image: '', country: 'INT' };
  const pB = playerB || { name: 'Player B', image: '', country: 'INT' };
  const pred = prediction || { winner: 'PENDING', score: 5, keyFactor: 'Analyzing...', summary: '' };
  const ctx = context || { surface: 'HARD', bsi: 5 };

  // Set Prediction Logic
  const getSets = (score: number) => {
      if (score >= 8.5) return t('matchupCard.sets.straight'); // "Straight Sets (2-0)"
      if (score >= 7.0) return t('matchupCard.sets.competitive'); // "2 Competitive Sets"
      return t('matchupCard.sets.deciding'); // "Deciding Set (2-1)"
  };

  const scoreColor = pred.score >= 8 ? 'text-[#22c55e]' : 'text-[#eab308]';
  const barColor = pred.score >= 8 ? 'bg-[#22c55e]' : 'bg-[#eab308]';

  return (
    <div className="flex flex-col items-center w-full max-w-[380px] mx-auto select-none">
      <div className="relative w-full rounded-[2rem] shadow-2xl bg-gradient-to-b from-gray-800 to-black p-[1px]">
        <div className="relative w-full overflow-hidden rounded-[2rem] bg-[#080808] flex flex-col text-white font-sans aspect-[4/6]">

            {/* Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b from-[#1a1d26] to-[#0a0a0a]" />
                <div className={`absolute top-[-20%] left-[-20%] w-[120%] h-[60%] blur-[100px] opacity-20 pointer-events-none rounded-full ${pred.winner.includes(pA.name) ? 'bg-tennis-lime' : 'bg-blue-600'}`} />
            </div>

            {/* Header - CLEAN (Logo Icon Only) */}
            <div className="relative z-10 px-6 pt-6 pb-2 flex justify-between items-center">
                <div className="flex flex-col">
                    <div className="h-6 mb-1 flex items-center opacity-90 scale-90 origin-left">
                         {/* Pass withText={false} to hide the written name */}
                         <BrandLogo className="h-full w-auto text-white" withText={false} />
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[10px] uppercase tracking-wide">
                        <MapPin size={10} /> {ctx.surface}
                    </div>
                </div>
                <div className="relative bg-[#111] border border-gray-800 rounded-xl px-3 py-1.5 flex flex-col items-center min-w-[60px]">
                    <div className="flex items-center gap-1 text-[9px] text-gray-500 font-mono mb-0.5"><Activity size={10} /> BSI</div>
                    <div className="text-white font-black text-sm leading-none">{Math.round(ctx.bsi)}</div>
                </div>
            </div>

            {/* Players */}
            <div className="relative z-10 flex-1 flex items-center justify-between px-4 mt-2">
                <div className="flex flex-col items-center w-[42%] relative">
                    <div className={`relative w-24 h-24 rounded-2xl overflow-hidden shadow-2xl mb-3 border-2 ${pred.winner.includes(pA.name) ? 'border-tennis-lime' : 'border-gray-800 grayscale opacity-70'}`}>
                        {pA.image ? <img src={pA.image} className="w-full h-full object-cover object-top bg-gray-800"/> : <div className="w-full h-full bg-gray-800"/>}
                    </div>
                    <h2 className="text-white font-black text-lg uppercase tracking-tight text-center leading-none truncate w-full px-1">{pA.name}</h2>
                    <p className="text-gray-500 text-[10px] font-mono mt-1 tracking-wide uppercase">{pA.country}</p>
                </div>
                <div className="flex flex-col items-center justify-center w-[16%] h-full pb-8"><span className="text-4xl font-black italic text-[#1a1a1a] select-none">VS</span></div>
                <div className="flex flex-col items-center w-[42%] relative">
                    <div className={`relative w-24 h-24 rounded-2xl overflow-hidden shadow-2xl mb-3 border-2 ${pred.winner.includes(pB.name) ? 'border-tennis-lime' : 'border-gray-800 grayscale opacity-70'}`}>
                        {pB.image ? <img src={pB.image} className="w-full h-full object-cover object-top bg-gray-800"/> : <div className="w-full h-full bg-gray-800"/>}
                    </div>
                    <h2 className="text-white font-black text-lg uppercase tracking-tight text-center leading-none truncate w-full px-1">{pB.name}</h2>
                    <p className="text-gray-500 text-[10px] font-mono mt-1 tracking-wide uppercase">{pB.country}</p>
                </div>
            </div>

            {/* Prediction */}
            <div className="relative z-20 px-4 pb-4">
                <div className="bg-[#121212]/90 backdrop-blur-md rounded-[1.5rem] p-5 border border-white/10 shadow-2xl">
                    <div className="flex justify-between items-end mb-3">
                        <div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Trophy size={10} className="text-tennis-lime"/> {t('matchupCard.labels.prediction')}</div>
                            <div className="text-2xl font-black text-white italic tracking-tighter leading-none">{pred.winner.toUpperCase()}</div>
                        </div>
                        <div className="text-right">
                             <div className={`text-4xl font-black ${scoreColor} leading-none tracking-tighter`}>{Math.round(pred.score)}</div>
                             <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1">{t('matchupCard.labels.confidence')}</div>
                        </div>
                    </div>

                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                        <div className={`h-full ${barColor} transform-gpu`} style={{ width: `${pred.score * 10}%` }}/>
                    </div>

                    {/* NEW: Sets Prediction */}
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Clock size={12} className="text-gray-500" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                            {t('matchupCard.labels.length')}: <span className="text-white">{getSets(pred.score)}</span>
                        </span>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-white/5 items-start min-h-[45px]">
                        <div className="mt-0.5 p-1.5 bg-yellow-500/10 rounded-lg"><Zap size={14} className="text-yellow-400" /></div>
                        <div className="flex-1">
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">{t('matchupCard.labels.edge')}</p>
                             <p className="text-xs text-gray-200 font-medium leading-relaxed line-clamp-2">{pred.keyFactor}</p>
                        </div>
                    </div>

                    {/* Footer URL */}
                    <div className="mt-3 pt-2 border-t border-white/5 flex justify-end">
                        <span className="text-[9px] font-black text-gray-600 tracking-[0.2em] uppercase">BACKHANDTL.COM</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
      <p className="text-gray-600 text-[10px] mt-3 text-center">{t('matchupCard.footer')}</p>
    </div>
  );
}
