import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LoadingScreen } from '../components/LoadingScreen';
import { PlayerHeader } from '../components/PlayerHeader';
import { SectionTabs } from '../components/SectionTabs';
import { ResponsiveSection } from '../components/ResponsiveSection';
import { LoadManagementWidget } from '../components/LoadManagementWidget';
import { PlayerIntelligenceWidget } from '../components/PlayerIntelligenceWidget';
import { SurfaceMasteryWidget } from '../components/SurfaceMasteryWidget';
import { AdvancedQuantWidget } from '../components/AdvancedQuantWidget';
import { VegasFormWidget } from '../components/VegasFormWidget';
import { motion } from 'framer-motion';
import { fadeUpVariant } from '../components/animationVariants';



export const PlayerProfile: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const [activeTab, setActiveTab] = useState<string>('Load');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);

  // Simulate initial metadata loading (e.g., player name)
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const markLoaded = (tabId: string) => {
    setLoadedTabs(prev => new Set(prev).add(tabId));
  };

  const tabs = ['Load', 'Intelligence', 'Surface', 'Stats', 'Form'];

  if (loading) return <LoadingScreen />;

  return (
    <motion.div variants={fadeUpVariant} initial="hidden" animate="show" className="bg-[#0f1115] min-h-screen">
      <PlayerHeader />
      <SectionTabs tabs={tabs} activeTab={activeTab} onTabSelect={setActiveTab} />

      <ResponsiveSection
        id="load"
        title="Load Management"
        isActive={activeTab === 'Load'}
        loaded={loadedTabs.has('load')}
        setLoaded={markLoaded}
      >
        <LoadManagementWidget />
      </ResponsiveSection>

      <ResponsiveSection
        id="intelligence"
        title="Intelligence Briefings"
        isActive={activeTab === 'Intelligence'}
        loaded={loadedTabs.has('intelligence')}
        setLoaded={markLoaded}
      >
        <PlayerIntelligenceWidget />
      </ResponsiveSection>

      <ResponsiveSection
        id="surface"
        title="Surface Mastery"
        isActive={activeTab === 'Surface'}
        loaded={loadedTabs.has('surface')}
        setLoaded={markLoaded}
      >
        <SurfaceMasteryWidget />
      </ResponsiveSection>

      <ResponsiveSection
        id="stats"
        title="Quant Performance"
        isActive={activeTab === 'Stats'}
        loaded={loadedTabs.has('stats')}
        setLoaded={markLoaded}
      >
        <AdvancedQuantWidget />
      </ResponsiveSection>

      <ResponsiveSection
        id="form"
        title="Vegas Form"
        isActive={activeTab === 'Form'}
        loaded={loadedTabs.has('form')}
        setLoaded={markLoaded}
      >
        <VegasFormWidget playerName={playerId ?? ''} />
      </ResponsiveSection>
    </motion.div>
  );
};