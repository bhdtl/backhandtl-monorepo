import React from 'react';
import { motion } from 'framer-motion';

/**
 * AdvancedQuantWidget
 *
 * Placeholder for quantitative performance analytics. Displays a styled container
 * with a brief description. Replace with real visualisations when ready.
 */
export const AdvancedQuantWidget: React.FC = () => {
  return (
    <motion.div
      className="p-4 bg-gradient-to-br from-red-800 to-pink-900 rounded-xl shadow-lg text-white"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <h2 className="text-xl font-semibold mb-2">Quantitative Performance</h2>
      <p className="text-sm">
        This widget will show advanced quantitative metrics and charts for the player.
      </p>
    </motion.div>
  );
};

export default AdvancedQuantWidget;
