import React from 'react';
import { ArrowLeft, Heart, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface PlayerHeaderProps {
  playerName?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onShare?: () => void;
}

export const PlayerHeader: React.FC<PlayerHeaderProps> = ({
  playerName,
  isFavorite = false,
  onToggleFavorite,
  onShare,
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="sticky top-0 z-30 flex items-center justify-between bg-[#0f1115]/90 backdrop-blur-xl border-b border-white/5 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-white/5 active:bg-white/10 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="ml-2 text-sm font-bold text-gray-400 uppercase tracking-widest truncate max-w-[180px] sm:max-w-xs">
          {playerName ? playerName : 'Player Profile'}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        {onShare && (
          <button
            onClick={onShare}
            className="p-2 rounded-full hover:bg-white/5 active:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Share Player"
          >
            <Share2 size={20} />
          </button>
        )}
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-full transition-all hover:bg-white/5 active:scale-95 ${
              isFavorite ? 'text-rose-500' : 'text-gray-400 hover:text-white'
            }`}
            aria-label="Toggle Watchlist"
          >
            <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

