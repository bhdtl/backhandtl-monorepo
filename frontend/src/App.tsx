import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { safeLocalStorage } from './lib/storage';
import { LandingPage } from './pages/LandingPage';
import { HomePage } from './pages/HomePage'; 
import { AdminCMS } from './pages/AdminCMS';
import { MatchupAnalyzer } from './pages/MatchupAnalyzer';
import { ValueScanner } from './pages/ValueScanner'; 
import { Dashboard } from './pages/Dashboard';
import { CourtDatabase } from './pages/CourtDatabase';
import CourtProfile from './pages/CourtProfile'; 
import { Watchlist } from './pages/Watchlist';
import { PlayerProfile } from './pages/PlayerProfile';
import { PerformancePage } from './pages/PerformancePage'; 
import { UpdatePassword } from './pages/UpdatePassword';

import { PricingPage } from './pages/PricingPage';
import { SupportPage } from './pages/SupportPage';
import { TournamentOracle } from './pages/TournamentOracle';
import { AIPicksPage } from './pages/AIPicksPage';
import { IntelligenceHub } from './pages/IntelligenceHub';

import { AuthModal } from './components/AuthModal';
import { Header } from './components/Header';
import { MobileMenu } from './components/MobileMenu';
import { MobileTabBar } from './components/MobileTabBar';
import { BrandLogo } from './components/BrandLogo';
import { SplashScreen } from './components/SplashScreen';
import { MemberCardModal } from './components/MemberCardModal';
// 🚀 SOTA UPGRADE: Das neue Auth Success Overlay importieren
import { AuthSuccessOverlay } from './components/AuthSuccessOverlay';

import {
  Lock, Crown, X, FileText, Scale, Cpu, Cookie, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// --- SOTA UPGRADE: Access Hook Import ---
import { useAccess } from './hooks/useAccess';

// --- ACCESS GUARDS (Silicon Valley Pattern) ---

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAccess();
  if (loading) return <div className="min-h-screen bg-[#0f1115]" />;
  
  if (isAdmin) return <>{children}</>;
  
  return <AccessDeniedScreen title="Admin Restricted" message="System Level Clearance Required" />;
}

export function ScannerGuard({ children }: { children: React.ReactNode }) {
  const { isElite, loading } = useAccess();
  if (loading) return <div className="min-h-screen bg-[#0f1115]" />;

  if (isElite) return <>{children}</>;

  return (
    <AccessDeniedScreen 
        title="Value Scanner Locked" 
        message="This tool requires Elite membership for mathematical edge analysis." 
        showUpgrade={true}
    />
  );
}

export function AnalyticsGuard({ children }: { children: React.ReactNode }) {
    const { isElite, loading } = useAccess();
    if (loading) return <div className="min-h-screen bg-[#0f1115]" />;

    if (isElite) return <>{children}</>;

    return (
      <AccessDeniedScreen 
          title="Analytics Locked" 
          message="Upgrade to ELITE to access global court data and performance metrics." 
          showUpgrade={true}
      />
    );
  }

function AccessDeniedScreen({ title, message, showUpgrade }: { title: string, message: string, showUpgrade?: boolean }) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-[80vh] items-center justify-center text-white space-y-6 bg-[#0f1115] px-4 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <Lock size={40} className="text-red-500" />
            </div>
            <div className="space-y-3">
                <div className="text-3xl font-black uppercase tracking-widest">{title}</div>
                <p className="text-gray-500 text-sm font-mono max-w-md mx-auto leading-relaxed">{message}</p>
            </div>
            {showUpgrade && (
                <button onClick={() => navigate('/pricing')} className="px-8 py-4 bg-tennis-lime text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform flex items-center gap-3 shadow-xl shadow-tennis-lime/10">
                    <Crown size={18} /> Upgrade Plan
                </button>
            )}
        </div>
    );
}

export function LegalModal({ type, onClose }: { type: string; onClose: () => void }) {
  const contentMap: Record<string, { title: string; icon: any; body: JSX.Element }> = {
    privacy: {
      title: "Privacy Policy",
      icon: FileText,
      body: (
        <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">1. Data Controller & Scope</p>
            <p>BACKHAND.DTL Analytics (Oldenburg, Germany) acts as the primary data controller under Art. 4 No. 7 GDPR. We implement "Privacy by Design" to ensure that your analytical footprints are minimized and anonymized. Our processing is strictly governed by the General Data Protection Regulation (GDPR).</p>
          </section>
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">2. Processing Infrastructure & Payment</p>
            <p>Authentication and high-performance data storage are handled via Supabase (AWS Node Frankfurt), utilizing AES-256 encryption at rest. All subscription and transactional processing is managed by our authorized third-party Merchant of Record (MoR), <strong>Lemon Squeezy</strong>. We do not store, process, or transmit credit card information on our servers. Financial data is strictly subject to Lemon Squeezy's privacy policy.</p>
          </section>
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">3. Exclusive Data Source (Odds Aggregation)</p>
            <p>Our platform aggregates real-time market data and odds via API exclusively from certified B2B sports data providers. We explicitly state that <strong>no user data, IP addresses, or personally identifiable information (PII) is ever shared with, transmitted to, or accessible by our data partners.</strong> The data flow is strictly unidirectional (inbound to our servers).</p>
          </section>
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">4. Advanced Analytics & PostHog</p>
            <p>We utilize PostHog for behavior-based event tracking. This data is strictly used to refine our neural models and BSI accuracy. No personally identifiable betting history or financial strategies are ever harvested, indexed, or shared with third-party advertising networks.</p>
          </section>
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">5. User Rights & DSA Compliance</p>
            <p>You maintain absolute rights to data portability, rectification, and erasure. Requests are processed within 72 hours via bh.dtl@web.de. We act in accordance with the EU Digital Services Act regarding content moderation and the use of athlete imagery for identifying analytical reports.</p>
          </section>
        </div>
      )
    },
    terms: {
      title: "Terms of Service",
      icon: Scale,
      body: (
        <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">1. Definitive Non-Financial Advisory</p>
            <p>The information, metrics, and "Alpha" signals provided by BACKHAND.DTL are for educational and analytical purposes only. Statistical probabilities and AI-generated models are NOT guarantees of future performance. Usage of this data is at your own exclusive financial risk. We do not provide financial, legal, or betting advice. Market odds provided by our external data partners are presented "as is" without warranty of accuracy.</p>
          </section>
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">2. Subscriptions, Refunds & Cancellations</p>
            <p>Order processing, tax calculation, and subscription management are conducted by our Merchant of Record, <strong>Lemon Squeezy</strong>. By purchasing a subscription, you enter into a commercial agreement subject to their Terms of Sale. Due to the digital nature of the platform and the immediate delivery of proprietary data, <strong>all sales are final and we do not offer refunds.</strong> You may cancel your subscription at any time; your access will remain active until the end of your currently paid billing period.</p>
          </section>
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">3. IP Protection & Anti-Scraping Shield</p>
            <p>Our BSI metrics, tactical player profiles, and "Neural Raw Intel" are protected intellectual property. Use of automated bots, scripts, or spiders to extract data from our platform is a breach of contract and will result in immediate termination of the service without refund and legal action for damages.</p>
          </section>
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">4. Notice-and-Takedown Process</p>
            <p>We use imagery of professional athletes solely for the purpose of identifying statistical reports (§ 23 KunstUrhG). If you are a rights holder and identify a violation, we guarantee a removal within 24 hours of notification via our official support channel to bh.dtl@web.de.</p>
          </section>
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">5. Limitation of Liability & Jurisdiction</p>
            <p>To the maximum extent permitted by law, BACKHAND.DTL’s total liability is limited to the amount paid by the user in the 12 months preceding the claim. These terms are governed by the laws of Germany. The exclusive place of jurisdiction for all commercial disputes arising from this contract is Oldenburg, Germany.</p>
          </section>
        </div>
      )
    },

    ai: {
      title: "AI Disclosure",
      icon: Cpu,
      body: (
        <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Neural Engine Methodology</p>
            <p>Our "Alpha Engine" utilizes high-tier Deep Learning architectures (CNN & Transformers) to process over 140,000 data points per match. This includes visual surface analysis and tactical player profiling. This system does not make automated decisions that have legal effects on users, acting strictly in compliance with the EU AI Act.</p>
          </section>
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Predictive Limitation & Latency</p>
            <p>While our models aim for high-confidence variances, AI results are statistical estimates. The "BSI" ball physics data is captured through real-time feeds and is subject to local court conditions, environmental variables, and technical latency.</p>
          </section>
        </div>
      )
    },
    cookies: {
      title: "Cookie Settings",
      icon: Cookie,
      body: (
        <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Strictly Necessary (Supabase)</p>
            <p>These cookies are critical for session persistence and identity validation. They are encrypted and expire upon logout. Required for the technical operation of the SaaS (TDDDG compliant).</p>
          </section>
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Analytical Logic (PostHog)</p>
            <p>Used to measure conversion paths and dashboard interaction. These cookies do not store personally identifiable betting data or financial strategies and can be opted out via the cookie banner.</p>
          </section>
        </div>
      )
    },
    imprint: {
      title: "Imprint / Legal",
      icon: Info,
      body: (
        <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Provider Identification (§ 5 DDG)</p>
            <p>Phi-Nam Pham<br />Plaggenhau 41<br />26135 Oldenburg<br />Germany</p>
          </section>
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Contact & SAR</p>
            <p>Email: bh.dtl@web.de<br />Web: backhandtl.com<br />Notice-and-Takedown Office: Oldenburg</p>
          </section>
          <section>
            <p className="text-white font-black uppercase text-xs mb-2 tracking-widest underline decoration-tennis-lime decoration-2">Tax Information & Payment</p>
            <p>Steuernummer (Tax ID): 64/133/09478<br /><em>Payments processed externally via Merchant of Record (Lemon Squeezy).</em></p>
          </section>
        </div>
      )
    }
  };

  const content = contentMap[type] || contentMap.privacy;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose}></div>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-[#15171e] border border-white/10 w-full max-w-xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tennis-lime/10 rounded-lg text-tennis-lime"><content.icon size={20} /></div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">{content.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={18} className="text-gray-500 hover:text-white" /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">{content.body}</div>
        <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-tennis-lime transition-all">Close</button>
        </div>
      </motion.div>
    </div>
  );
}

function UserProtectedRoute({ children, onLoginRequired }: { children: React.ReactNode, onLoginRequired: () => void }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      onLoginRequired();
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate, onLoginRequired]);

  if (loading || !user) return null;
  return <>{children}</>;
}

function MobileHeader() {
    return (
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <div className="liquid-glass-mobile-header">
                <Link to="/scout" className="relative z-10">
                    <BrandLogo className="h-7 text-white" />
                </Link>
            </div>
        </div>
    );
}

function GlobalFooter({ onOpenLegal }: { onOpenLegal: (type: string) => void }) {
    const { t } = useTranslation();
    return (
        <footer className="w-full border-t border-white/5 bg-[#0a0b0e] py-8 mt-auto relative z-20 pb-32 md:pb-8">
            <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col items-center gap-6">
                <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                    <div className="text-[10px] font-mono text-gray-600 space-y-1">
                        <div>© {new Date().getFullYear()} BACKHAND.DTL Analytics. All rights reserved.</div>
                        <div className="text-[9px] text-gray-500/70 max-w-md">Historical player data and matchup statistics are powered by datasets from Jeff Sackmann (licensed under CC BY-NC-SA 4.0, strictly non-commercial use only).</div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        <button onClick={() => onOpenLegal('terms')} className="hover:text-tennis-lime transition-colors">Terms</button>
                        <button onClick={() => onOpenLegal('privacy')} className="hover:text-tennis-lime transition-colors">Privacy</button>
                        <button onClick={() => onOpenLegal('cookies')} className="hover:text-tennis-lime transition-colors">Cookies</button>
                        <button onClick={() => onOpenLegal('imprint')} className="hover:text-tennis-lime transition-colors">Imprint</button>
                        <button onClick={() => onOpenLegal('ai')} className="hover:text-tennis-lime transition-colors">AI Disclosure</button>
                    </div>
                </div>
                
                {/* Germany Regulatory Whitelist Footer */}
                <div className="w-full pt-4 border-t border-white/5 text-center">
                    <p className="text-[9px] uppercase tracking-[0.15em] font-black text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        {t('picks.footerDisclaimer', 'Offiziell lizenziert (Whitelist) | Spielteilnahme ab 18 Jahren | Glücksspiel kann süchtig machen | Hilfe unter check-dein-spiel.de / buwei.de | BZgA: 0800 1 37 27 00')}
                    </p>
                </div>
            </div>
        </footer>
    );
}

function AppContent() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMemberCard, setShowMemberCard] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [onboardingData, setOnboardingData] = useState<any>(null);
  
  const [legalModal, setLegalModal] = useState<string | null>(null);
  const [showGlobalQuiz, setShowGlobalQuiz] = useState(false);
    
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleSessionSync = async (session: any) => {
        if (!session?.user) return;
        
        // 1. Safe Credit Reset
        const safeCreditReset = async () => {
            try {
                await supabase.rpc('check_and_reset_credits');
            } catch (e) {
                console.warn('Credit reset RPC failed (non-critical)');
            }
        };
        safeCreditReset();

        // 2. Sync Pending Onboarding
        const pendingDataStr = safeLocalStorage.getItem('bh_pending_onboarding');
        if (pendingDataStr) {
            try {
                const pendingData = JSON.parse(pendingDataStr);
                
                await supabase.from('profiles').update({
                    onboarding_goal: pendingData.goal,
                    onboarding_experience: pendingData.experience,
                    quiz_results: pendingData,
                    terms_accepted_at: pendingData.terms_accepted_at,
                    privacy_accepted_at: pendingData.terms_accepted_at
                }).eq('id', session.user.id);
                
                safeLocalStorage.removeItem('bh_pending_onboarding');
            } catch (e) {
                console.error("Failed to sync pending onboarding data", e);
            }
        }
    };

    supabase.auth.getSession()
      .then(({ data: { session } }) => { 
          handleSessionSync(session);
      })
      .catch((err) => {
          console.warn("App session sync warning:", err);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { 
        if (_event === 'SIGNED_IN' && session) {
             handleSessionSync(session);
        }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleLoginClick = () => { 
    setAuthView('login'); 
    setShowAuthModal(true); 
  };

  const handleAuthTrigger = (mode: 'login' | 'register', data?: any) => {
    setAuthView(mode);
    if (data) setOnboardingData(data); 
    setShowAuthModal(true);
  };

  const handleBottomRightAction = () => { 
    if (user) {
        setIsMenuOpen(true);
    } else {
        handleLoginClick(); 
    }
  };

  const handleNavigate = (page: string) => { 
    setIsMenuOpen(false); 
    if (page === 'home') navigate('/scout'); 
    else if (page === 'login') handleLoginClick();
    else navigate(`/${page}`); 
  };

  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1115] text-white">
      
      {!isLandingPage && (
        <div className="hidden md:block">
            <Header 
                onLoginClick={handleLoginClick} 
                onNavigate={handleNavigate} 
                onMemberClick={() => setShowMemberCard(true)} 
            />
        </div>
      )}

      {!isLandingPage && <MobileHeader />}
      
      <main className={`flex-grow max-w-7xl mx-auto w-full overflow-x-hidden ${isLandingPage ? '' : 'pt-[4.5rem] md:pt-[5rem] px-4 md:px-8'}`}>
        <Routes>
          <Route path="/" element={
             user ? <Navigate to="/scout" replace /> : (
                <LandingPage 
                    onTriggerAuth={handleAuthTrigger} 
                    forcedShowQuiz={showGlobalQuiz}
                    onQuizClosed={() => setShowGlobalQuiz(false)}
                    onOpenLegal={(type) => setLegalModal(type)}
                /> 
             )
          } />
          <Route path="/scout" element={<HomePage onPlayerClick={(id) => navigate(`/player/${id}`)} />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/admin" element={<AdminGuard><AdminCMS /></AdminGuard>} />
          <Route path="/matchup" element={<MatchupAnalyzer />} />
          <Route path="/scanner" element={<ValueScanner />} />
          <Route path="/picks" element={<AIPicksPage />} />
          <Route path="/oracle" element={<TournamentOracle />} />
          <Route path="/intelligence" element={<IntelligenceHub />} />

          <Route path="/courts" element={<CourtDatabase />} />
          <Route path="/court/:id" element={<CourtProfile />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/watchlist" element={<Watchlist onPlayerClick={(id) => navigate(`/player/${id}`)} />} />
          <Route 
            path="/player/:id" 
            element={
              <UserProtectedRoute onLoginRequired={handleLoginClick}>
                <PlayerProfile />
              </UserProtectedRoute>
            } 
          />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <GlobalFooter onOpenLegal={(type) => setLegalModal(type)} />
      
      {!isLandingPage && (
        <MobileTabBar
            onMenuAction={handleBottomRightAction}
            isLoggedIn={!!user}
        />
      )}
      
      <MobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        currentPage={window.location.pathname.substring(1)} 
        onNavigate={handleNavigate} 
        onOpenMemberCard={() => setShowMemberCard(true)}
      />
      
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
          initialMode={authView} 
          onboardingData={onboardingData} 
          onOpenLegal={(type) => setLegalModal(type)}
          onRequestQuiz={() => {
              setShowAuthModal(false);
              setShowGlobalQuiz(true); 
          }}
        />
      )}

      <AnimatePresence>
        {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
      </AnimatePresence>

      <MemberCardModal isOpen={showMemberCard} onClose={() => setShowMemberCard(false)} />
      
      {/* 🚀 SOTA UPGRADE: Das magische Overlay für die E-Mail-Bestätigung */}
      <AuthSuccessOverlay />

    </div>
  );
}

// MAIN APP COMPONENT
function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <AppWrapper showSplash={showSplash} setShowSplash={setShowSplash} />
    </AuthProvider>
  );
}

function AppWrapper({ showSplash, setShowSplash }: { showSplash: boolean, setShowSplash: (v: boolean) => void }) {
  const { loading } = useAuth(); 

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen 
            onFinish={() => setShowSplash(false)} 
            isReady={!loading} 
          />
        )}
      </AnimatePresence>

      <div className={showSplash ? 'fixed inset-0 opacity-0 pointer-events-none' : 'contents'}>
        <Router>
          <AppContent />
        </Router>
      </div>
    </>
  );
}

export default App;