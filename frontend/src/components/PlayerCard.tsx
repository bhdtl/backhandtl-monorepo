import { User, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // 1. Import

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  country: string;
  play_style: string;
  surface_preference: string;
  profile_image_url: string;
  overall_rating?: number;
  tour: 'ATP' | 'WTA';
}

interface PlayerCardProps {
  player: Player;
  onClick: () => void;
}

export function PlayerCard({ player, onClick }: PlayerCardProps) {
  const { t } = useTranslation(); // 2. Hook

  return (
    <div
      onClick={onClick}
      className="bg-tennis-darker rounded-lg shadow-lg hover:shadow-2xl hover:border-2 hover:border-tennis-lime transition-all cursor-pointer overflow-hidden transform hover:-translate-y-1"
    >
      <div className="h-48 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative">
        {player.profile_image_url ? (
          <img
            src={player.profile_image_url}
            alt={`${player.first_name} ${player.last_name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <User size={64} className="text-gray-600" />
        )}
        {player.overall_rating !== undefined && (
          <div className="absolute top-3 right-3 bg-tennis-darker/95 backdrop-blur-sm border-2 border-tennis-green rounded-lg px-3 py-1.5 shadow-xl">
            <div className="flex items-center space-x-1.5">
              <Star size={16} className="text-tennis-lime fill-tennis-lime" />
              <span className="text-tennis-lime font-bold text-xl italic transform -skew-x-6">
                {Math.round(player.overall_rating!)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-tennis-darker">
        <h3 className="text-lg font-bold text-white mb-2">
          {player.first_name} {player.last_name}
        </h3>

        <p className="text-sm text-tennis-lime mb-3 font-medium">{player.country}</p>

        <div className="space-y-1">
          {player.play_style && (
            <p className="text-sm text-gray-300">
              <span className="font-medium text-tennis-green">{t('playerCard.labels.style')}:</span> {player.play_style}
            </p>
          )}

          {player.surface_preference && (
            <p className="text-sm text-gray-300">
              <span className="font-medium text-tennis-green">{t('playerCard.labels.surface')}:</span> {player.surface_preference}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}