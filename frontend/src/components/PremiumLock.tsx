import { Lock, Crown, Zap, Loader2, ArrowUpRight, X, ShieldCheck } from 'lucide-react';
import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCountry } from '../hooks/useCountry';
import { AuthModal } from './AuthModal';

interface PremiumLockProps {
  title: string;
  description: string;
  minTier: 'ELITE' | 'PREMIUM' | string;
  blurAmount?: string; 
  children: ReactNode;
  isLocked: boolean;
}

export function PremiumLock({ title, description, minTier, blurAmount = "blur-xl", children, isLocked }: PremiumLockProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country, loading: countryLoading } = useCountry();
  
  const [neobetUsername, setNeobetUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');
  const [submittedUsername, setSubmittedUsername] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check if user has an existing affiliate request
  useEffect(() => {
    if (!user) {
      setRequestStatus('idle');
      setSubmittedUsername('');
      return;
    }

    const checkRequestStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('affiliate_requests')
          .select('neobet_username, status, rejection_reason')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setRequestStatus(data[0].status as any);
          setSubmittedUsername(data[0].neobet_username);
          if (data[0].status === 'rejected' && data[0].rejection_reason) {
            setErrorMsg(`Abgelehnt: ${data[0].rejection_reason}`);
          }
        } else {
          setRequestStatus('idle');
        }
      } catch (err) {
        console.error('Error fetching affiliate request status:', err);
      }
    };

    checkRequestStatus();
  }, [user]);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!neobetUsername.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('affiliate_requests')
        .insert({
          user_id: user.id,
          neobet_username: neobetUsername.trim(),
          status: 'pending',
          rejection_reason: null
        });

      if (error) throw error;

      setRequestStatus('pending');
      setSubmittedUsername(neobetUsername.trim());
      setSuccessMsg("Dein Antrag wurde erfolgreich übermittelt! Wir prüfen deinen Benutzernamen und schalten deinen Account in Kürze frei.");
    } catch (err: any) {
      console.error('Error requesting access:', err);
      setErrorMsg(err.message || 'Die Anfrage konnte nicht gesendet werden. Bitte versuche es später erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  if (countryLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl min-h-[400px] bg-[#15171e] border border-white/5 w-full flex items-center justify-center">
        <Loader2 className="animate-spin text-tennis-lime" size={32} />
      </div>
    );
  }

  const isDeOrAt = country === 'DE' || country === 'AT';

  if (!isDeOrAt) {
    const tierKey = (minTier || 'ELITE').toString().toUpperCase().trim();
    const isElite = tierKey === 'ELITE';
    const borderColor = isElite ? 'border-yellow-500/30' : 'border-fuchsia-500/30';
    const iconColor = isElite ? 'text-yellow-400' : 'text-fuchsia-400';
    const Icon = isElite ? Zap : Crown;

    return (
      <div className="relative overflow-hidden rounded-3xl group min-h-[500px] bg-[#0e1117] border border-white/5 w-full">
        {/* Blurred Content */}
        <div className={`filter ${blurAmount} opacity-20 pointer-events-none select-none absolute inset-0 h-full w-full`}>
          {children}
        </div>

        {/* Lock Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#1a1d26]/90 border border-white/10 p-8 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center backdrop-blur-xl">
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
              className="w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs bg-white text-black hover:bg-gray-200 transition-colors shadow-lg animate-pulse"
            >
              Unlock {tierKey}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is from DE or AT, render the NeoBet Affiliate Free Unlock Overlay
  return (
    <div className="relative w-full min-h-[80vh] flex items-center justify-center rounded-3xl border border-white/5 bg-[#0a0b0e] overflow-hidden">
      {/* Blurred background feed (Very subtle for premium aesthetic) */}
      <div className={`absolute inset-0 filter ${blurAmount} opacity-5 pointer-events-none select-none h-full w-full`}>
        {children}
      </div>

      {/* Subtle Glowing Effect - Apple style Backglow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-tennis-lime/10 rounded-full blur-[100px] md:blur-[130px] pointer-events-none" />

      {/* Main Container Sheet (Natural height, no clipping) */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-10 md:py-16 flex flex-col items-center text-center">
        
        {/* Sponsoring Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tennis-lime/10 border border-tennis-lime/20 text-[9px] font-black uppercase tracking-widest text-tennis-lime mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-tennis-lime animate-pulse"></span>
          Sponsoring-Partner | Exklusive Kooperation
        </div>

        <h1 className="text-white font-black uppercase tracking-tight text-2xl md:text-4xl mb-4 max-w-xl leading-none">
          Schalte den Value Scanner & AI Picks 100% kostenlos frei!
        </h1>

        <p className="text-gray-400 text-xs md:text-sm font-medium mb-8 leading-relaxed max-w-lg">
          Wir verlangen kein Geld von dir. Registriere dich einfach über unseren Partner-Link bei NeoBet, sichere dir deine 25€ Freiwette und zahle mindestens 10€ ein. Gib danach unten deinen NeoBet-Usernamen ein, um deinen lebenslangen Premium-Zugang zu aktivieren!
        </p>

        {/* Revolut Onboarding Steps Grid Layout (Super Premium) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-8">
          <div className="bg-[#15171e]/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center backdrop-blur-md">
            <span className="w-8 h-8 rounded-full bg-tennis-lime/10 border border-tennis-lime/20 flex items-center justify-center text-[10px] font-black text-tennis-lime mb-2">1</span>
            <h4 className="text-[10px] font-black uppercase text-white tracking-wider mb-1">Registrieren</h4>
            <p className="text-[9px] text-gray-500 leading-normal">Über den Partner-Link bei NEO.bet registrieren.</p>
          </div>
          <div className="bg-[#15171e]/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center backdrop-blur-md">
            <span className="w-8 h-8 rounded-full bg-tennis-lime/10 border border-tennis-lime/20 flex items-center justify-center text-[10px] font-black text-tennis-lime mb-2">2</span>
            <h4 className="text-[10px] font-black uppercase text-white tracking-wider mb-1">Einzahlen</h4>
            <p className="text-[9px] text-gray-500 leading-normal">Mindestens 10€ einzahlen & 25€ Freiwette sichern.</p>
          </div>
          <div className="bg-[#15171e]/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center backdrop-blur-md">
            <span className="w-8 h-8 rounded-full bg-tennis-lime/10 border border-tennis-lime/20 flex items-center justify-center text-[10px] font-black text-tennis-lime mb-2">3</span>
            <h4 className="text-[10px] font-black uppercase text-white tracking-wider mb-1">Freischalten</h4>
            <p className="text-[9px] text-gray-500 leading-normal">NeoBet-Namen eintragen & Premium aktivieren.</p>
          </div>
        </div>

        {/* Action Panel */}
        <div className="w-full max-w-md space-y-4">
          
          {/* Step 1: NeoBet Registration Link */}
          <a
            href="https://neo.bet/de/Sportwetten/Tennis?affiliateId=backhandtl-promo-popup"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-14 rounded-2xl font-black uppercase tracking-wider text-xs md:text-sm bg-gradient-to-r from-[#95c11f] to-[#b5e000] text-black hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_4px_25px_rgba(149,193,31,0.2)] flex items-center justify-center gap-2 cursor-pointer"
          >
            1. Bei NEO.bet registrieren & Freiwette sichern
            <ArrowUpRight size={16} className="stroke-[3px]" />
          </a>

          {/* Step 2: Account Submission or Authentication Check */}
          {!user ? (
            <div className="bg-[#15171e]/50 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
              <p className="text-gray-400 text-xs font-semibold mb-4 leading-normal">
                Melde dich an, um deinen NeoBet-Benutzernamen einzugeben und deinen lebenslangen Premium-Zugang zu aktivieren.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-tennis-lime hover:bg-tennis-lime/80 text-black transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                Jetzt registrieren / einloggen
              </button>
            </div>
          ) : (
            <div className="bg-[#15171e]/50 border border-white/5 rounded-2xl p-6 text-left backdrop-blur-md">
              {requestStatus === 'pending' ? (
                <div className="flex items-start gap-4 text-yellow-400 py-2">
                  <Loader2 className="animate-spin mt-0.5 shrink-0" size={18} />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest mb-1">Prüfung ausstehend</h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                      Dein Antrag für den NeoBet-Benutzernamen <strong className="text-white">"{submittedUsername}"</strong> wird derzeit geprüft. Die Freischaltung erfolgt in der Regel innerhalb von 24 Stunden.
                    </p>
                  </div>
                </div>
              ) : requestStatus === 'rejected' ? (
                <div>
                  <div className="flex items-start gap-3.5 text-red-400 mb-4 py-2 border-b border-white/5">
                    <X className="shrink-0 mt-0.5 border border-red-500/20 bg-red-500/10 p-0.5 rounded-full" size={18} />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest mb-1">Antrag abgelehnt</h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                        Der NeoBet-Benutzername <strong className="text-white">"{submittedUsername}"</strong> konnte nicht freigeschaltet werden. {errorMsg || 'Bitte überprüfe deine Angaben.'}
                      </p>
                    </div>
                  </div>
                  <form onSubmit={handleRequestAccess} className="space-y-3">
                    <input 
                      type="text" 
                      value={neobetUsername} 
                      onChange={(e) => setNeobetUsername(e.target.value)}
                      placeholder="Korrigerten NeoBet-Namen eingeben"
                      className="w-full h-12 bg-black/40 border border-white/10 focus:border-tennis-lime rounded-xl px-4 text-white text-sm font-bold outline-none placeholder-gray-600 transition-all text-center focus:ring-1 focus:ring-tennis-lime/50"
                    />
                    <button 
                      type="submit"
                      disabled={submitting || !neobetUsername.trim()}
                      className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-white text-black hover:bg-gray-200 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="animate-spin" size={14} /> : "Erneut anfordern"}
                    </button>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleRequestAccess} className="space-y-4">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2">
                      2. NeoBet-Benutzernamen eintragen
                    </label>
                    <input 
                      type="text" 
                      value={neobetUsername} 
                      onChange={(e) => setNeobetUsername(e.target.value)}
                      placeholder="z. B. DeinNeoBetName123"
                      className="w-full h-14 bg-black/40 border border-white/10 focus:border-tennis-lime rounded-2xl px-4 text-white text-base font-bold outline-none placeholder-gray-650 transition-all text-center focus:ring-1 focus:ring-tennis-lime/50"
                    />
                  </div>
                  
                  {errorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] text-center uppercase font-black tracking-wider">
                      {errorMsg}
                    </div>
                  )}
                  
                  {successMsg && (
                    <div className="p-3 bg-tennis-lime/10 border border-tennis-lime/20 rounded-xl text-tennis-lime text-[10px] text-center font-black uppercase tracking-wider">
                      {successMsg}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={submitting || !neobetUsername.trim()}
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-gradient-to-r from-tennis-lime to-tennis-green hover:from-tennis-lime/90 hover:to-tennis-green/90 text-black shadow-lg shadow-tennis-lime/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale cursor-pointer transition-all duration-300 hover:scale-[1.01]"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : "Premium-Zugang freischalten"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Legal Regulatory Spielerschutz Footer */}
        <div className="mt-12 pt-6 border-t border-white/5 w-full max-w-xl space-y-3 text-[9px] md:text-[10.5px] text-gray-500 leading-relaxed font-semibold">
          <div className="flex items-center justify-center gap-1.5 text-gray-400 font-black uppercase tracking-widest text-[8.5px]">
            <ShieldCheck size={12} className="text-tennis-lime" />
            <span>Offiziell lizenziert & reguliert (GGL Whitelist)</span>
          </div>
          <p className="uppercase tracking-widest text-[8px] text-gray-600">Werbung / Sponsoring-Partner</p>
          <p className="px-4">
            Teilnahme ab 18 Jahren. Glücksspiel kann süchtig machen. Hilfe und Beratung unter buwei.de oder der kostenlosen BZgA-Hotline: 0800 1372700.
          </p>
        </div>
      </div>

      {/* Render AuthModal locally so it's perfectly decoupled */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
    </div>
  );
}