import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, X, MapPin, Activity, Layers, Filter, Sparkles, Zap, ArrowRight, AlertTriangle, Wallet, PieChart, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { safeLocalStorage, safeSessionStorage } from '../lib/storage';
import { PlayerCard } from '../components/PlayerCard';
import { ScrollToTop } from '../components/ScrollToTop';
import { SearchableSelect } from '../components/SearchableSelect';
import { trackEvent } from '../lib/analytics';
import { Link } from 'react-router-dom';
import { LoadingScreen } from '../components/LoadingScreen'; 
import { useTranslation } from 'react-i18next';
import { PartnerBadge } from '../components/PartnerBadge';
import { NeoBetPromoModal } from '../components/NeoBetPromoModal';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONFIGURATION ---
// 🚀 SOTA: "Line in the Sand" - Reset auf NEO.bet Integration Launch Date (Sync with Performance Page)
const STATS_RESET_DATE = '2026-05-27T00:00:00.000Z';

// --- ROBUST HELPERS ---
const isPlayer1Target = (pickName: string, p1Name: string) => {
    if (!pickName || !p1Name) return false;
    const pick = pickName.toLowerCase().trim();
    const p1 = p1Name.toLowerCase().trim();
    if (pick.includes(p1) || p1.includes(pick)) return true;
    
    // Clean punctuation from pick to make word matching robust
    const cleanPick = pick.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
    const pickWords = cleanPick.split(/\s+/);
    
    const p1Words = p1.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ').split(/\s+/);
    const p1Last = p1Words[p1Words.length - 1];
    const p1First = p1Words[0];
    
    if (p1Last && p1Last.length >= 2 && pickWords.includes(p1Last)) return true;
    if (p1First && p1First.length >= 2 && pickWords.includes(p1First)) return true;
    
    return false;
};

const checkWinnerResult = (pickName: string, actualWinner: string | null) => {
    if (!actualWinner || !pickName) return false;
    const p = pickName.toLowerCase().trim();
    const w = actualWinner.toLowerCase().trim();
    if (p.includes(w) || w.includes(p)) return true;
    
    const wWords = w.split(/\s+/);
    const wLast = wWords[wWords.length - 1];
    if (wLast && wLast.length > 2 && p.includes(wLast)) return true;
    
    return false;
};

const checkPlayResult = (pickName: string, match: any): boolean => {
    if (!pickName || !match) return false;
    const pick = pickName.trim();
    const actualWinner = match.actual_winner_name;
    const score = match.score;
    const p1 = match.player1_name;
    const p2 = match.player2_name;
    const lowerPick = pick.toLowerCase();
    
    // 1. OVER / UNDER GAMES
    if (lowerPick.includes("over") || lowerPick.includes("under")) {
        if (!score) return false;
        const cleanScore = score.replace(/:/g, '-').replace(/[^0-9\-\s]/g, '');
        const sets = cleanScore.split(/\s+/);
        let totalGames = 0;
        let validSets = 0;
        for (const s of sets) {
            const parts = s.split('-');
            if (parts.length === 2) {
                const g1 = parseInt(parts[0], 10);
                const g2 = parseInt(parts[1], 10);
                if (!isNaN(g1) && !isNaN(g2)) {
                    totalGames += g1 + g2;
                    validSets++;
                }
            }
        }
        if (validSets === 0) return false;
        const matchNum = pick.match(/[\d.]+/);
        if (!matchNum) return false;
        const boundary = parseFloat(matchNum[0]);
        if (lowerPick.includes("over")) {
            return totalGames > boundary;
        } else if (lowerPick.includes("under")) {
            return totalGames < boundary;
        }
        return false;
    }
    
    // 2. HANDICAP GAMES
    else if (pick.match(/[+-]\s*\d+(?:\.\d+)?/)) {
        if (!score || !p1 || !p2) return false;
        const cleanScore = score.replace(/:/g, '-').replace(/[^0-9\-\s]/g, '');
        const sets = cleanScore.split(/\s+/);
        let p1Games = 0;
        let p2Games = 0;
        let validSets = 0;
        for (const s of sets) {
            const parts = s.split('-');
            if (parts.length === 2) {
                const g1 = parseInt(parts[0], 10);
                const g2 = parseInt(parts[1], 10);
                if (!isNaN(g1) && !isNaN(g2)) {
                    p1Games += g1;
                    p2Games += g2;
                    validSets++;
                }
            }
        }
        if (validSets === 0) return false;
        const isP1 = isPlayer1Target(pick, p1);
        const isP2 = isPlayer1Target(pick, p2);
        const matchSignNum = pick.match(/([+-]\s*\d+(?:\.\d+)?)/);
        if (!matchSignNum) return false;
        const handicap = parseFloat(matchSignNum[1].replace(/\s+/g, ''));
        if (isP1) {
            return p1Games + handicap > p2Games;
        } else if (isP2) {
            return p2Games + handicap > p1Games;
        }
        return false;
    }
    
    // 3. MONEYLINE / MATCH WINNER
    else {
        return checkWinnerResult(pick, actualWinner);
    }
};

const getClosingOddsForPlay = (pickName: string, match: any): number => {
    if (!pickName || !match) return 0;
    const pick = pickName.trim();
    const lowerPick = pick.toLowerCase();
    const p1 = match.player1_name || "";
    
    // 1. OVER / UNDER GAMES
    if (lowerPick.includes("over") || lowerPick.includes("under")) {
        const boundaryMatch = pick.match(/[\d.]+/);
        if (!boundaryMatch) return 0;
        const boundary = parseFloat(boundaryMatch[0]);
        const ouList = match.neobet_over_unders;
        if (Array.isArray(ouList)) {
            const ouObj = ouList.find(ou => ou && Math.abs((parseFloat(ou.boundary) || 0) - boundary) < 0.01);
            if (ouObj) {
                if (lowerPick.includes("over")) {
                    return parseFloat(ouObj.over) || 0;
                } else if (lowerPick.includes("under")) {
                    return parseFloat(ouObj.under) || 0;
                }
            }
        }
        return 0;
    }
    
    // 2. HANDICAP GAMES
    else if (pick.match(/[+-]\s*\d+(?:\.\d+)?/)) {
        const signNumMatch = pick.match(/([+-]\s*\d+(?:\.\d+)?)/);
        if (!signNumMatch) return 0;
        const handicap = parseFloat(signNumMatch[1].replace(/\s+/g, ''));
        const isP1 = isPlayer1Target(pick, p1);
        const spList = match.neobet_spreads;
        if (Array.isArray(spList)) {
            const targetHandicap = isP1 ? handicap : -handicap;
            const spObj = spList.find(sp => sp && Math.abs((parseFloat(sp.handicap) || 0) - targetHandicap) < 0.01);
            if (spObj) {
                if (isP1) {
                    return parseFloat(spObj.odds1) || 0;
                } else {
                    return parseFloat(spObj.odds2) || 0;
                }
            }
        }
        return 0;
    }
    
    // 3. MONEYLINE / MATCH WINNER
    else {
        const isP1 = isPlayer1Target(pick, p1);
        return isP1 ? parseFloat(match.odds1) || 0 : parseFloat(match.odds2) || 0;
    }
};

// 🚀 SOTA FIX: Sync with Performance Page to include 'type' and 'fairOdds'
const parseValueFromText = (text: string | undefined) => {
    if (!text) {
        return { hasValue: false, marketOdds: 0, edge: 0, fairOdds: 0, pickName: '', stake: 0, type: '' };
    }

    if (text.includes('[') && text.includes('Edge:')) {
        const typeMatch = text.match(/\[(.*?):/);
        const playerMatch = text.match(/:\s*(.*?)\s*@/);
        const oddsMatch = text.match(/@\s*([\d.]+)/);
        const fairMatch = text.match(/Fair:\s*([\d.]+)/);
        const edgeMatch = text.match(/Edge:\s*(-?[\d.]+)%/);
        const stakeMatch = text.match(/Stake:\s*([\d.]+)u/);

        if (playerMatch && oddsMatch && edgeMatch) {
            let rawStake = stakeMatch ? parseFloat(stakeMatch[1]) : 0;
            let finalStake = Math.max(0, Math.min(5, rawStake));
            finalStake = Math.round(finalStake * 10) / 10;

            return {
                hasValue: true,
                type: typeMatch ? typeMatch[1].trim() : 'VALUE',
                pickName: playerMatch[1].trim(),
                marketOdds: parseFloat(oddsMatch[1]),
                fairOdds: fairMatch ? parseFloat(fairMatch[1]) : 0,
                edge: parseFloat(edgeMatch[1]),
                stake: finalStake
            };
        }
    }

    if (text.includes('Stake:')) {
         const legacyRegex = /\[?(💎|🛡️|⚖️|💰|HUNTER).*?:\s*(.*?)\s*@\s*([\d.]+).*?Edge:\s*(-?[\d.]+)%.*?Stake:\s*([\d.]+)u/;
         const match = text.match(legacyRegex);
         if (match) {
            let rawStake = parseFloat(match[5]);
            let finalStake = Math.max(0, Math.min(5, rawStake));
            finalStake = Math.round(finalStake * 10) / 10;

            return {
                hasValue: true,
                type: 'LEGACY',
                pickName: match[2].trim(),
                marketOdds: parseFloat(match[3]),
                fairOdds: 0,
                edge: parseFloat(match[4]),
                stake: finalStake
            };
         }
    }

    return { hasValue: false, marketOdds: 0, edge: 0, fairOdds: 0, pickName: '', stake: 0, type: '' };
};

// --- COMPONENT: AI HERO STATS WIDGET ---
const AIStatsHero = ({ isMobile }: { isMobile: boolean }) => {
  const { t } = useTranslation();
  
  const [stats, setStats] = useState(() => {
    const cached = safeLocalStorage.getItem('bh_hero_stats');
    return cached ? JSON.parse(cached) : { avgClv: 0, totalUnits: 0, roi: 0 };
  });
  const [loading, setLoading] = useState(() => {
    return !safeLocalStorage.getItem('bh_hero_stats');
  });

  useEffect(() => {
    let active = true;
    let timerId: any;

    const fetchPerformance = async () => {
      try {
          const cached = safeLocalStorage.getItem('bh_hero_stats');
          const cachedTime = safeLocalStorage.getItem('bh_hero_stats_time');
          const now = Date.now();

          // 🚀 5-Minute Cache Validation
          if (cached && cachedTime && (now - parseInt(cachedTime, 10) < 300000)) {
              if (active) {
                  setStats(JSON.parse(cached));
                  setLoading(false);
              }
              return;
          }

          const performFetch = async () => {
              let allData: any[] = [];
              let offset = 0;
              const limit = 1000;
              let keepFetching = true;

              while (keepFetching) {
                  const { data, error } = await supabase
                      .from('market_odds')
                      .select('id, player1_name, player2_name, odds1, odds2, opening_odds1, opening_odds2, ai_fair_odds1, ai_fair_odds2, ai_analysis_text, actual_winner_name, score, created_at, neobet_spreads, neobet_over_unders')
                      .neq('actual_winner_name', null)
                      .neq('actual_winner_name', '')
                      .gt('created_at', STATS_RESET_DATE)
                      .order('created_at', { ascending: true })
                      .range(offset, offset + limit - 1);

                  if (error) throw error;

                  if (data && data.length > 0) {
                      allData = [...allData, ...data];
                      offset += limit;
                      if (data.length < limit) {
                          keepFetching = false;
                      }
                  } else {
                      keepFetching = false;
                  }
              }

              if (allData && allData.length > 0) {
                let sumClv = 0;
                let cumulativeUnits = 0;
                let totalUnitsStaked = 0;
                let validSignals = 0;

                allData.forEach(match => {
                  let valInfo = parseValueFromText(match.ai_analysis_text);
                  
                  if (!valInfo.hasValue && match.ai_fair_odds1 && match.ai_fair_odds2) {
                      const op1 = match.opening_odds1 || match.odds1;
                      const op2 = match.opening_odds2 || match.odds2;
                      if (op1 && op2) {
                          const edge1 = ((op1 / match.ai_fair_odds1) - 1) * 100;
                          const edge2 = ((op2 / match.ai_fair_odds2) - 1) * 100;
                          if (edge1 > 1.0) valInfo = { hasValue: true, marketOdds: op1, fairOdds: match.ai_fair_odds1, edge: edge1, pickName: match.player1_name, stake: 1, type: 'INFO' };
                          else if (edge2 > 1.0) valInfo = { hasValue: true, marketOdds: op2, fairOdds: match.ai_fair_odds2, edge: edge2, pickName: match.player2_name, stake: 1, type: 'INFO' };
                      }
                  }

                  if (!valInfo.hasValue) return;

                  if (valInfo.type === 'LEGACY') {
                      if (valInfo.marketOdds < 2.0 && valInfo.stake < 2.0) return; 
                      if (valInfo.marketOdds >= 1.50 && valInfo.marketOdds < 2.00 && valInfo.edge < 8.0) return;
                  } else {
                      if (valInfo.marketOdds >= 3.0 && valInfo.stake < 0.5) return;
                      if (valInfo.marketOdds >= 2.0 && valInfo.marketOdds < 3.0 && valInfo.stake < 1.0) return;
                  }

                  const isWin = checkPlayResult(valInfo.pickName, match);
                  const actualStake = valInfo.stake; 
                  const unitProfit = isWin ? (actualStake * (valInfo.marketOdds - 1)) : -actualStake;
                  
                  cumulativeUnits += unitProfit;
                  totalUnitsStaked += actualStake;

                  const closingOdds = getClosingOddsForPlay(valInfo.pickName, match);
                  let clv = 0;
                  const entryOdds = valInfo.marketOdds;
                  
                  if (closingOdds > 0 && entryOdds > 0) {
                      clv = ((entryOdds / closingOdds) - 1) * 100;
                  }

                  sumClv += clv;
                  validSignals++;
                });

                if (validSignals > 0) {
                    const roiVal = totalUnitsStaked > 0 ? (cumulativeUnits / totalUnitsStaked) * 100 : 0;
                    const newStats = {
                      avgClv: parseFloat((sumClv / validSignals).toFixed(2)),
                      totalUnits: parseFloat(cumulativeUnits.toFixed(2)),
                      roi: parseFloat(roiVal.toFixed(2))
                    };
                    if (active) {
                        setStats(newStats);
                        safeLocalStorage.setItem('bh_hero_stats', JSON.stringify(newStats));
                        safeLocalStorage.setItem('bh_hero_stats_time', Date.now().toString());
                    }
                } else {
                    const fallbackStats = { avgClv: 0, totalUnits: 0, roi: 0 };
                    if (active) {
                        setStats(fallbackStats);
                        safeLocalStorage.setItem('bh_hero_stats', JSON.stringify(fallbackStats));
                        safeLocalStorage.setItem('bh_hero_stats_time', Date.now().toString());
                    }
                }
              } else {
                  const fallbackStats = { avgClv: 0, totalUnits: 0, roi: 0 };
                  if (active) {
                      setStats(fallbackStats);
                      safeLocalStorage.setItem('bh_hero_stats', JSON.stringify(fallbackStats));
                      safeLocalStorage.setItem('bh_hero_stats_time', Date.now().toString());
                  }
              }
          };

          // On mobile, if we have cached stats, render immediately and defer background update to avoid layout blocking
          if (isMobile && cached) {
              if (active) {
                  setStats(JSON.parse(cached));
                  setLoading(false);
              }
              timerId = setTimeout(async () => {
                  try {
                      await performFetch();
                  } catch (e) {
                      console.error("Deferred fetch error:", e);
                  }
              }, 2000);
          } else {
              await performFetch();
          }
      } catch (err) {
          console.error("Error fetching stats:", err);
          const fallbackStats = { avgClv: 0, totalUnits: 0, roi: 0 };
          if (active) {
              setStats(fallbackStats);
              safeLocalStorage.setItem('bh_hero_stats', JSON.stringify(fallbackStats));
              safeLocalStorage.setItem('bh_hero_stats_time', Date.now().toString());
          }
      } finally {
          if (active) {
              setLoading(false);
          }
      }
    };

    fetchPerformance();

    return () => {
        active = false;
        if (timerId) clearTimeout(timerId);
    };
  }, [isMobile]);

  if (loading) return <div className="h-32 w-full lg:w-[480px] bg-[#1a1d26] rounded-2xl animate-pulse border border-white/5"></div>;

  return (
    <Link to="/performance" className="group relative w-full lg:w-auto bg-[#1a1d26] border border-white/10 rounded-2xl p-5 block hover:border-tennis-lime/50 transition-all duration-300 shadow-2xl overflow-hidden cursor-pointer no-underline">
      <div 
        className={`absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-tennis-lime/10 transition-all pointer-events-none ${isMobile ? '' : 'bg-tennis-lime/5 blur-3xl'}`}
        style={isMobile ? { background: 'radial-gradient(circle, rgba(132, 204, 22, 0.08) 0%, rgba(132, 204, 22, 0) 70%)' } : {}}
      ></div>
      
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-tennis-lime/10 rounded-lg ring-1 ring-tennis-lime/20">
            <Zap size={14} className="text-tennis-lime fill-current" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">{t('homePage.aiStats.title')}</span>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-tennis-lime bg-tennis-lime/10 px-2.5 py-1 rounded-full border border-tennis-lime/10">
            <div className="w-1.5 h-1.5 rounded-full bg-tennis-lime animate-pulse shadow-[0_0_8px_#84cc16]"></div>
            {t('homePage.aiStats.live')}
            </div>
            <ArrowRight size={14} className="text-gray-600 group-hover:text-tennis-lime group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 md:flex md:items-center md:justify-between md:gap-x-8 relative z-10">
        
        <div className="flex flex-col">
            <div className="flex items-end gap-1 mb-1">
                <span className={`text-2xl md:text-3xl font-black leading-none tabular-nums ${stats.totalUnits >= 0 ? 'text-tennis-lime' : 'text-red-500'}`}>
                    {stats.totalUnits > 0 ? '+' : ''}{stats.totalUnits}
                </span>
                <span className={`text-sm font-bold mb-0.5 ${stats.totalUnits >= 0 ? 'text-tennis-lime/70' : 'text-red-500/70'}`}>u</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                <Wallet size={10} /> {t('homePage.aiStats.netProfit', 'NET PROFIT')}
            </div>
        </div>

        <div className="hidden md:block h-8 w-px bg-white/10"></div>

        <div className="flex flex-col">
            <div className="flex items-end gap-1 mb-1">
                <span className={`text-2xl md:text-3xl font-black leading-none tabular-nums ${stats.roi >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
                    {stats.roi > 0 ? '+' : ''}{stats.roi}
                </span>
                <span className={`text-sm font-bold mb-0.5 ${stats.roi >= 0 ? 'text-blue-400/70' : 'text-red-500/70'}`}>%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                <PieChart size={10} /> {t('homePage.aiStats.yieldRoi', 'YIELD (ROI)')}
            </div>
        </div>

        <div className="hidden md:block h-8 w-px bg-white/10"></div>

        <div className="flex flex-col">
             <div className="flex items-end gap-1 mb-1">
                <span className={`text-2xl md:text-3xl font-black leading-none tabular-nums ${stats.avgClv >= 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {stats.avgClv > 0 ? '+' : ''}{stats.avgClv}
                </span>
                <span className={`text-sm font-bold mb-0.5 ${stats.avgClv >= 0 ? 'text-emerald-400/70' : 'text-gray-500'}`}>%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                <Zap size={10} /> {t('homePage.aiStats.avgClv', 'AVG. CLV')}
            </div>
        </div>
        
      </div>
    </Link>
  );
};

// --- REST OF HOMEPAGE COMPONENT ---
const MultiSelect = ({ options, selected, onChange, placeholder, icon: Icon }: any) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item: string) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative w-full group" ref={wrapperRef}>
      <div 
        className={`w-full px-4 py-3 bg-[#15171e] border rounded-xl flex items-center justify-between cursor-pointer transition-all duration-300 ${isOpen ? 'border-tennis-lime shadow-[0_0_15px_rgba(132,204,22,0.1)]' : 'border-white/10 hover:border-white/30'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {Icon && <Icon size={16} className={`shrink-0 transition-colors ${isOpen || selected.length > 0 ? 'text-tennis-lime' : 'text-gray-400'}`} />}
          {selected.length === 0 ? (
            <span className="text-gray-500 text-sm truncate font-medium">{placeholder}</span>
          ) : (
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              <span className="text-white text-sm font-bold tracking-wide">{selected.length} {t('homePage.filters.selected')}</span>
            </div>
          )}
        </div>
        <div className={`transition-transform duration-300 text-gray-500 ${isOpen ? 'rotate-180 text-tennis-lime' : ''}`}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-30 w-full mt-2 bg-[#1a1d26] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {options.map((option: string) => (
            <div
              key={option}
              className="px-4 py-3 text-sm text-gray-300 hover:bg-white/5 cursor-pointer flex items-center justify-between transition-colors group/item"
              onClick={() => toggleOption(option)}
            >
              <span className={`font-medium transition-all ${selected.includes(option) ? 'text-white translate-x-1' : 'group-hover/item:text-white'}`}>{option}</span>
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${selected.includes(option) ? 'bg-tennis-lime border-tennis-lime scale-100' : 'border-gray-600 bg-transparent scale-90 opacity-50'}`}>
                {selected.includes(option) && <X size={10} className="text-black stroke-[3px]" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  country: string;
  play_style: string;
  surface_preference: string;
  profile_image_url: string;
  overall_rating?: number;
  tour: 'ATP' | 'WTA';
}

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  countries: string[];
  playStyles: string[];
  surfaces: string[];
  countryFilter: string;
  setCountryFilter: (c: string) => void;
  playStyleFilter: string[];
  setPlayStyleFilter: (s: string[]) => void;
  surfaceFilter: string;
  setSurfaceFilter: (s: string) => void;
  ratingFilter: number;
  setRatingFilter: (r: number) => void;
  sortBy: 'name' | 'rating';
  setSortBy: (s: 'name' | 'rating') => void;
  totalResults: number;
  onReset: () => void;
}

function FilterSheet({
  isOpen,
  onClose,
  countries,
  playStyles,
  surfaces,
  countryFilter,
  setCountryFilter,
  playStyleFilter,
  setPlayStyleFilter,
  surfaceFilter,
  setSurfaceFilter,
  ratingFilter,
  setRatingFilter,
  sortBy,
  setSortBy,
  totalResults,
  onReset
}: FilterSheetProps) {
  const { t } = useTranslation();
  
  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-end md:items-center no-select">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={onClose}
      />
      
      <motion.div
        initial={window.innerWidth < 768 ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
        animate={window.innerWidth < 768 ? { y: 0 } : { scale: 1, opacity: 1 }}
        exit={window.innerWidth < 768 ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 260 }}
        className="relative w-full md:max-w-lg max-h-[85vh] md:max-h-[90vh] bg-[#13151b] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] flex flex-col overflow-hidden z-10 shadow-2xl"
      >
        <div className="md:hidden flex justify-center py-3">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm font-medium">Cancel</button>
          <span className="text-sm font-black uppercase tracking-widest text-white">Refine Scout</span>
          <button onClick={onClose} className="text-tennis-lime hover:text-tennis-lime/80 text-sm font-black uppercase tracking-wider">Done</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-32">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('homePage.footer.sortBy')}</label>
            <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/10 h-10 select-none relative">
              <button
                onClick={() => setSortBy('name')}
                className="flex-1 text-center font-bold text-xs tracking-widest relative z-10 flex items-center justify-center rounded-lg transition-colors h-full focus:outline-none"
                style={{ color: sortBy === 'name' ? '#000' : 'rgba(255,255,255,0.45)' }}
              >
                {t('homePage.footer.name')}
              </button>
              <button
                onClick={() => setSortBy('rating')}
                className="flex-1 text-center font-bold text-xs tracking-widest relative z-10 flex items-center justify-center rounded-lg transition-colors h-full focus:outline-none"
                style={{ color: sortBy === 'rating' ? '#000' : 'rgba(255,255,255,0.45)' }}
              >
                {t('homePage.footer.rating')}
              </button>
              <motion.div
                layoutId="activeSortBg"
                className="absolute top-0.5 bottom-0.5 rounded-[10px] bg-tennis-lime shadow-md"
                style={{
                  left: sortBy === 'name' ? '2px' : '50%',
                  width: 'calc(50% - 4px)',
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('homePage.filters.allCountries')}</label>
            <SearchableSelect 
              placeholder={t('homePage.filters.allCountries')}
              options={countries}
              value={countryFilter}
              onChange={setCountryFilter}
              icon={MapPin}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('homePage.filters.filterStyles')}</label>
            <MultiSelect 
              placeholder={t('homePage.filters.filterStyles')}
              options={playStyles}
              selected={playStyleFilter}
              onChange={setPlayStyleFilter}
              icon={Activity}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('homePage.filters.allSurfaces')}</label>
            <SearchableSelect 
              placeholder={t('homePage.filters.allSurfaces')}
              options={surfaces}
              value={surfaceFilter}
              onChange={setSurfaceFilter}
              icon={Layers}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('homePage.filters.allRatings')}</label>
            <div className="relative group">
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(Number(e.target.value))}
                className="w-full px-4 py-3 bg-[#1a1d26] border border-white/10 rounded-xl focus:outline-none focus:border-tennis-lime text-white text-sm appearance-none cursor-pointer transition-colors"
              >
                <option value="0">{t('homePage.filters.allRatings')}</option>
                <option value="90">90+ Elite</option>
                <option value="80">80+ Excellent</option>
                <option value="70">70+ Very Good</option>
                <option value="60">60+ Good</option>
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-tennis-lime transition-colors">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-[#13151b]/95 backdrop-blur-md border-t border-white/[0.06] p-6 flex items-center justify-between gap-4">
          <button onClick={onReset} className="text-gray-400 hover:text-red-400 text-xs font-black uppercase tracking-wider transition-colors">
            Reset All
          </button>
          <button onClick={onClose} className="px-8 py-3.5 bg-tennis-lime text-black font-black uppercase tracking-wider text-xs rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-tennis-lime/20 flex-1 text-center">
            Show {totalResults} Players
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface HomePageProps {
  onPlayerClick: (playerId: string) => void;
}

export function HomePage({ onPlayerClick }: HomePageProps) {
  const { t } = useTranslation();
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // SOTA Marketing: Trigger NeoBet promo modal once per session on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        const dismissed = safeSessionStorage.getItem('neobet_promo_dismissed');
        if (!dismissed) {
          setIsPromoOpen(true);
          safeSessionStorage.setItem('neobet_promo_dismissed', 'true');
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [players, setPlayers] = useState<Player[]>(() => {
    const cached = safeLocalStorage.getItem('bh_cached_players');
    return cached ? JSON.parse(cached) : [];
  });
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>(() => {
    const cached = safeLocalStorage.getItem('bh_cached_players');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => {
    return !safeLocalStorage.getItem('bh_cached_players');
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [tourFilter, setTourFilter] = useState<'ATP' | 'WTA'>('ATP');
  const [countryFilter, setCountryFilter] = useState('');
  const [playStyleFilter, setPlayStyleFilter] = useState<string[]>([]);
  const [surfaceFilter, setSurfaceFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'name' | 'rating'>('name');

  const [countries, setCountries] = useState<string[]>([]);
  const [playStyles, setPlayStyles] = useState<string[]>([]);
  const [surfaces, setSurfaces] = useState<string[]>([]);

  // --- SOTA: Automatic Derived State Sync from Players Cache ---
  useEffect(() => {
    if (players.length > 0) {
      const uniqueCountries = [...new Set(players.map(p => p.country).filter(Boolean))];
      const allStylesRaw = players.map(p => p.play_style).filter(Boolean);
      const uniquePlayStyles = new Set<string>();
      allStylesRaw.forEach(s => {
          s.split(',').forEach(sub => uniquePlayStyles.add(sub.split('(')[0].trim())); 
      });
      const uniqueSurfaces = [...new Set(players.map(p => p.surface_preference).filter(Boolean))];

      setCountries(uniqueCountries.sort());
      setPlayStyles(Array.from(uniquePlayStyles).sort());
      setSurfaces(uniqueSurfaces.sort());
    }
  }, [players]);

  const normalizePlayStyle = (style: string) => {
    if (!style) return '';
    return style;
  };

  useEffect(() => {
    loadPlayers();
    const playersChannel = supabase
      .channel('homepage-players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        loadPlayers();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, []);

  // Filters panel removed in favor of iOS FilterSheet

  useEffect(() => {
    filterPlayers();
  }, [debouncedSearchTerm, tourFilter, countryFilter, playStyleFilter, surfaceFilter, ratingFilter, sortBy, players]);

  useEffect(() => {
    if (debouncedSearchTerm.trim().length > 2) {
      const timer = setTimeout(() => {
        trackEvent('global_search', { query: debouncedSearchTerm, tour: tourFilter });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (countryFilter || playStyleFilter.length > 0 || surfaceFilter || ratingFilter > 0) {
      trackEvent('filters_refined', {
        country: countryFilter || 'all',
        style: playStyleFilter.join(',') || 'all',
        surface: surfaceFilter || 'all',
        min_rating: ratingFilter
      });
    }
  }, [countryFilter, playStyleFilter, surfaceFilter, ratingFilter]);

  const loadPlayers = async () => {
    try {
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('last_name', { ascending: true });

      if (playersError) throw playersError;

      const { data: skillsData } = await supabase
        .from('player_skills')
        .select('player_id, overall_rating');

      const skillsMap = new Map(skillsData?.map(s => [s.player_id, s.overall_rating]) || []);

      const playersWithRatings = playersData?.map(player => ({
        ...player,
        play_style: normalizePlayStyle(player.play_style),
        overall_rating: skillsMap.get(player.id) || 0
      })) || [];

      setPlayers(playersWithRatings);
      setFilteredPlayers(playersWithRatings);
      
      // SOTA: Cache in localStorage
      safeLocalStorage.setItem('bh_cached_players', JSON.stringify(playersWithRatings));
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    let filtered = [...players];

    filtered = filtered.filter((p) => p.tour === tourFilter);

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.first_name.toLowerCase().includes(term) ||
          p.last_name.toLowerCase().includes(term) ||
          p.country.toLowerCase().includes(term) || 
          p.play_style.toLowerCase().includes(term)
      );
    }

    if (countryFilter) {
      filtered = filtered.filter((p) => p.country === countryFilter);
    }

    if (playStyleFilter.length > 0) {
      filtered = filtered.filter((p) => {
        return playStyleFilter.some(selectedStyle => 
          p.play_style.toLowerCase().includes(selectedStyle.toLowerCase())
        );
      });
    }

    if (surfaceFilter) {
      filtered = filtered.filter((p) => p.surface_preference === surfaceFilter);
    }

    if (ratingFilter > 0) {
      filtered = filtered.filter((p) => (p.overall_rating || 0) >= ratingFilter);
    }

    if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0));
    } else {
      filtered.sort((a, b) => a.last_name.localeCompare(b.last_name));
    }

    setFilteredPlayers(filtered);
  };

  const handleTourChange = (tour: 'ATP' | 'WTA') => {
    setTourFilter(tour);
    trackEvent('tour_toggle', { tour });
  };

  const handlePlayerClick = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    trackEvent('player_card_open', { 
      player_id: playerId, 
      player_name: player ? `${player.first_name} ${player.last_name}` : 'Unknown',
      tour: tourFilter
    });
    onPlayerClick(playerId);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCountryFilter('');
    setPlayStyleFilter([]);
    setSurfaceFilter('');
    setRatingFilter(0);
    setSortBy('name');
    trackEvent('filters_reset');
  };

  const removePlayStyleTag = (style: string) => {
    setPlayStyleFilter(playStyleFilter.filter(s => s !== style));
  };

  const hasActiveFilters = countryFilter || playStyleFilter.length > 0 || surfaceFilter || ratingFilter > 0;

  if (loading) return <LoadingScreen message={t('homePage.loading')} />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      
      {/* 🚀 SOTA FIX: CSS nativ in der Component, damit SSR Build nicht crasht */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* HEADER SECTION WITH AI STATS WIDGET */}
      <div className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="flex-1">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-3 uppercase tracking-tight">{t('homePage.title')}</h1>
          <p className="text-gray-400 text-sm md:text-base font-medium max-w-xl">
            {t('homePage.subtitle')}
          </p>
        </div>
        
        {/* HERO WIDGET PLACEMENT */}
        <div className="w-full lg:w-auto">
            <AIStatsHero isMobile={isMobile} />
        </div>
      </div>

      {/* 🚀 SOTA: NEO.bet Premium-Kooperationsleiste */}
      <div className="mb-8">
         <PartnerBadge variant="full" onPromoClick={() => setIsPromoOpen(true)} />
      </div>

      {/* COMPACT FILTER BAR */}
      <div className="bg-[#1a1d26] rounded-2xl shadow-xl border border-white/5 mb-8 transition-all duration-300 hover:border-white/10">
        
        {/* TOP ROW */}
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
            
            <div className="relative flex-1 w-full group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-tennis-lime transition-colors" size={18} />
                <input
                    type="text"
                    placeholder={t('homePage.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-tennis-lime focus:bg-black/40 text-white placeholder-gray-500 text-sm transition-all shadow-inner"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/5 relative h-10 w-full md:w-44 select-none">
                    <button 
                        onClick={() => handleTourChange('ATP')}
                        className="flex-1 text-center font-bold text-xs tracking-widest relative z-10 flex items-center justify-center rounded-lg transition-colors h-full focus:outline-none"
                        style={{ color: tourFilter === 'ATP' ? '#000' : 'rgba(255,255,255,0.45)' }}
                    >ATP</button>
                    <button 
                        onClick={() => handleTourChange('WTA')}
                        className="flex-1 text-center font-bold text-xs tracking-widest relative z-10 flex items-center justify-center rounded-lg transition-colors h-full focus:outline-none"
                        style={{ color: tourFilter === 'WTA' ? '#000' : 'rgba(255,255,255,0.45)' }}
                    >WTA</button>
                    <motion.div
                      layoutId="activeTourBg"
                      className="absolute top-0.5 bottom-0.5 rounded-[10px] bg-tennis-lime shadow-md"
                      style={{
                        left: tourFilter === 'ATP' ? '2px' : '50%',
                        width: 'calc(50% - 4px)',
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                </div>

                <button 
                    onClick={() => setIsFilterSheetOpen(true)}
                    className={`p-3 rounded-xl border transition-all duration-300 relative group ${hasActiveFilters ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-black/20 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'}`}
                >
                    <SlidersHorizontal size={20} className="group-hover:scale-110 transition-transform"/>
                    {playStyleFilter.length + (countryFilter ? 1 : 0) + (surfaceFilter ? 1 : 0) + (ratingFilter > 0 ? 1 : 0) > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-tennis-lime text-black border-2 border-[#1a1d26] rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">
                            {playStyleFilter.length + (countryFilter ? 1 : 0) + (surfaceFilter ? 1 : 0) + (ratingFilter > 0 ? 1 : 0)}
                        </span>
                    )}
                </button>
            </div>
        </div>
        
        {/* ACTIVE FILTERS VISUALIZATION */}
        {hasActiveFilters && (
            <div className="px-4 pb-4 flex flex-wrap gap-2 animate-in slide-in-from-top-2 border-t border-white/5 pt-3">
                {countryFilter && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-xs font-bold uppercase tracking-wider shadow-sm">
                        <MapPin size={10} /> {countryFilter}
                        <button onClick={() => setCountryFilter('')} className="hover:text-white transition-colors"><X size={12} /></button>
                    </div>
                )}
                {surfaceFilter && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-xs font-bold uppercase tracking-wider shadow-sm">
                        <Layers size={10} /> {surfaceFilter}
                        <button onClick={() => setSurfaceFilter('')} className="hover:text-white transition-colors"><X size={12} /></button>
                    </div>
                )}
                {playStyleFilter.map(style => (
                    <div key={style} className="flex items-center gap-2 px-3 py-1 bg-tennis-lime/10 border border-tennis-lime/30 rounded-full text-tennis-lime text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(132,204,22,0.1)]">
                        <Activity size={10} /> {style}
                        <button onClick={() => removePlayStyleTag(style)} className="hover:text-white transition-colors"><X size={12} /></button>
                    </div>
                ))}
                {ratingFilter > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-500 text-xs font-bold uppercase tracking-wider shadow-sm">
                        <Sparkles size={10} /> {ratingFilter}+ {t('homePage.filters.rating')}
                        <button onClick={() => setRatingFilter(0)} className="hover:text-white transition-colors"><X size={12} /></button>
                    </div>
                )}
            </div>
        )}

      </div>

      {/* RESULTS COUNT & ACTIVE TAGS SUMMARY */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">
              {filteredPlayers.length} {t('homePage.footer.players')} found
          </span>
          
          {hasActiveFilters && (
              <button onClick={resetFilters} className="text-[10px] text-gray-500 hover:text-red-400 underline transition-colors font-bold uppercase tracking-wider">
                  {t('homePage.filters.clearAll')}
              </button>
          )}
      </div>

      {/* PLAYER GRID */}
      {filteredPlayers.length === 0 ? (
        <div className="text-center py-20 bg-[#1a1d26] rounded-3xl border border-white/5 border-dashed animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-black/30 p-6 rounded-full inline-block mb-4 shadow-lg"><Filter size={32} className="text-gray-600"/></div>
          <h3 className="text-white font-bold text-lg mb-1">{t('homePage.noResults.title')}</h3>
          <p className="text-gray-400 font-medium mb-6">{t('homePage.noResults.subtitle')}</p>
          <button onClick={resetFilters} className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-tennis-lime transition-colors shadow-lg">{t('homePage.noResults.button')}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onClick={() => handlePlayerClick(player.id)}
            />
          ))}
          <ScrollToTop />
        </div>
      )}

      {/* RESPONSIBLE GAMBLING DISCLAIMER */}
      <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-600">
              <AlertTriangle size={12} /> {t('homePage.disclaimer')}
          </p>
      </div>



      <AnimatePresence>
        {isFilterSheetOpen && (
          <FilterSheet 
            isOpen={isFilterSheetOpen}
            onClose={() => setIsFilterSheetOpen(false)}
            countries={countries}
            playStyles={playStyles}
            surfaces={surfaces}
            countryFilter={countryFilter}
            setCountryFilter={setCountryFilter}
            playStyleFilter={playStyleFilter}
            setPlayStyleFilter={setPlayStyleFilter}
            surfaceFilter={surfaceFilter}
            setSurfaceFilter={setSurfaceFilter}
            ratingFilter={ratingFilter}
            setRatingFilter={setRatingFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            totalResults={filteredPlayers.length}
            onReset={resetFilters}
          />
        )}
      </AnimatePresence>

      {/* NeoBet Promo Modal */}
      <NeoBetPromoModal isOpen={isPromoOpen} onClose={() => setIsPromoOpen(false)} />

    </div>
  );
}