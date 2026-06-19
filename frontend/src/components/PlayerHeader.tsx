import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

// Sticky header with back navigation and player name
export const PlayerHeader: React.FC = () => {
  const navigate = useNavigate();
  const { playerId } = useParams<{ playerId: string }>();

  return (
    <motion.div
      className="sticky top-0 z-20 flex items-center bg-[#1a1d26]/80 backdrop-blur-xl border-b border-white/5 p-4"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <button
        onClick={() => navigate(-1)}
        className="p-2 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Back"
      >
        <ArrowLeft size={20} className="text-white" />
      </button>
      <h1 className="ml-4 text-xl font-black text-white tracking-wider">
        Player {playerId ?? ''}
      </h1>
    </motion.div>
  );
};
