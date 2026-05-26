import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // 1. Import

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  country?: string;
  profile_image_url?: string;
  tour?: 'ATP' | 'WTA';
}

interface SearchablePlayerDropdownProps {
  players: Player[];
  onSelect: (playerId: string) => void;
  placeholder: string;
  excludeId?: string;
  label?: string;
  selectedId?: string;
}

export function SearchablePlayerDropdown({
  players,
  onSelect,
  placeholder,
  excludeId,
  label,
  selectedId,
}: SearchablePlayerDropdownProps) {
  const { t } = useTranslation(); // 2. Hook
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  console.log('🎮 SearchablePlayerDropdown rendered with:', {
    playersCount: players.length,
    samplePlayer: players[0],
    excludeId,
  });

  const getPlayerFullName = (player: Player): string => {
    const firstName = player.first_name || '';
    const lastName = player.last_name || '';
    return `${firstName} ${lastName}`.trim() || t('playerDropdown.unknownPlayer'); // "Unknown Player"
  };

  const selectedPlayer = players.find((p) => p.id === selectedId);

  const filteredPlayers = players.filter((player) => {
    if (!player || !player.id) {
      console.warn('⚠️ Invalid player object:', player);
      return false;
    }

    if (excludeId && player.id === excludeId) return false;

    if (!searchTerm) return true;

    const fullName = getPlayerFullName(player);
    const searchLower = searchTerm?.toLowerCase() || '';
    const nameLower = fullName?.toLowerCase() || '';

    return nameLower.includes(searchLower);
  });

  console.log('🔍 Filtered players:', {
    searchTerm,
    filteredCount: filteredPlayers.length,
    totalCount: players.length,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (playerId: string) => {
    console.log('✅ Player selected:', playerId);
    onSelect(playerId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect('');
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      )}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-tennis-dark text-white border border-tennis-green/30 rounded-md px-4 py-3 cursor-pointer hover:border-tennis-green transition-colors flex items-center justify-between"
      >
        <span className={selectedPlayer ? 'text-white' : 'text-gray-400'}>
          {selectedPlayer ? getPlayerFullName(selectedPlayer) : placeholder}
        </span>
        <div className="flex items-center gap-2">
          {selectedPlayer && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-tennis-green transition-colors p-1"
            >
              <X size={16} />
            </button>
          )}
          <ChevronDown
            className={`text-tennis-green transition-transform ${isOpen ? 'rotate-180' : ''}`}
            size={20}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-tennis-darker border-2 border-tennis-green/50 rounded-md shadow-2xl max-h-80 overflow-hidden">
          <div className="p-3 border-b border-tennis-green/30 bg-tennis-dark">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('playerDropdown.searchPlaceholder')} // "Search players..."
                className="w-full bg-tennis-darker text-white placeholder-gray-500 pl-10 pr-4 py-2 rounded-md border border-tennis-green/30 focus:outline-none focus:border-tennis-green transition-colors"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-60 bg-tennis-dark">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => {
                const fullName = getPlayerFullName(player);
                return (
                  <div
                    key={player.id}
                    onClick={() => handleSelect(player.id)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      player.id === selectedId
                        ? 'bg-tennis-green/20 text-tennis-green font-semibold'
                        : 'text-white hover:bg-tennis-green/10 hover:text-tennis-green'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {player.profile_image_url && (
                        <img
                          src={player.profile_image_url}
                          alt={fullName}
                          className="w-8 h-8 rounded-full object-cover border border-tennis-green/30"
                        />
                      )}
                      <div>
                        <div className="font-medium">{fullName}</div>
                        {player.country && (
                          <div className="text-xs text-gray-400">{player.country}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-8 text-gray-400 text-center">
                {searchTerm 
                  ? t('playerDropdown.noResultsSearch', { term: searchTerm }) // "No players found matching..."
                  : t('playerDropdown.noPlayers')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}