import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, ArrowRight, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

export function UpdatePassword() {
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // VETERAN ADDITION: Session Check State
  const [hasSession, setHasSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // 1. CRITICAL: Check if the Recovery Link worked (User must be logged in)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no session, the link is invalid or expired.
        setError("Invalid or expired recovery link. Please request a new one.");
        setCheckingSession(false);
      } else {
        setHasSession(true);
        setCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSession) return; // Security Guard

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => { navigate('/'); }, 2000);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => navigate('/');

  // LOADING STATE (While checking link validity)
  if (checkingSession) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#111]">
            <Loader2 className="animate-spin text-tennis-lime" size={40} />
        </div>
      );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#111] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-tennis-lime/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

      <div className="bg-[#1a1d26] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-8 relative animate-in fade-in zoom-in-95 duration-300">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
          <X size={20} />
        </button>

        <div className="flex justify-center mb-6 h-16 text-white"><BrandLogo className="h-full w-auto" /></div>

        {/* ERROR STATE (Link Invalid) */}
        {!hasSession && error ? (
            <div className="text-center py-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <ShieldAlert size={32} className="text-red-500" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">Access Denied</h2>
                <p className="text-gray-400 text-sm mb-6">{error}</p>
                <button onClick={() => navigate('/')} className="w-full bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-colors">Back to Home</button>
            </div>
        ) : success ? (
          <div className="text-center py-8 animate-in slide-in-from-bottom-2">
            <div className="w-16 h-16 bg-tennis-lime/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-tennis-lime/20 shadow-[0_0_20px_rgba(132,204,22,0.2)]">
               <CheckCircle2 size={32} className="text-tennis-lime" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Password Updated</h2>
            <p className="text-gray-400 text-sm">Your account is secure. Redirecting...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Set New Password</h2>
              <p className="text-gray-400 text-sm">Enter your new secure password below.</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                  <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-12 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-tennis-lime transition-colors" placeholder="••••••••" />
                </div>
              </div>

              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center flex items-center justify-center gap-2"><span>{error}</span></div>}

              <button type="submit" disabled={loading} className="w-full bg-tennis-lime text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-[#9be626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 shadow-lg hover:shadow-tennis-lime/20">
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'UPDATE PASSWORD'}
                {!loading && <ArrowRight size={20} />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}