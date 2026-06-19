import React from 'react';
import { motion } from 'framer-motion';

interface SectionTabsProps {
  tabs: string[];
  activeTab: string;
  onTabSelect: (tab: string) => void;
}

export const SectionTabs: React.FC<SectionTabsProps> = ({ tabs, activeTab, onTabSelect }) => {
  return (
    <div className="flex overflow-x-auto hide-scrollbar py-2 bg-black/30 px-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabSelect(tab)}
          className={`relative mx-1 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
        >
          {activeTab === tab && (
            <motion.div
              layoutId="tabUnderline"
              className="absolute inset-0 rounded-full bg-[#2a2d36] border border-white/10"
            />
          )}
          <span className="relative z-10">{tab}</span>
        </button>
      ))}
    </div>
  );
};
