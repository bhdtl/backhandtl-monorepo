import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, RefreshCw, Clock, Wallet, 
  ChevronRight, Zap, Shield, Target, Activity, Globe,
  DollarSign, Copy, CheckCircle2, Users, ArrowRight, ShieldCheck, Tag, Gift, Loader2 // 🚀 SOTA FIX: Loader2 hinzugefügt!
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { ScrollToTop } from '../components/ScrollToTop';

// --- INTERFACES ---
interface Partner {
  id: string;
  ls_discount_code: string;
  commission_rate: number;
  paypal_email: string; // Behalten wir für Backwards-Compatibility
  payout_method?: string; // 🚀 NEU: Payout Type ('paypal' oder 'iban')
  payout_details?: string; // 🚀 NEU: IBAN oder Email
  total_earned: number;
  total_paid: number;
  status: 'pending' | 'active' | 'rejected'; 
  audience_url: string;
}

interface Referral {
  id: string;
  ls_order_id: string;
  customer_email: string;
  sale_amount: number;
  commission_amount: number;
  status: string;
  created_at: string;
}

export function PartnerProgram() {
  const { user } = useAuth();
  
  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  
  // Onboarding UI State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  
  // 🚀 SOTA FIX: Payout States für das Dropdown
  const [payoutMethod, setPayoutMethod] = useState<'paypal' | 'iban'>('paypal');
  const [payoutDetails, setPayoutDetails] = useState(''); 
  
  const [audienceUrl, setAudienceUrl] = useState(''); 
  const [onboardingError, setOnboardingError] = useState('');
  
  // Dashboard UI State
  const [copied, setCopied] = useState(false);

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchPartnerData();
  }, [user]);

  const fetchPartnerData = async () => {
    if (!user) {
        setLoading(false);
        return;
    }
    
    setLoading(true); // Sicherstellen, dass der Loader greift
    try {
      const { data: partnerData, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // 🚀 SOTA FIX: maybeSingle() verhindert den PGRST116 Error, wenn kein Partner existiert

      // Wenn kein Partner gefunden wurde, ist error definiert, aber data null.
      // Wir ignorieren den Fehler absichtlich, weil das der Normalzustand für neue User ist.
      if (partnerData) {
        setPartner(partnerData);
        
        if (partnerData.status === 'active') {
            const { data: refData } = await supabase
              .from('referrals')
              .select('*')
              .eq('partner_id', user.id)
              .order('created_at', { ascending: false });
              
            if (refData) setReferrals(refData);
        }
      }
    } catch (err) {
      console.error("Partner Check Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---
  const handleApplyPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode || !payoutDetails || !audienceUrl) {
        setOnboardingError('Please fill out all fields.');
        return;
    }
    
    setIsCreating(true);
    setOnboardingError('');

    try {
      const cleanCode = promoCode.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
      
      const { data, error } = await supabase
        .from('partners')
        .insert({
          id: user?.id,
          ls_discount_code: cleanCode,
          paypal_email: payoutDetails.trim(), // Fallback für alte DB Struktur
          payout_method: payoutMethod,        // Neues DB Feld
          payout_details: payoutDetails.trim(), // Neues DB Feld
          audience_url: audienceUrl.trim(), 
          commission_rate: 0.30,
          status: 'pending' 
        })
        .select()
        .single();

      if (error) {
          if (error.code === '23505') throw new Error('This Promo Code is already requested. Choose another one.');
          throw error;
      }

      if (data) setPartner(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
          setOnboardingError(err.message);
      } else {
          setOnboardingError('Failed to submit application.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = () => {
    if (partner?.ls_discount_code) {
      navigator.clipboard.writeText(partner.ls_discount_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const maskEmail = (email: string) => {
      if (!email || email === 'hidden') return 'Anonymous User';
      const [name, domain] = email.split('@');
      if (!domain) return email;
      return `${name.slice(0, 3)}***@${domain.slice(0, 1)}***.${domain.split('.')[1] || 'com'}`;
  };

  if (loading) return <LoadingScreen message="Loading Partner Engine..." />;

  // =========================================================================
  // VIEW 1: THE GATEKEEPER (PENDING / REJECTED)
  // =========================================================================
  if (partner && partner.status !== 'active') {
      return (
        <div className="min-h-screen bg-[#0f1115] w-full flex flex-col items-center justify-center relative px-4 pb-32">
          <ScrollToTop />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vh] bg-tennis-lime/5 blur-[150px] rounded-full -z-10 pointer-events-none" />
          
          <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#1a1d26] border border-white/5 rounded-[2.5rem] p-10 md:p-14 max-w-lg w-full text-center shadow-2xl relative overflow-hidden"
          >
              <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                  {partner.status === 'pending' ? (
                      <Clock size={32} className="text-tennis-lime animate-pulse" />
                  ) : (
                      <Shield size={32} className="text-red-400" />
                  )}
              </div>
              
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
                  {partner.status === 'pending' ? 'Application Received' : 'Application Declined'}
              </h1>
              
              <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">
                  {partner.status === 'pending' 
                    ? `We are currently reviewing your profile (${partner.audience_url || 'provided link'}). This usually takes less than 24 hours. Your desired code "${partner.ls_discount_code}" is reserved.`
                    : "Unfortunately, your profile does not meet our current partner criteria. We thank you for your interest."
                  }
              </p>

              {partner.status === 'pending' && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-tennis-lime/10 border border-tennis-lime/20 text-tennis-lime text-[10px] font-black uppercase tracking-widest rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-tennis-lime animate-ping" />
                      Status: Under Review
                  </div>
              )}
          </motion.div>
        </div>
      );
  }

  // =========================================================================
  // VIEW 2: THE DASHBOARD (Wenn der User ACTIVE Partner ist)
  // =========================================================================
  if (partner && partner.status === 'active') {
      // 🛡️ SOTA FIX: Defensive Math. Verhindert NaN/Null Crashes
      const totalEarned = Number(partner.total_earned) || 0;
      const totalPaid = Number(partner.total_paid) || 0;
      const commRate = Number(partner.commission_rate) || 0;
      const pendingPayout = totalEarned - totalPaid;

      return (
        <div className="min-h-screen bg-[#0f1115] w-full overflow-x-hidden relative selection:bg-tennis-lime/30 selection:text-tennis-lime pb-32 font-sans tracking-tight">
          <ScrollToTop />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-tennis-lime/5 blur-[200px] rounded-full -z-10 pointer-events-none" />
    
          <div className="pt-24 px-4 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <Activity size={12} className="text-tennis-lime animate-pulse" /> Partner Engine Active
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter drop-shadow-xl">
                        Performance <span className="text-transparent bg-clip-text bg-gradient-to-r from-tennis-lime to-emerald-500">Overview</span>
                    </h1>
                </div>
    
                <div 
                    onClick={copyToClipboard}
                    className="group relative bg-[#1a1d26] border border-white/10 hover:border-tennis-lime/50 rounded-2xl p-4 flex items-center justify-between gap-6 cursor-pointer transition-all hover:shadow-[0_0_30px_rgba(132,204,22,0.15)]"
                >
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Your Checkout Code</p>
                        <p className="text-xl md:text-2xl font-mono font-black text-white tracking-wider">{partner.ls_discount_code || 'ERROR'}</p>
                    </div>
                    <div className={`p-3 rounded-xl transition-colors ${copied ? 'bg-tennis-lime text-black' : 'bg-white/5 text-gray-400 group-hover:text-white'}`}>
                        {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                    </div>
                </div>
            </div>
    
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1a1d26] p-6 md:p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-tennis-lime/10 rounded-full blur-2xl" />
                    <DollarSign size={24} className="text-tennis-lime mb-4" />
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Total Earned</p>
                    <p className="text-4xl font-black text-white">€{totalEarned.toFixed(2)}</p>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#1a1d26] p-6 md:p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
                    <Wallet size={24} className="text-emerald-400 mb-4" />
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Pending Payout</p>
                    <p className="text-4xl font-black text-white">€{pendingPayout.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-600 mt-2 font-medium">Payouts are processed on the 15th of each month (Min. €25.00).</p>
                </motion.div>
    
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#1a1d26] p-6 md:p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
                    <Users size={24} className="text-blue-400 mb-4" />
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Total Referrals</p>
                    <p className="text-4xl font-black text-white">{referrals.length}</p>
                    <p className="text-[10px] text-gray-600 mt-2 font-medium">Users who applied your code.</p>
                </motion.div>
            </div>
    
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp size={20} className="text-tennis-lime" />
                        Sales Ledger
                    </h3>
                    <span className="text-xs text-gray-500 font-medium bg-[#1a1d26] px-3 py-1 rounded-full border border-white/5">
                        {commRate * 100}% Commission Rate
                    </span>
                </div>
    
                <div className="bg-[#1a1d26] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                    {referrals.length === 0 ? (
                        <div className="p-16 text-center">
                            <Users size={40} className="text-gray-600 mx-auto mb-4" />
                            <h4 className="text-white font-bold mb-2">No referrals yet</h4>
                            <p className="text-gray-500 text-sm">Share your code <span className="font-mono text-tennis-lime">{partner.ls_discount_code}</span> with your audience to start earning.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#12141a]/80 border-b border-white/5 text-gray-500 uppercase text-[10px] font-black tracking-[0.2em]">
                                        <th className="px-6 py-5">Date</th>
                                        <th className="px-6 py-5">Customer</th>
                                        <th className="px-6 py-5 text-right">Sale Amount</th>
                                        <th className="px-6 py-5 text-right text-tennis-lime">Your Cut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {referrals.map((ref) => {
                                        // 🛡️ SOTA FIX: Safe Number Parsing
                                        const sAmt = Number(ref.sale_amount) || 0;
                                        const cAmt = Number(ref.commission_amount) || 0;
                                        
                                        return (
                                          <tr key={ref.id} className="hover:bg-white/[0.02] transition-colors">
                                              <td className="px-6 py-5 text-xs font-medium text-gray-400">
                                                  {new Date(ref.created_at || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                              </td>
                                              <td className="px-6 py-5 text-sm font-medium text-gray-300">
                                                  {maskEmail(ref.customer_email)}
                                              </td>
                                              <td className="px-6 py-5 text-sm font-mono text-gray-500 text-right">
                                                  €{sAmt.toFixed(2)}
                                              </td>
                                              <td className="px-6 py-5 text-sm font-black font-mono text-white text-right">
                                                  +€{cAmt.toFixed(2)}
                                              </td>
                                          </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      );
  }

  // =========================================================================
  // VIEW 3: MARKETING & ONBOARDING (Wenn der User NOCH KEIN Partner ist)
  // =========================================================================
  return (
    <div className="pb-32 w-full max-w-6xl mx-auto px-4 md:px-6 relative">
      <ScrollToTop />
      
      {/* 1. HERO SECTION */}
      <div className="mt-12 md:mt-24 mb-20 text-center flex flex-col items-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md h-96 bg-tennis-lime/10 blur-[120px] pointer-events-none rounded-full"></div>

        <div className="flex items-center gap-3 text-tennis-lime font-black text-[10px] md:text-xs uppercase tracking-[0.4em] mb-6 px-5 py-2 rounded-full border border-tennis-lime/20 bg-[#15171e] shadow-lg relative z-10">
          <Zap size={14} className="text-tennis-lime animate-pulse" />
          BH.DTL Partner Network
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-6 relative z-10">
          Monetize your <br/> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-tennis-lime via-emerald-400 to-teal-500">
            Influence
          </span>
        </h1>
        
        <p className="text-gray-400 font-medium text-sm md:text-lg max-w-2xl leading-relaxed mb-10 relative z-10">
          Monetize your audience with precision. Generate your custom Promo Code, give your followers a direct discount, and earn <strong className="text-white">30% recurring commission</strong> on every sale.
        </p>

        <div className="flex flex-col items-center gap-4 relative z-10">
          {user ? (
              <button 
                onClick={() => {
                  setShowOnboarding(true);
                  setTimeout(() => {
                    document.getElementById('onboarding-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                className="group relative flex items-center justify-center gap-3 w-full sm:w-auto bg-white text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                Apply for Partnership <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
          ) : (
              <div className="text-center">
                  <p className="text-tennis-lime font-bold uppercase tracking-widest text-xs mb-3">Sign in to apply</p>
                  <button className="bg-white/10 text-white px-8 py-3 rounded-xl font-bold text-sm border border-white/20 opacity-50 cursor-not-allowed">
                      Apply for Partnership
                  </button>
              </div>
          )}
          
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            Exclusive Network. Limited Slots.
          </p>
        </div>
      </div>

      {/* 2. SOTA CORE ARGUMENTS */}
      <div className="mb-24">
        <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter mb-8 text-center">
          The New Standard
        </h2>
        
        <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pb-4 -mx-4 px-4 md:mx-0 md:px-0">
          
          <div className="min-w-[280px] md:min-w-0 snap-center bg-[#15171e] border border-white/5 rounded-[2rem] p-6 md:p-8 hover:border-tennis-lime/30 transition-all duration-300 group hover:shadow-[0_10px_30px_rgba(132,204,22,0.05)] md:hover:-translate-y-1">
            <div className="h-12 w-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-6 group-hover:bg-tennis-lime/10 group-hover:border-tennis-lime/20 transition-colors">
              <RefreshCw size={20} className="text-gray-400 group-hover:text-tennis-lime transition-colors" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2">30% Recurring</h3>
            <p className="text-gray-500 text-xs font-medium leading-relaxed">
              We don't do flat rates. Earn 30% on every subscription and renewal. As long as your referral remains an active subscriber, you continue to earn every single month.
            </p>
          </div>

          <div className="min-w-[280px] md:min-w-0 snap-center bg-[#15171e] border border-white/5 rounded-[2rem] p-6 md:p-8 hover:border-blue-500/30 transition-all duration-300 group hover:shadow-[0_10px_30px_rgba(59,130,246,0.05)] md:hover:-translate-y-1">
            <div className="h-12 w-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-6 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-colors">
              <Shield size={20} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2">Zero Cookie Loss</h3>
            <p className="text-gray-500 text-xs font-medium leading-relaxed">
              Tracking links break on mobile browsers. Custom Promo Codes bypass ad-blockers and cross-device drops. You get 100% attribution, always.
            </p>
          </div>

          <div className="min-w-[280px] md:min-w-0 snap-center bg-[#15171e] border border-white/5 rounded-[2rem] p-6 md:p-8 hover:border-emerald-500/30 transition-all duration-300 group hover:shadow-[0_10px_30px_rgba(16,185,129,0.05)] md:hover:-translate-y-1">
            <div className="h-12 w-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-6 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-colors">
              <Gift size={20} className="text-gray-400 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2">Audience Value</h3>
            <p className="text-gray-500 text-xs font-medium leading-relaxed">
              Don't just sell, gift. Your personal code grants your followers a direct discount at checkout, skyrocketing your conversion rates compared to traditional links.
            </p>
          </div>

          <div className="min-w-[280px] md:min-w-0 snap-center bg-[#15171e] border border-white/5 rounded-[2rem] p-6 md:p-8 hover:border-purple-500/30 transition-all duration-300 group hover:shadow-[0_10px_30px_rgba(168,85,247,0.05)] md:hover:-translate-y-1">
            <div className="h-12 w-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-6 group-hover:bg-purple-500/10 group-hover:border-purple-500/20 transition-colors">
              <Wallet size={20} className="text-gray-400 group-hover:text-purple-400 transition-colors" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2">€25 Min Payout</h3>
            <p className="text-gray-500 text-xs font-medium leading-relaxed">
              Fast liquidity with zero paperwork. We handle the automated Self-Billing (§14 UStG) and send your earnings straight to your Bank or PayPal account on the 15th of every month.
            </p>
          </div>

        </div>
      </div>

      {/* 3. ONBOARDING TERMINAL (THE APPLICATION FORM) */}
      <AnimatePresence>
          {showOnboarding && (
              <motion.div 
                  id="onboarding-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-24 flex justify-center"
              >
                  <div className="bg-[#1a1d26] border border-white/10 rounded-[2.5rem] p-8 md:p-12 max-w-xl w-full shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-tennis-lime to-emerald-500" />
                      
                      <div className="flex items-center gap-4 mb-8">
                          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                              <ShieldCheck size={20} className="text-white" />
                          </div>
                          <div>
                              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Submit Application</h2>
                              <p className="text-gray-500 text-xs font-medium">Tell us about your audience to get approved.</p>
                          </div>
                      </div>

                      <form onSubmit={handleApplyPartner} className="space-y-5">
                          <div>
                              <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-2 block">Link to your Channel (Insta/X/Youtube)</label>
                              <input 
                                  type="url"
                                  required
                                  value={audienceUrl}
                                  onChange={(e) => setAudienceUrl(e.target.value)}
                                  placeholder="https://instagram.com/yourpage"
                                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-4 text-white focus:border-tennis-lime outline-none transition-all placeholder:text-gray-700"
                              />
                          </div>
                          
                          <div>
                              <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-2 block">Your Desired Promo Code</label>
                              <div className="relative">
                                  <input 
                                      type="text"
                                      required
                                      value={promoCode}
                                      onChange={(e) => setPromoCode(e.target.value)}
                                      placeholder="e.g. TENNISPRO"
                                      maxLength={15}
                                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-4 text-white font-mono uppercase focus:border-tennis-lime outline-none transition-all placeholder:text-gray-700"
                                  />
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-tennis-lime bg-tennis-lime/10 px-2 py-1 rounded">10% OFF</div>
                              </div>
                          </div>

                          {/* 🚀 SOTA FIX: Dropdown für PayPal & IBAN */}
                          <div className="flex flex-col sm:flex-row gap-4">
                              <div className="w-full sm:w-1/3">
                                  <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-2 block">Payout Method</label>
                                  <div className="relative">
                                      <select 
                                          value={payoutMethod}
                                          onChange={(e) => {
                                              setPayoutMethod(e.target.value as 'paypal' | 'iban');
                                              setPayoutDetails(''); // Reset Input bei Methoden-Wechsel
                                          }}
                                          className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-4 text-white focus:border-tennis-lime outline-none transition-all appearance-none cursor-pointer"
                                      >
                                          <option value="paypal">PayPal</option>
                                          <option value="iban">Bank (IBAN)</option>
                                      </select>
                                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="m6 9 6 6 6-6"/></svg>
                                      </div>
                                  </div>
                              </div>

                              <div className="w-full sm:w-2/3">
                                  <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-2 block">
                                      {payoutMethod === 'paypal' ? 'PayPal Email' : 'Your IBAN'}
                                  </label>
                                  <input 
                                      type={payoutMethod === 'paypal' ? 'email' : 'text'}
                                      required
                                      value={payoutDetails}
                                      onChange={(e) => setPayoutDetails(e.target.value)}
                                      placeholder={payoutMethod === 'paypal' ? 'creator@email.com' : 'DE89 1234 5678 ...'}
                                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-4 text-white focus:border-tennis-lime outline-none transition-all placeholder:text-gray-700 font-mono"
                                  />
                              </div>
                          </div>

                          {onboardingError && (
                              <div className="text-red-400 text-xs font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                                  {onboardingError}
                              </div>
                          )}

                          <button 
                              type="submit"
                              disabled={isCreating}
                              className="w-full mt-2 py-4 bg-tennis-lime text-black rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
                          >
                              {isCreating ? <Loader2 size={16} className="animate-spin" /> : 'Submit for Review'}
                          </button>
                      </form>
                      <p className="text-[9px] text-gray-600 text-center mt-6 uppercase tracking-widest leading-relaxed">
                          By applying, you agree to our Affiliate Terms. <br/> Access is granted strictly based on audience quality and fit.
                      </p>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

export default PartnerProgram;