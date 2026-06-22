import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, Swords, Gauge, Shield,
  LogOut, Zap, Star, User, TrendingUp,
  Crown, Gift, Loader2, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft,
  LifeBuoy, Radar, Target
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from './BrandLogo';
import { LanguageSelector } from './LanguageSelector';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';


function MenuRedeemWidget({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleRedeem = async () => {
    if(!code.trim()) return;
    setStatus('loading');
    try {
      const { data, error } = await supabase.rpc('redeem_promo_code', { input_code: code.toUpperCase().trim() });
      if (error) throw error;
      if (data && data.success) {
        setStatus('success');
        setMsg(`+${data.value} ${data.type === 'credits' ? t('mobileMenu.status.credits') : 'Days'}`);
        setCode('');
        onSuccess();
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setMsg(data?.message || 'Invalid');
      }
    } catch (e) { setStatus('error'); setMsg('Error'); }
  };

  return (
    <div className="mt-4">
      <div className="relative flex items-center">
        <input
          value={code} onChange={e => { setCode(e.target.value); setStatus('idle'); }}
          placeholder={t('mobileMenu.enterPromoCode')}
          className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-4 pr-12 text-xs font-mono text-white uppercase focus:border-tennis-lime/50 outline-none transition-all placeholder-gray-600"
          disabled={status === 'loading'}
        />
        <button
          onClick={handleRedeem}
          disabled={!code || status === 'loading'}
          className="absolute right-2 p-1.5 bg-white/10 rounded-lg text-white hover:bg-tennis-lime hover:text-black transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? <Loader2 size={14} className="animate-spin"/> : <ChevronRight size={14}/>}
        </button>
      </div>
      {status !== 'idle' && (
        <div className={`mt-2 text-[10px] font-bold flex items-center gap-1.5 ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {status === 'success' ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>}
          {msg}
        </div>
      )}
    </div>
  );
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenMemberCard?: () => void;
  onOpenLegal?: (type: string) => void;
}

export function MobileMenu({ isOpen, onClose, currentPage, onNavigate, onOpenMemberCard, onOpenLegal }: MobileMenuProps) {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [showAccountOverlay, setShowAccountOverlay] = useState(false);

  const fetchProfile = async () => {
    if(user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if(data) setProfile(data);
    }
  };

  useEffect(() => {
    if(isOpen && user) fetchProfile();
    if(isOpen) setShowAccountOverlay(false);
  }, [isOpen, user]);

  const handleLogout = async () => {
    await signOut();
    onClose();
    onNavigate('home');
  };

  const handleUserClick = () => {
    if (onOpenMemberCard) {
      onClose();
      onOpenMemberCard();
    } else {
      setShowAccountOverlay(true);
    }
  };

  const menuGroups = [
    {
      title: t('mobileMenu.sections.scouting', 'Scouting'),
      items: [
        { id: 'home', label: t('mobileMenu.nav.playerDatabase'), icon: Users },
        { id: 'watchlist', label: t('mobileMenu.nav.watchlist'), icon: Star }
      ]
    },
    {
      title: t('mobileMenu.sections.aiTools', 'AI Analytics'),
      items: [
        { id: 'scanner', label: t('mobileMenu.nav.valueScanner'), icon: Zap, badge: t('mobileMenu.badges.hot') },
        { id: 'picks', label: t('mobileMenu.nav.aiPicks', { defaultValue: 'AI Picks' }), icon: Target, badge: t('mobileMenu.badges.new', { defaultValue: 'New' }) },
        { id: 'matchup', label: t('mobileMenu.nav.matchupAnalyzer'), icon: Swords },
        { id: 'oracle', label: t('mobileMenu.nav.tournamentOracle', { defaultValue: 'Tournament Oracle' }), icon: Radar },
        { id: 'courts', label: t('mobileMenu.nav.bsiCourtIndex'), icon: Gauge },
        { id: 'performance', label: t('mobileMenu.nav.aiPerformance'), icon: TrendingUp }
      ]
    },
    {
      title: t('mobileMenu.sections.accountHelp', 'Account & Support'),
      items: [
        { id: 'pricing', label: t('mobileMenu.nav.membershipPlans'), icon: Crown, badge: t('mobileMenu.badges.upgrade') },
        { id: 'support', label: t('mobileMenu.nav.supportIdeas'), icon: LifeBuoy, badge: t('mobileMenu.badges.help') }
      ]
    }
  ];

  if (isAdmin) {
    menuGroups[2].items.push({ id: 'admin', label: t('mobileMenu.nav.systemAdmin'), icon: Shield });
  }

  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();
  const tier = isPremium ? 'PRO' : 'FREE';
  const tierColor = isPremium ? 'text-yellow-400' : 'text-gray-400';

  return (
    <AnimatePresence>
    {isOpen && (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden no-select">

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <motion.div
        drag={!showAccountOverlay ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: window.innerWidth }}
        dragElastic={{ left: 0.05, right: 0.8 }}
        onDragEnd={(_e, info) => {
          if (info.offset.x > 100) {
            onClose();
          }
        }}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: "tween", duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-[85%] max-w-[340px] h-full flex flex-col overflow-hidden"
      >
        <div className="liquid-glass-sidebar">
          <div className="liquid-glass-sidebar-content">

            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <BrandLogo className="h-6 text-white" />
              <button onClick={onClose} className="liquid-header-btn">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 relative overflow-hidden">

              <motion.div
                className="absolute inset-0 flex flex-col overflow-y-auto no-scrollbar"
                animate={{ x: showAccountOverlay ? '-30%' : '0%', opacity: showAccountOverlay ? 0.5 : 1, scale: showAccountOverlay ? 0.95 : 1 }}
                transition={{ duration: 0.3 }}
                style={{ pointerEvents: showAccountOverlay ? 'none' : 'auto' }}
              >
                {user ? (
                  <div className="px-4 py-5">
                    <button
                      onClick={handleUserClick}
                      className="liquid-glass-user-card group"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPremium ? 'bg-yellow-500/15 text-yellow-400' : 'bg-white/[0.06] text-gray-400'}`}>
                        {isPremium ? <Crown size={18} /> : <User size={18} />}
                      </div>
                      <div className="flex-1 text-left overflow-hidden">
                        <div className="text-xs font-bold text-white truncate">{user.email?.split('@')[0]}</div>
                        <div className={`text-[10px] font-black uppercase tracking-wider ${isPremium ? 'text-yellow-500' : 'text-gray-500'}`}>
                          {t(isPremium ? 'mobileMenu.status.pro' : 'mobileMenu.status.free')}
                        </div>
                      </div>
                      <div className="liquid-menu-chevron">
                        <ChevronRight size={14} />
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-5">
                    <div className="liquid-glass-cta-card">
                      <p className="text-xs text-tennis-lime font-bold mb-3">{t('mobileMenu.unlockFullAccess')}</p>
                      <button onClick={() => { onClose(); onNavigate('login'); }} className="w-full py-2.5 bg-tennis-lime text-black text-xs font-black uppercase rounded-xl hover:brightness-110 transition-all">
                        {t('mobileMenu.loginNow')}
                      </button>
                    </div>
                  </div>
                )}

                <div className="px-4 pb-6 space-y-5">
                  {menuGroups.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-1.5">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2.5 mb-1.5">
                        {group.title}
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                        {group.items.map((item) => {
                          const isActive = currentPage === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => { onClose(); onNavigate(item.id || 'home'); }}
                              className={`w-full flex items-center justify-between px-3.5 py-3 transition-colors ${
                                isActive 
                                  ? 'bg-tennis-lime text-black font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]' 
                                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <item.icon size={16} className={isActive ? 'text-black' : 'text-gray-500'} />
                                <span className={`text-[13px] ${isActive ? 'font-black' : 'font-medium'}`}>{item.label}</span>
                              </div>
                              {item.badge && (
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  isActive ? 'bg-black/25 text-black' : 'bg-white/[0.05] text-gray-400 border border-white/[0.05]'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: 0, right: window.innerWidth }}
                dragElastic={{ left: 0.05, right: 0.8 }}
                onDragEnd={(_e, info) => {
                  if (info.offset.x > 100) {
                    setShowAccountOverlay(false);
                  }
                }}
                className="absolute inset-0 z-30 flex flex-col liquid-glass-overlay-panel"
                initial={{ x: '100%' }}
                animate={{ x: showAccountOverlay ? '0%' : '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 250 }}
              >
                <div className="px-4 py-4 border-b border-white/[0.06] flex items-center gap-3">
                  <button onClick={() => setShowAccountOverlay(false)} className="liquid-header-btn">
                    <ChevronLeft size={18} className="text-gray-400" />
                  </button>
                  <span className="font-bold text-sm text-white">{t('mobileMenu.myAccount')}</span>
                </div>

                <div className="p-5 flex-1 overflow-y-auto no-scrollbar">
                  <div className="liquid-glass-account-card">
                    <div className="relative z-10 flex justify-between items-start mb-6">
                      <div className="liquid-header-btn">
                        {isPremium ? <Crown size={16} className="text-yellow-400"/> : <User size={16} className="text-gray-300"/>}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-white/[0.06] ${tierColor}`}>
                        {tier}
                      </span>
                    </div>
                    <div className="relative z-10">
                      <div className="font-mono text-[10px] text-white/30 mb-1">ID: {user?.id.substring(0,8)}</div>
                      <div className="font-bold text-white text-base truncate mb-4">{user?.email}</div>
                      <div className="flex justify-between items-end border-t border-white/[0.06] pt-3">
                        <div>
                          <div className="text-[9px] uppercase text-white/40 mb-0.5">{t(isPremium ? 'mobileMenu.status.expires' : 'mobileMenu.status.balance')}</div>
                          <div className={`font-mono font-bold text-sm ${tierColor}`}>
                            {isPremium ? new Date(profile?.premium_until).toLocaleDateString() : `${profile?.credits || 0} ${t('mobileMenu.status.credits')}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-2 text-white">
                      <Gift size={14} className="text-tennis-lime" />
                      <span className="text-xs font-bold uppercase tracking-wider">{t('mobileMenu.redeemCode')}</span>
                    </div>
                    <MenuRedeemWidget onSuccess={fetchProfile} />
                  </div>
                </div>
              </motion.div>

            </div>

            <div className="px-5 py-4 border-t border-white/[0.06] bg-black/[0.15]">
              <div className="flex items-center justify-between gap-4 mb-4">
                <LanguageSelector />
                {user && (
                  <button onClick={handleLogout} className="text-xs font-bold text-red-400/80 hover:text-red-400 flex items-center gap-1.5 px-3 py-2 hover:bg-red-500/10 rounded-xl transition-colors">
                    <LogOut size={14} /> <span>{t('mobileMenu.logout')}</span>
                  </button>
                )}
              </div>
              {!user && (
                <button onClick={() => { onClose(); onNavigate('login'); }} className="w-full py-3 bg-white text-black font-black text-xs uppercase rounded-xl hover:bg-tennis-lime transition-colors mb-4">
                  {t('mobileMenu.loginSignUp')}
                </button>
              )}

              {/* Apple-style Legal & System Info Links */}
              <div className="mt-4 pt-3 border-t border-white/[0.04] flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <button onClick={() => { onClose(); onOpenLegal?.('imprint'); }} className="hover:text-white transition-colors">Imprint</button>
                <span className="text-gray-700 select-none">•</span>
                <button onClick={() => { onClose(); onOpenLegal?.('privacy'); }} className="hover:text-white transition-colors">Privacy</button>
                <span className="text-gray-700 select-none">•</span>
                <button onClick={() => { onClose(); onOpenLegal?.('terms'); }} className="hover:text-white transition-colors">Terms</button>
                <span className="text-gray-700 select-none">•</span>
                <button onClick={() => { onClose(); onOpenLegal?.('cookies'); }} className="hover:text-white transition-colors">Cookies</button>
                <span className="text-gray-700 select-none">•</span>
                <button onClick={() => { onClose(); onOpenLegal?.('ai'); }} className="hover:text-white transition-colors">AI Disclosure</button>
              </div>

              {/* Whitelist regulatory footer indicator inside settings drawer */}
              <div className="mt-3 text-center text-[8px] font-mono text-gray-600 uppercase tracking-tight leading-normal">
                Spielteilnahme ab 18 | Glücksspiel kann süchtig machen | Hilfe: check-dein-spiel.de / BZgA: 0800 1372700
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
    )}
    </AnimatePresence>
  );
}