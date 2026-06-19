import React from 'react';
import { motion } from 'framer-motion';

interface SectionTabsProps {
  tabs: string[];
  activeTab: string;
  onTabSelect: (tab: string) => void;
}

export const SectionTabs: React.FC<SectionTabsProps> = ({ tabs, activeTab, onTabSelect }) => {
  return (
    <div className="px-4 py-2">
      <div className="flex p-1 bg-[#151821]/80 rounded-2xl border border-white/5 backdrop-blur-md w-full max-w-md mx-auto overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabSelect(tab)}
              className={`relative flex-1 min-w-[70px] py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSegment"
                  className="absolute inset-0 rounded-xl bg-[#252a38] border border-white/5 shadow-md shadow-black/40"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 block text-center truncate">{tab}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
