import { Lock, Crown, Zap, Loader2, ArrowUpRight, X } from 'lucide-react';
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

export function PremiumLock({ title, description, minTier, blurAmount = "blur-md", children, isLocked }: PremiumLockProps) {
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
        <Loader2 className="animate-spin text-cyan-400" size={32} />
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
      <div className="relative overflow-hidden rounded-2xl group min-h-[400px] bg-[#15171e] border border-white/5 w-full">
        {/* Blurred Content */}
        <div className={`filter ${blurAmount} opacity-20 pointer-events-none select-none absolute inset-0 h-full w-full`}>
          {children}
        </div>

        {/* Lock Overlay */}
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

  // If user is from DE or AT, render the NeoBet Affiliate Free Unlock Overlay
  return (
    <div className="relative overflow-hidden rounded-2xl group min-h-[500px] bg-[#15171e] border border-white/5 w-full">
      {/* Blurred Content */}
      <div className={`filter ${blurAmount} opacity-10 pointer-events-none select-none absolute inset-0 h-full w-full`}>
        {children}
      </div>

      {/* Modern, glassmorphic NeoBet Unlock Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
        <div className="bg-gradient-to-br from-[#0c1f35]/95 via-[#081829]/95 to-[#040912]/95 border border-cyan-500/25 p-6 md:p-8 rounded-3xl shadow-2xl max-w-xl w-full backdrop-blur-xl flex flex-col items-center text-center relative overflow-hidden">
          
          {/* Subtle Glowing Effect */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px] pointer-events-none" />

          {/* Sponsoring Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[9px] font-black uppercase tracking-widest text-cyan-400 mb-5 relative z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Sponsoring-Partner | Exklusive Kooperation
          </div>

          <h3 className="text-white font-black uppercase tracking-tight text-xl md:text-2xl mb-4 max-w-md leading-tight relative z-10">
            Schalte den Value Scanner & AI Picks 100% kostenlos frei!
          </h3>

          <p className="text-gray-300 text-xs md:text-sm font-medium mb-6 leading-relaxed max-w-lg relative z-10">
            Wir verlangen kein Geld von dir. Registriere dich einfach über unseren Partner-Link bei NeoBet, sichere dir deine 25€ Freiwette und zahle mindestens 10€ ein. Gib danach unten deinen NeoBet-Usernamen ein, um deinen lebenslangen Premium-Zugang zu aktivieren!
          </p>

          <div className="w-full space-y-4 mb-6 relative z-10">
            {/* Step 1: External Affiliate Button */}
            <a
              href="https://neo.bet/de/Sportwetten/Tennis?affiliateId=backhandtl-promo-popup"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-xl font-bold uppercase tracking-[0.12em] text-xs md:text-sm bg-gradient-to-r from-[#95c11f] to-[#b5e000] text-black hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_20px_rgba(149,193,31,0.25)] flex items-center justify-center gap-2 cursor-pointer"
            >
              1. Bei NEO.bet registrieren & 25€ Freiwette sichern
              <ArrowUpRight size={16} className="stroke-[3px]" />
            </a>

            {/* Step 2: Username insertion (or login prompt) */}
            {!user ? (
              <div className="bg-black/25 border border-white/5 rounded-2xl p-4">
                <p className="text-gray-400 text-[11px] font-semibold mb-3 leading-normal">
                  Melde dich an, um deinen NeoBet-Benutzernamen einzugeben und deinen lebenslangen Premium-Zugang zu aktivieren.
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] bg-cyan-500 hover:bg-cyan-600 text-white transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  Jetzt registrieren / einloggen
                </button>
              </div>
            ) : (
              <div className="bg-black/25 border border-white/5 rounded-2xl p-4 text-left">
                {requestStatus === 'pending' ? (
                  <div className="flex items-start gap-3 text-yellow-400">
                    <Loader2 className="animate-spin mt-0.5 shrink-0" size={16} />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-1">Prüfung ausstehend</h4>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        Dein Antrag für den NeoBet-Benutzernamen <strong className="text-white">"{submittedUsername}"</strong> wird derzeit geprüft. Die Freischaltung erfolgt in der Regel innerhalb von 24 Stunden.
                      </p>
                    </div>
                  </div>
                ) : requestStatus === 'rejected' ? (
                  <div>
                    <div className="flex items-start gap-3 text-red-400 mb-3">
                      <X className="shrink-0 mt-0.5 border border-red-500/20 bg-red-500/5 p-0.5 rounded-full" size={16} />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-1">Antrag abgelehnt</h4>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          Der NeoBet-Benutzername <strong className="text-white">"{submittedUsername}"</strong> konnte nicht verifiziert werden. {errorMsg || 'Bitte überprüfe deine Registrierung.'}
                        </p>
                      </div>
                    </div>
                    <form onSubmit={handleRequestAccess} className="space-y-3">
                      <input 
                        type="text" 
                        value={neobetUsername} 
                        onChange={(e) => setNeobetUsername(e.target.value)}
                        placeholder="Korrigierten NeoBet-Benutzernamen eingeben"
                        className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none placeholder-gray-600 transition-all text-center"
                      />
                      
                      {errorMsg && !errorMsg.includes('Abgelehnt:') && (
                        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] text-center uppercase font-bold">
                          {errorMsg}
                        </div>
                      )}
                      
                      {successMsg && (
                        <div className="p-2 bg-tennis-lime/10 border border-tennis-lime/20 rounded-xl text-tennis-lime text-[10px] text-center font-bold uppercase">
                          {successMsg}
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={submitting || !neobetUsername.trim()}
                        className="w-full py-3.5 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] bg-white text-black hover:bg-gray-200 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? <Loader2 className="animate-spin" size={14} /> : "Erneut anfordern"}
                      </button>
                    </form>
                  </div>
                ) : (
                  <form onSubmit={handleRequestAccess} className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                      2. NeoBet-Benutzernamen eintragen
                    </label>
                    <input 
                      type="text" 
                      value={neobetUsername} 
                      onChange={(e) => setNeobetUsername(e.target.value)}
                      placeholder="NeoBet-Benutzername eingeben"
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none placeholder-gray-600 transition-all text-center"
                    />
                    
                    {errorMsg && (
                      <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] text-center uppercase font-bold">
                        {errorMsg}
                      </div>
                    )}
                    
                    {successMsg && (
                      <div className="p-2 bg-tennis-lime/10 border border-tennis-lime/20 rounded-xl text-tennis-lime text-[10px] text-center font-bold uppercase">
                        {successMsg}
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={submitting || !neobetUsername.trim()}
                      className="w-full py-3.5 rounded-xl font-black uppercase tracking-[0.15em] text-xs bg-white text-black hover:bg-gray-200 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? <Loader2 className="animate-spin" size={14} /> : "Lebenslangen Premium-Zugang anfordern"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Legal and Spielerschutz footer */}
          <div className="mt-6 pt-5 border-t border-white/5 space-y-2.5 text-[9px] md:text-[10px] text-gray-500 leading-relaxed font-medium relative z-10">
            <p className="uppercase tracking-widest text-[8px] text-gray-600">Werbung / Sponsoring-Partner</p>
            <p>
              Teilnahme ab 18 Jahren. Glücksspiel kann süchtig machen. Hilfe und Beratung unter buwei.de oder der kostenlosen BZgA-Hotline: 0800 1372700.
            </p>
          </div>
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