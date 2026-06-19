import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { fadeUpVariant } from '../pages/PlayerProfile'; // reuse variant defined there

interface ResponsiveSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isActive: boolean; // whether the tab is currently selected
  loaded: boolean; // whether data has been loaded
  setLoaded: (id: string) => void;
}

export const ResponsiveSection: React.FC<ResponsiveSectionProps> = ({ id, title, children, isActive, loaded, setLoaded }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Open by default on desktop, accordion on mobile
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    setIsOpen(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsOpen(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // When the tab becomes active for the first time, mark as loaded
  useEffect(() => {
    if (isActive && !loaded) {
      setLoaded(id);
    }
  }, [isActive, loaded, id, setLoaded]);

  // Render nothing if not the active tab (lazy load)
  if (!isActive) return null;

  return (
    <motion.div variants={fadeUpVariant} className="mb-6">
      {/* Header for mobile accordion */}
      <div className="md:hidden flex items-center justify-between py-2 px-4 bg-[#1a1d26]/80 backdrop-blur-xl border-b border-white/5 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <h2 className="text-white font-black text-lg">{title}</h2>
        <ChevronDown className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={20} />
      </div>
      {/* Content */}
      <AnimatePresence initial={false}>
        {(isOpen || window.innerWidth >= 768) && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-[#1a1d26]/80 backdrop-blur-xl rounded-3xl p-4 border border-white/5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
