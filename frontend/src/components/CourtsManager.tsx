import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Gauge, Search, Activity, Wind, FileText, MapPin, Quote, MessageSquareQuote } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

interface PlayerQuote {
  quote: string;
  author: string;
}

interface Tournament {
  id?: string;
  name: string;
  location: string;
  surface: string;
  bsi_rating: number | '';
  bounce: 'Low' | 'Medium' | 'High';
  notes: string;
  player_quotes?: PlayerQuote[]; // 🚀 SOTA: Jetzt als Array für unendlich viele Zitate
}

export function CourtsManager() {
  const { t } = useTranslation();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState<Tournament>({
    name: '',
    location: '',
    surface: 'Hard Court Outdoor',
    bsi_rating: '',
    bounce: 'Medium',
    notes: '',
    player_quotes: []
  });

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = tournaments.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🚀 Zitat-Management Funktionen
  const addQuoteField = () => {
    setForm(prev => ({
      ...prev,
      player_quotes: [...(prev.player_quotes || []), { quote: '', author: '' }]
    }));
  };

  const updateQuote = (index: number, field: 'quote' | 'author', value: string) => {
    setForm(prev => {
      const newQuotes = [...(prev.player_quotes || [])];
      newQuotes[index] = { ...newQuotes[index], [field]: value };
      return { ...prev, player_quotes: newQuotes };
    });
  };

  const removeQuote = (index: number) => {
    setForm(prev => {
      const newQuotes = [...(prev.player_quotes || [])];
      newQuotes.splice(index, 1);
      return { ...prev, player_quotes: newQuotes };
    });
  };

  const handleSubmit = async () => {
    if (form.bsi_rating === '' || typeof form.bsi_rating !== 'number') {
      alert(t('courts.alerts.invalidBsi')); 
      return;
    }

    try {
      // Bereinigen der Zitate (leere entfernen)
      const cleanQuotes = (form.player_quotes || []).filter(q => q.quote.trim() !== '');

      const dataToSave = {
        name: form.name,
        location: form.location,
        surface: form.surface,
        bsi_rating: form.bsi_rating,
        bounce: form.bounce,
        notes: form.notes,
        player_quotes: cleanQuotes.length > 0 ? cleanQuotes : null
      };

      if (editingId) {
        const { error } = await supabase
          .from('tournaments')
          .update(dataToSave)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tournaments')
          .insert([dataToSave]);

        if (error) throw error;
      }

      resetForm();
      loadTournaments();
    } catch (error) {
      console.error('Error saving tournament:', error);
      alert(t('courts.alerts.saveError'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('courts.alerts.deleteConfirm'))) return;

    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadTournaments();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert(t('courts.alerts.deleteError'));
    }
  };

  const handleEdit = (tournament: Tournament) => {
    setEditingId(tournament.id!);
    setForm({
      ...tournament,
      bounce: tournament.bounce || 'Medium',
      notes: tournament.notes || '',
      player_quotes: tournament.player_quotes || []
    });
    setShowNewForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm({
      name: '',
      location: '',
      surface: 'Hard Court Outdoor',
      bsi_rating: '',
      bounce: 'Medium',
      notes: '',
      player_quotes: []
    });
    setEditingId(null);
    setShowNewForm(false);
  };

  const getBSIBadgeColor = (rating: number) => {
    if (rating <= 3) return 'bg-gradient-to-r from-red-500 to-orange-500';
    if (rating <= 7) return 'bg-gradient-to-r from-yellow-500 to-blue-500';
    return 'bg-gradient-to-r from-purple-500 to-pink-500';
  };

  const getBounceColor = (bounce: string) => {
    switch (bounce) {
      case 'High': return 'text-green-400';
      case 'Low': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  if (loading) {
    return <div className="text-gray-300 p-4">{t('courts.loading')}</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER & NEW BUTTON */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gauge className="text-tennis-lime" />
            {t('courtDatabase.title')}
          </h2>
          <p className="text-gray-400 mt-1 text-sm md:text-base">{t('courtDatabase.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-tennis-lime hover:bg-tennis-green text-gray-900 font-semibold px-4 py-3 rounded-lg transition-all shadow-lg active:scale-95"
        >
          {showNewForm ? <X size={20} /> : <Plus size={20} />}
          {showNewForm ? "Cancel" : "New Tournament"}
        </button>
      </div>

      {/* FORMULAR */}
      {showNewForm && (
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 shadow-xl animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">
            {editingId ? "Edit Tournament" : "Add Tournament"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-tennis-dark text-white border border-gray-700 rounded-lg px-3 py-3 md:py-2 focus:outline-none focus:border-tennis-lime text-base"
                placeholder="e.g., Australian Open"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Location *</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full bg-tennis-dark text-white border border-gray-700 rounded-lg px-3 py-3 md:py-2 focus:outline-none focus:border-tennis-lime text-base"
                placeholder="e.g., Melbourne"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Surface *</label>
              <select
                value={form.surface}
                onChange={(e) => setForm({ ...form, surface: e.target.value })}
                className="w-full bg-tennis-dark text-white border border-gray-700 rounded-lg px-3 py-3 md:py-2 focus:outline-none focus:border-tennis-lime text-base"
              >
                <option value="Hard Court Outdoor">Hard Court Outdoor</option>
                <option value="Hard Court Indoor">Hard Court Indoor</option>
                <option value="Red Clay">Red Clay</option>
                <option value="Green Clay">Green Clay</option>
                <option value="Grass">Grass</option>
                <option value="Carpet">Carpet</option>
                <option value="Artificial Clay">Artificial Clay</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">BSI Rating *</label>
              <input
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={form.bsi_rating}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setForm({ ...form, bsi_rating: '' });
                  } else {
                    const parsed = parseFloat(value);
                    if (!isNaN(parsed)) {
                      setForm({ ...form, bsi_rating: Math.max(1, Math.min(10, parsed)) });
                    }
                  }
                }}
                className="w-full bg-tennis-dark text-white border border-gray-700 rounded-lg px-3 py-3 md:py-2 focus:outline-none focus:border-tennis-lime text-base"
                placeholder="e.g., 5.0"
                required
              />
              <p className="text-xs text-gray-500 mt-1">1 (Slow) - 10 (Fast)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bounce</label>
              <select
                value={form.bounce}
                onChange={(e) => setForm({ ...form, bounce: e.target.value as any })}
                className="w-full bg-tennis-dark text-white border border-gray-700 rounded-lg px-3 py-3 md:py-2 focus:outline-none focus:border-tennis-lime text-base"
              >
                <option value="Low">Low (Skiddy)</option>
                <option value="Medium">Medium</option>
                <option value="High">High (Kicky)</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Technical Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-tennis-dark text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-tennis-lime h-24 resize-none text-base"
              placeholder="e.g. Humid, Windy..."
            />
          </div>

          {/* 🚀 NEU: DYNAMISCHE LOCKER ROOM INTEL SECTION */}
          <div className="bg-gray-900/50 p-4 md:p-5 rounded-xl border border-gray-700/50 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-tennis-lime font-bold text-sm flex items-center gap-2">
                <MessageSquareQuote size={16} />
                Locker Room Intel (Quotes)
              </h4>
              <button 
                type="button" 
                onClick={addQuoteField}
                className="bg-tennis-lime/10 text-tennis-lime hover:bg-tennis-lime/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
              >
                <Plus size={14} /> Add Quote
              </button>
            </div>

            <div className="space-y-4">
              {(!form.player_quotes || form.player_quotes.length === 0) ? (
                <div className="text-center py-4 text-xs text-gray-500 border border-dashed border-gray-700 rounded-lg">
                  No quotes added yet. Click "Add Quote" to insert player intel.
                </div>
              ) : (
                form.player_quotes.map((q, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-black/40 border border-gray-700 rounded-lg relative group">
                    <div className="md:col-span-8">
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Player Quote</label>
                      <textarea
                        value={q.quote}
                        onChange={(e) => updateQuote(index, 'quote', e.target.value)}
                        className="w-full bg-tennis-dark text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-tennis-lime h-12 resize-none text-sm"
                        placeholder='e.g. "The ball just skids off the baseline here..."'
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Author</label>
                      <input
                        type="text"
                        value={q.author}
                        onChange={(e) => updateQuote(index, 'author', e.target.value)}
                        className="w-full bg-tennis-dark text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-tennis-lime text-sm"
                        placeholder="e.g. Novak Djokovic"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-end md:justify-center pb-1">
                      <button 
                        type="button" 
                        onClick={() => removeQuote(index)}
                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                        title="Remove Quote"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={handleSubmit}
              disabled={!form.name || !form.location}
              className="flex items-center justify-center gap-2 bg-tennis-green hover:bg-tennis-lime text-gray-900 font-semibold px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Save size={20} />
              {editingId ? "Update" : "Create"}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-md"
            >
              <X size={20} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="bg-tennis-darker rounded-lg shadow-lg p-4 border border-gray-700 sticky top-0 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('courtDatabase.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-3 md:py-2 bg-tennis-dark border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-tennis-green text-white placeholder-gray-500 text-base"
          />
        </div>
      </div>

      {/* --- DESKTOP VIEW (TABLE) --- */}
      <div className="hidden md:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden shadow-lg">
        <table className="w-full">
          <thead className="bg-gray-900 border-b border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-tennis-lime">{t('courtDatabase.table.tournament')}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-tennis-lime">{t('courtDatabase.table.location')}</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-tennis-lime">{t('courtDatabase.table.surface')}</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-tennis-lime">{t('courtDatabase.table.bsi')}</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-tennis-lime">{t('courtDatabase.table.bounce')}</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-tennis-lime">Intel</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-tennis-lime">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredTournaments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  {searchTerm ? t('courtDatabase.noResults') : "No tournaments found"}
                </td>
              </tr>
            ) : (
              filteredTournaments.map((tournament) => (
                <tr key={tournament.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-2 text-white font-medium">{tournament.name}</td>
                  <td className="px-4 py-2 text-gray-300 text-sm">{tournament.location}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="inline-flex items-center bg-gray-700 px-2 py-1 rounded text-xs text-white border border-gray-600">
                      {tournament.surface}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${getBSIBadgeColor(tournament.bsi_rating as number)} text-white font-bold text-xs shadow-md`}>
                      {tournament.bsi_rating}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`flex items-center justify-center gap-1 text-xs font-medium ${getBounceColor(tournament.bounce)}`}>
                      <Activity size={12} /> {tournament.bounce}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {tournament.notes ? (
                        <div className="group relative inline-block">
                          <FileText size={16} className="text-blue-400 cursor-help hover:text-blue-300" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-black/90 border border-gray-700 text-white text-xs rounded shadow-xl hidden group-hover:block z-50 text-left">
                            <span className="font-bold text-blue-400 mb-1 block">Notes:</span>
                            {tournament.notes}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                      
                      {tournament.player_quotes && tournament.player_quotes.length > 0 && (
                        <div className="group relative inline-block">
                          <Quote size={16} className="text-tennis-lime cursor-help hover:text-[#bfff00]" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-black/90 border border-gray-700 text-white text-xs rounded shadow-xl hidden group-hover:block z-50 text-left max-h-48 overflow-y-auto custom-scrollbar">
                            <span className="font-bold text-tennis-lime mb-2 block">{tournament.player_quotes.length} Quotes:</span>
                            {tournament.player_quotes.map((q, idx) => (
                               <div key={idx} className="mb-2 pb-2 border-b border-gray-700 last:border-0">
                                  "{q.quote}"<br/>
                                  <span className="text-gray-400 mt-1 block">- {q.author}</span>
                               </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(tournament)} className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(tournament.id!)} className="p-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MOBILE VIEW (CARDS) - OPTIMIZED --- */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {filteredTournaments.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-800 rounded-lg border border-gray-700">
            {t('courtDatabase.noResults')}
          </div>
        ) : (
          filteredTournaments.map((tournament) => (
            <div key={tournament.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md">
              
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
                  <div className="flex items-center text-sm text-gray-400 mt-0.5">
                    <MapPin size={14} className="mr-1 text-tennis-lime" />
                    {tournament.location}
                  </div>
                </div>
                <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-full ${getBSIBadgeColor(tournament.bsi_rating as number)} text-white font-bold shadow-lg`}>
                  <span className="text-lg leading-none">{tournament.bsi_rating}</span>
                  <span className="text-[9px] opacity-80 uppercase font-medium mt-0.5">BSI</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-700 text-gray-200 border border-gray-600">
                  {tournament.surface}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                  tournament.bounce === 'High' ? 'bg-green-900/20 border-green-800 text-green-400' :
                  tournament.bounce === 'Low' ? 'bg-red-900/20 border-red-800 text-red-400' :
                  'bg-yellow-900/20 border-yellow-800 text-yellow-400'
                }`}>
                  <Wind size={12} className="mr-1" /> Bounce: {tournament.bounce}
                </span>
              </div>

              {tournament.notes && (
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1">
                    <FileText size={12} /> Notes
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                    {tournament.notes}
                  </p>
                </div>
              )}

              {tournament.player_quotes && tournament.player_quotes.length > 0 && (
                <div className="bg-tennis-lime/5 p-3 rounded-lg border border-tennis-lime/20 mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-tennis-lime mb-2">
                    <Quote size={12} /> {tournament.player_quotes.length} Quotes
                  </div>
                  <div className="space-y-3">
                    {tournament.player_quotes.map((q, idx) => (
                      <div key={idx}>
                         <p className="text-xs text-gray-300 italic mb-1">"{q.quote}"</p>
                         <p className="text-[10px] text-gray-500 font-bold">- {q.author}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button 
                  onClick={() => handleEdit(tournament)}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform text-sm"
                >
                  <Edit2 size={16} /> Edit
                </button>
                <button 
                  onClick={() => handleDelete(tournament.id!)}
                  className="bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform text-sm"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}