import { MemberCard } from './MemberCard';
import { motion } from 'framer-motion';

export function CardGallery() {
  // Dummy Daten für die Preview
  const mockUser = { email: 'agent@neural-scout.com' };
  
  // Wir simulieren Profile für die verschiedenen Karten
  const profiles = {
    FREE: { credits: 0, tier: 'FREE' },
    ELITE: { credits: 50, tier: 'ELITE', premium_until: new Date(Date.now() + 86400000 * 30).toISOString() },
    PREMIUM: { credits: 150, tier: 'PREMIUM', premium_until: new Date(Date.now() + 86400000 * 365).toISOString() },
    ADMIN: { credits: 999999, special_badge: 'ADMIN', tier: 'PREMIUM', premium_until: new Date(Date.now() + 86400000 * 999).toISOString() },
    INFLUENCER: { credits: 500, special_badge: 'INFLUENCER', tier: 'PREMIUM', premium_until: new Date(Date.now() + 86400000 * 60).toISOString() },
    AUS_OPEN: { credits: 25, special_badge: 'AUS_OPEN', tier: 'ELITE', premium_until: new Date(Date.now() + 86400000 * 14).toISOString() }
  };

  const variants = ['FREE', 'ELITE', 'PREMIUM', 'ADMIN', 'INFLUENCER', 'AUS_OPEN'];

  return (
    <div className="min-h-screen p-4 md:p-10 pb-32">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 text-center">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
                Identity Card <span className="text-tennis-lime">Fabricator</span>
            </h1>
            <p className="text-gray-500 text-xs font-mono">VISUAL VERIFICATION UNIT</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {variants.map((variant) => (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={variant} 
                className="flex flex-col gap-4 group"
            >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-tennis-lime text-xs font-black uppercase tracking-widest">{variant}</span>
                    <span className="text-gray-600 text-[10px] font-mono">ID: {Math.floor(Math.random() * 1000)}</span>
                </div>
                
                {/* Hier nutzen wir forcedVariant für die Vorschau */}
                <MemberCard 
                    user={mockUser} 
                    profile={profiles[variant as keyof typeof profiles]} 
                    onRefresh={() => console.log("Refresh simulated")}
                    forcedVariant={variant} 
                />
            </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
}