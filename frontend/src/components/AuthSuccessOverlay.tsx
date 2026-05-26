import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2, Fingerprint } from 'lucide-react';

export function AuthSuccessOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState<'scanning' | 'verified'>('scanning');

  useEffect(() => {
    // 🚀 Der Architect-Trigger: Wir prüfen, ob der User aus einer E-Mail/Google kommt
    const hash = window.location.hash;
    const search = window.location.search;

    if (hash.includes('type=signup') || hash.includes('type=recovery') || search.includes('code=')) {
      setIsVisible(true);
      
      // Nach 1.2 Sekunden wechseln wir von "Scanning" auf "Verified"
      const verifyTimer = setTimeout(() => {
        setStep('verified');
      }, 1200);

      // Nach 3.5 Sekunden blenden wir das Overlay aus 
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        // Wir wischen die unschönen Tokens aus der URL, ohne die Seite neu zu laden!
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 3500);

      return () => {
        clearTimeout(verifyTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md font-sans"
        >
          <div className="relative flex flex-col items-center">
            
            {/* Der leuchtende Hintergrund-Glow */}
            <motion.div
              animate={{ 
                scale: step === 'verified' ? [1, 1.5, 0] : 1,
                opacity: step === 'verified' ? [0.5, 0.8, 0] : 0.5 
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`absolute w-32 h-32 rounded-full blur-[50px] ${step === 'verified' ? 'bg-tennis-lime' : 'bg-blue-500'}`}
            />

            {/* Das Icon */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: step === 'verified' ? [0.8, 1.2, 1] : 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className={`relative z-10 p-5 rounded-3xl border ${step === 'verified' ? 'bg-tennis-lime/10 border-tennis-lime/30 text-tennis-lime' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}
            >
              {step === 'scanning' ? (
                <Fingerprint size={48} className="animate-pulse" />
              ) : (
                <ShieldCheck size={48} />
              )}
            </motion.div>

            {/* Der Text */}
            <motion.div 
              className="mt-8 text-center relative z-10"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <motion.h2 
                key={step}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl font-black uppercase tracking-[0.2em] text-white mb-2"
              >
                {step === 'scanning' ? 'Verifying Identity' : 'Access Granted'}
              </motion.h2>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2">
                {step === 'scanning' ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Handshake in progress...
                  </>
                ) : (
                  'Cryptographic session secured.'
                )}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}