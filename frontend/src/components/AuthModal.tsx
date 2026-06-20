import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { safeLocalStorage } from '../lib/storage';
import { X, Mail, Lock, User, Loader2, ArrowRight, KeyRound, Globe } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../contexts/AuthContext'; 

interface OnboardingData {
  goal: string;
  experience: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onboardingData?: OnboardingData;
  onOpenLegal?: (type: string) => void;
  onRequestQuiz?: () => void;
}

// 🎨 SOTA Svg für den Google Button (Vektor ist am schärfsten)
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 41.939 C -8.804 39.869 -11.514 38.739 -14.754 38.739 C -19.444 38.739 -23.494 41.439 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
    </g>
  </svg>
);

export function AuthModal({ isOpen, onClose, initialMode = 'login', onboardingData, onOpenLegal, onRequestQuiz }: AuthModalProps) {
  const { signIn } = useAuth(); 
  
  const [isReset, setIsReset] = useState(false);
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // SV SOTA: Silent Geo State
  const [geoData, setGeoData] = useState<{ countryCode: string; countryName: string }>({ countryCode: 'UNKNOWN', countryName: 'Unknown' });

  // VETERAN MOVE: Silent IP-to-Geo Capture when modal opens
  useEffect(() => {
    if (!isOpen || isLogin || isReset) return;
    
    const fetchGeo = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_code) {
          setGeoData({ countryCode: data.country_code, countryName: data.country_name });
        }
      } catch (err) {
        console.warn("Geo-capture blocked by AdBlocker or VPN - Proceeding silently.");
      }
    };
    
    fetchGeo();
  }, [isOpen, isLogin, isReset]);

  if (!isOpen) return null;

  const switchMode = (mode: 'login' | 'register' | 'reset') => {
    setError(null);
    setMessage(null);
    if (mode === 'reset') {
      setIsReset(true);
      setIsLogin(false);
    } else {
      setIsReset(false);
      setIsLogin(mode === 'login');
    }
  };

  const handleSignUpClick = () => {
      if (!onboardingData && onRequestQuiz) {
          onRequestQuiz(); 
      } else {
          switchMode('register');
      }
  };

  // 🚀 SOTA GOOGLE OAUTH WITH STATE TRANSFER
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      // 1. Speichere Onboarding-Daten & Consent im LocalStorage (überlebt den Redirect!)
      const pendingData = {
          goal: onboardingData?.goal || 'General Interest',
          experience: onboardingData?.experience || 'Newcomer',
          method: 'google_sso',
          geo_country_code: geoData.countryCode,
          geo_country_name: geoData.countryName,
          terms_accepted_at: new Date().toISOString()
      };
      safeLocalStorage.setItem('bh_pending_onboarding', JSON.stringify(pendingData));

      // 2. Führe den Google Login aus
      const isLocal = window.location.hostname === 'localhost';
      const baseUrl = isLocal ? window.location.origin : 'https://www.backhandtl.com';
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${baseUrl}/scout`, 
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to initialize Google Login.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !isReset && !agreedToTerms) {
      setError("Please accept the terms and privacy policy to continue.");
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isReset) {
        const isLocal = window.location.hostname === 'localhost';
        const baseUrl = isLocal ? window.location.origin : 'https://www.backhandtl.com';
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${baseUrl}/update-password` });
        if (error) throw error;
        setMessage('Reset link sent!');
      } 
      else if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onClose(); 
      } 
      else {
        if (!firstName.trim()) throw new Error('First name is required');
        
        const finalGoal = onboardingData?.goal || 'General Interest';
        const finalExp = onboardingData?.experience || 'Newcomer';
        
        const finalQuizResults = { 
            ...(onboardingData || { goal: finalGoal, experience: finalExp }), 
            method: 'direct_signup',
            geo_country_code: geoData.countryCode,
            geo_country_name: geoData.countryName
        };

        // 🚀 THE SOTA UPDATE: Wir fangen data ab, um die fehlende Session zu erkennen
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { 
            data: { 
              first_name: firstName,
              onboarding_goal: finalGoal,
              onboarding_experience: finalExp,
              quiz_results: finalQuizResults, 
              terms_accepted_at: new Date().toISOString(),
              privacy_accepted_at: new Date().toISOString()
            },
          }
        });
        
        if (error) throw error;

        // 🚀 APPLE-GRADE UX: Wenn der User registriert ist, aber keine Session hat (wegen E-Mail-Bestätigung)
        if (data.user && !data.session) {
            setMessage('Success! Please check your email to verify your account.');
            setPassword(''); // Sicherheit: Passwort-Feld leeren
            
            // Nach 3.5 Sekunden wechseln wir sauber in den Login-Modus
            setTimeout(() => {
                switchMode('login');
                setMessage(null);
            }, 3500);
        } else {
            // Fallback (falls Confirm-Email jemals deaktiviert wird)
            setMessage('Account successfully created!');
            setTimeout(() => onClose(), 2000);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-[#13151b]/80 backdrop-blur-2xl w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-8 relative overflow-hidden">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
          <X size={20} />
        </button>

        <div className="flex justify-center mb-6 h-16 text-white">
           <BrandLogo className="h-full w-auto" />
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
            {isReset ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Elite Account')}
          </h2>
          <p className="text-zinc-500 text-sm">
            {isReset ? 'Recover your access.' : (isLogin ? 'Login to access intelligence.' : 'Join the elite scouting network.')}
          </p>
        </div>

        {/* 🚀 SOTA GOOGLE BUTTON W/ IMPLICIT CONSENT */}
        {!isReset && (
          <div className="mb-6">
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full bg-white text-black font-bold text-sm py-3.5 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {googleLoading ? <Loader2 className="animate-spin text-black" size={18} /> : <GoogleIcon />}
              Continue with Google
            </button>
            <p className="text-[9px] text-zinc-500 text-center mt-2.5 px-4 leading-relaxed font-medium">
              By continuing with Google, you agree to our <button type="button" onClick={() => onOpenLegal?.('terms')} className="underline text-zinc-400 hover:text-white transition-colors">Terms of Service</button> and <button type="button" onClick={() => onOpenLegal?.('privacy')} className="underline text-zinc-400 hover:text-white transition-colors">Privacy Policy</button>.
            </p>
            
            <div className="flex items-center gap-4 mt-6">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">or email</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !isReset && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">First Name</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-zinc-600 w-5 h-5" />
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-12 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-tennis-lime transition-all" placeholder="Enter name" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-zinc-600 w-5 h-5" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-12 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-tennis-lime transition-all" placeholder="email@example.com" />
            </div>
          </div>

          {!isReset && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-zinc-600 w-5 h-5" />
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-12 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-tennis-lime transition-all" placeholder="••••••••" />
              </div>
            </div>
          )}

          {!isLogin && !isReset && (
            <div className="flex items-start gap-3 px-1 py-2">
              <input 
                type="checkbox" 
                id="legal" 
                checked={agreedToTerms} 
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 accent-tennis-lime cursor-pointer"
              />
              <label htmlFor="legal" className="text-[10px] text-zinc-500 leading-relaxed cursor-pointer select-none">
                I agree to the 
                <button type="button" onClick={() => onOpenLegal?.('terms')} className="text-zinc-300 underline mx-1">Terms of Service</button> 
                and 
                <button type="button" onClick={() => onOpenLegal?.('privacy')} className="text-zinc-300 underline mx-1">Privacy Policy</button>.
              </label>
            </div>
          )}

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] text-center uppercase font-bold">{error}</div>}
          {message && <div className="p-3 bg-tennis-lime/10 border border-tennis-lime/20 rounded-xl text-tennis-lime text-[10px] text-center font-bold uppercase">{message}</div>}

          <button type="submit" disabled={loading || googleLoading} className="w-full bg-tennis-lime text-black font-black uppercase tracking-widest py-4 rounded-xl hover:shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 mt-2">
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isReset ? 'Send Link' : (isLogin ? 'Sign In' : 'Create Account'))}
            {!loading && (isReset ? <KeyRound size={20}/> : <ArrowRight size={20} />)}
          </button>

          {!isLogin && !isReset && geoData.countryCode !== 'UNKNOWN' && (
             <div className="flex items-center justify-center gap-1.5 text-zinc-700 mt-2">
                <Globe size={10} />
                <span className="text-[8px] font-mono uppercase tracking-widest">Routing via {geoData.countryName} node</span>
             </div>
          )}
        </form>

        <div className="mt-6 text-center space-y-3">
            {!isReset && (
                <p className="text-zinc-600 text-xs">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button onClick={handleSignUpClick} className="text-white font-bold hover:text-tennis-lime transition-colors ml-1">
                      {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            )}
            <button onClick={() => switchMode(isReset ? 'login' : 'reset')} className="text-[10px] text-zinc-600 hover:text-white transition-colors underline uppercase font-black tracking-tighter">
                {isReset ? 'Back to Login' : 'Forgot Password?'}
            </button>
        </div>
      </div>
    </div>
  );
}