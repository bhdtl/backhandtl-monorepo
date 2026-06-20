import React from 'react';
import { Award, Target, Brain, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUpVariant } from './animationVariants';
import { useTranslation } from 'react-i18next';

interface PlayerIntelligenceWidgetProps {
  strengths?: string;
  weaknesses?: string;
  mentalGameNotes?: string;
  lastUpdated?: string;
}

export const PlayerIntelligenceWidget: React.FC<PlayerIntelligenceWidgetProps> = ({
  strengths,
  weaknesses,
  mentalGameNotes,
  lastUpdated,
}) => {
  const { t } = useTranslation();

  const parseBulletPoints = (text: string) => {
    if (!text) return [];
    return text
      .split(/[•;\n]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  const defaultStrengths = t('scouting.defaultStrengths', 'Elite baseline play, powerful first serve, and quick lateral court speed.');
  const defaultWeaknesses = t('scouting.defaultWeaknesses', 'Vulnerable under pressure on second serve return; occasional unforced errors on high-bounce forehands.');
  const defaultMental = t('scouting.defaultMental', 'Maintains high concentration levels. Demonstrates solid resilience in tiebreaks but occasionally lacks composure when facing early breaks.');

  const actualStrengths = strengths || defaultStrengths;
  const actualWeaknesses = weaknesses || defaultWeaknesses;
  const actualMental = mentalGameNotes || defaultMental;

  const strengthList = parseBulletPoints(actualStrengths);
  const weaknessList = parseBulletPoints(actualWeaknesses);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={fadeUpVariant}
      className="space-y-4 text-left"
    >
      <div className="flex justify-between items-center px-1">
        <h3 className="text-white font-black text-sm uppercase tracking-wider">
          {t('intelligence.scoutingDossier', 'Scouting & Composure Dossier')}
        </h3>
        {lastUpdated && (
          <div className="flex items-center text-[10px] text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
            <Calendar size={10} className="mr-1.5 text-gray-400" />
            <span>{t('intelligence.updated', 'Updated')}: {new Date(lastUpdated).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths Card */}
        <div className="bg-gradient-to-br from-[#121b18]/60 to-[#0e1215]/80 p-6 rounded-2xl border border-emerald-500/10 shadow-lg shadow-black/30">
          <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-4 flex items-center">
            <Award className="mr-2 text-emerald-400" size={18} />
            {t('intelligence.coreStrengths', 'Core Strengths')}
          </h3>
          {strengthList.length > 0 ? (
            <ul className="space-y-3">
              {strengthList.map((item, idx) => (
                <li key={idx} className="flex items-start text-xs text-gray-300 leading-normal">
                  <span className="text-emerald-500 mr-2 font-black mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">{t('intelligence.noStrengths', 'No strength details recorded.')}</p>
          )}
        </div>

        {/* Weaknesses Card */}
        <div className="bg-gradient-to-br from-[#1b1315]/60 to-[#0e1215]/80 p-6 rounded-2xl border border-rose-500/10 shadow-lg shadow-black/30">
          <h3 className="text-rose-400 font-bold text-sm uppercase tracking-wider mb-4 flex items-center">
            <Target className="mr-2 text-rose-400" size={18} />
            {t('intelligence.developmentAreas', 'Development Areas')}
          </h3>
          {weaknessList.length > 0 ? (
            <ul className="space-y-3">
              {weaknessList.map((item, idx) => (
                <li key={idx} className="flex items-start text-xs text-gray-300 leading-normal">
                  <span className="text-rose-500 mr-2 font-black mt-0.5">⚠</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">{t('intelligence.noWeaknesses', 'No vulnerability details recorded.')}</p>
          )}
        </div>
      </div>

      {/* Mental Game Card */}
      <div className="bg-gradient-to-br from-[#15131b]/60 to-[#0e1215]/80 p-6 rounded-2xl border border-purple-500/10 shadow-lg shadow-black/30">
        <h3 className="text-purple-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center">
          <Brain className="mr-2 text-purple-400" size={18} />
          {t('intelligence.psychologicalProfile', 'Psychological Profile')}
        </h3>
        <p className="text-xs text-gray-300 leading-relaxed">
          {actualMental}
        </p>
      </div>
    </motion.div>
  );
};

export default PlayerIntelligenceWidget;
