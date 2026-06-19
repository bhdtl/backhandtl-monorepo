import React from 'react';
import { motion } from 'framer-motion';

/**
 * VegasFormWidget
 *
 * Placeholder for the Vegas form section. Displays a styled container with a brief
 * description. Replace with the actual form implementation when ready.
 */
export const VegasFormWidget: React.FC = () => {
  return (
    <motion.div
      className="p-4 bg-gradient-to-br from-yellow-800 to-orange-900 rounded-xl shadow-lg text-white"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <h2 className="text-xl font-semibold mb-2">Vegas Form</h2>
      <p className="text-sm">
        This widget will contain the Vegas betting form and related analytics.
      </p>
    </motion.div>
  );
};

export default VegasFormWidget;
