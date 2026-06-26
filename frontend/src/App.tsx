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


import { AuthModal } from './components/AuthModal';
import { Header } from './components/Header';
import { MobileMenu } from './components/MobileMenu';
import { MobileTabBar } from './components/MobileTabBar';
import { BrandLogo } from './components/BrandLogo';
import { SplashScreen } from './components/SplashScreen';
import { MemberCardModal } from './components/MemberCardModal';
// 🚀 SOTA UPGRADE: Das neue Auth Success Overlay importieren
import { AuthSuccessOverlay } from './components/AuthSuccessOverlay';
import { LegalModal } from './components/LegalModal';

import {
  Lock, Crown, ChevronLeft
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
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const mainTabs = ['/scout', '/scanner', '/picks', '/matchup', '/oracle', '/performance', '/injuries', '/courts', '/watchlist', '/pricing'];
    const isMainTab = mainTabs.includes(location.pathname);

    const getPageTitle = (path: string) => {
        if (path.startsWith('/court/')) return t('sidebar.courtProfile', 'Court Profile');
        if (path === '/courts') return t('sidebar.courtIndex', 'Court Index');
        if (path === '/pricing') return t('mobileMenu.nav.membershipPlans', 'Membership');
        if (path === '/support') return t('mobileMenu.nav.supportIdeas', 'Support');
        if (path === '/watchlist') return t('sidebar.watchlist', 'Watchlist');
        if (path === '/admin') return t('sidebar.admin', 'Admin');
        if (path === '/performance') return t('sidebar.aiPerformance', 'AI Performance');
        if (path === '/injuries') return 'Injury Intel';
        return t('navigation.details', 'Details');
    };

    return (
        <header className="md:hidden fixed top-0 left-0 right-0 z-40 ios-nav-bar pt-[env(safe-area-inset-top,0px)] px-4 flex items-center justify-between">
            {!isMainTab ? (
                <>
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center gap-1 text-tennis-lime font-bold text-sm focus:outline-none h-full active:opacity-70 transition-opacity"
                    >
                        <ChevronLeft size={20} />
                        <span>Back</span>
                    </button>
                    <span className="text-base font-semibold text-white tracking-tight absolute left-1/2 -translate-x-1/2 select-none">
                        {getPageTitle(location.pathname)}
                    </span>
                    <div className="w-12" />
                </>
            ) : (
                <Link to="/scout" className="flex items-center">
                    <BrandLogo className="h-6 text-white" />
                </Link>
            )}
        </header>
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
  const { t, i18n } = useTranslation();

  // Dynamic Metadata & SEO Localization Sync
  useEffect(() => {
    const lang = i18n.language || 'en';
    document.documentElement.lang = lang;
    
    // Set dynamic page title
    document.title = t('metadata.title', 'BackhandTL - Tennis Scouting Platform');
    
    // Set dynamic meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', t('metadata.description', 'Professional tennis scouting platform powered by AI value scanning and detailed player intelligence.'));
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', t('metadata.ogTitle', 'BackhandTL - Tennis Intelligence'));
    }

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute('content', t('metadata.ogDescription', 'AI-driven tennis analysis and value scanning.'));
    }
  }, [i18n.language, t]);

  useEffect(() => {
    const detectLanguageByIP = async () => {
      try {
        const hasBeenDetected = safeLocalStorage.getItem('bh_i18n_ip_detected');
        if (hasBeenDetected) return;

        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('IP API lookup failed');
        const data = await res.json();
        const country = data.country_code?.toUpperCase();

        let targetLang = 'en';
        if (['DE', 'AT', 'CH'].includes(country)) {
          targetLang = 'de';
        } else if (['ES', 'MX', 'AR', 'CL', 'CO', 'PE', 'VE', 'UY', 'EC', 'BO', 'PY', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'DO'].includes(country)) {
          targetLang = 'es';
        } else if (['FR', 'BE', 'LU', 'CA'].includes(country) && country !== 'CA') {
          targetLang = 'fr';
        } else if (country === 'IT') {
          targetLang = 'it';
        }

        if (targetLang !== 'en') {
          i18n.changeLanguage(targetLang);
          safeLocalStorage.setItem('i18nextLng', targetLang);
        }
        safeLocalStorage.setItem('bh_i18n_ip_detected', 'true');
      } catch (err) {
        console.warn('IP-based language detection failed, falling back to browser language:', err);
        // Save flag anyway to prevent repeated API calls on failures
        safeLocalStorage.setItem('bh_i18n_ip_detected', 'true');
      }
    };

    detectLanguageByIP();
  }, [i18n]);

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
  const isPlayerProfile = location.pathname.startsWith('/player/');
  const isAdminPage = location.pathname === '/admin';

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1115] text-white">
      
      {!isLandingPage && (
        <div className="hidden md:block">
            <Header 
                onLoginClick={handleLoginClick} 
                onNavigate={handleNavigate} 
                onMemberClick={() => setShowMemberCard(true)} 
                onOpenLegal={(type) => setLegalModal(type)}
            />
        </div>
      )}

      {!isLandingPage && !isPlayerProfile && !isAdminPage && <MobileHeader />}
      
      <main className={`flex-grow max-w-7xl mx-auto w-full overflow-x-hidden ${isLandingPage ? '' : isPlayerProfile ? 'pt-0 md:pt-[5rem] px-4 md:px-8' : 'pt-[calc(3.5rem+env(safe-area-inset-top,0px))] md:pt-[5rem] px-4 md:px-8'}`}>
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
      
      {!isLandingPage && !isAdminPage && (
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
        onOpenLegal={(type) => setLegalModal(type)}
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