import React from 'react';
import { motion } from 'framer-motion';

/**
 * PlayerIntelligenceWidget
 *
 * Placeholder component for the Intelligence briefing section of the player profile.
 * It provides a styled container with a subtle animation that can be expanded
 * later with real data visualisations (e.g., heatmaps, recent match analysis,
 * performance metrics, etc.).
 */
export const PlayerIntelligenceWidget: React.FC = () => {
  return (
    <motion.div
      className="p-4 bg-gradient-to-br from-purple-800 to-indigo-900 rounded-xl shadow-lg text-white"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <h2 className="text-xl font-semibold mb-2">Intelligence Briefing</h2>
      <p className="text-sm">
        This section will display advanced player insights such as recent form, tactical
        tendencies, and statistical highlights.
      </p>
    </motion.div>
  );
};

export default PlayerIntelligenceWidget;
