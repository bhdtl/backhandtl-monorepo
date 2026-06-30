// Vercel deployment cache trigger comment
import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, Save, X, Sliders, Award, Zap, Search, Upload, 
  Image as ImageIcon, ShieldAlert, Loader2, ChevronDown, 
  Brain, Activity, LayoutGrid, Users, BarChart3, Ticket,
  CheckCircle2, Circle, Languages, Palette, Sparkles, FileText, Eye, Swords, Gauge, PenTool,
  Type, 
  ThumbsUp, LifeBuoy, Briefcase,
  Copy // 🚀 SOTA FIX: Briefcase für Partner Tab hinzugefügt
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAccess } from '../hooks/useAccess';
import { uploadPlayerImage } from '../lib/imageUpload';
import { Toast } from '../components/Toast';
import { CourtsManager } from '../components/CourtsManager';
import { ScrollToTop } from '../components/ScrollToTop';
import { BrandLogo } from '../components/BrandLogo';
import { MetricsDashboard } from './MetricsDashboard';
import { LoadingScreen } from '../components/LoadingScreen';
import { PromoCodeManager } from '../components/PromoCodeManager'; 
import { CardGallery } from '../components/CardGallery';
import { SmartArticleRenderer } from '../components/SmartArticleRenderer';


// --- STYLES: SOTA SCROLLBARS & UTILS ---
const style = document.createElement('style');
style.textContent = `
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .glass-panel {
    background: rgba(26, 29, 38, 0.8);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  input[type=number]::-webkit-inner-spin-button, 
  input[type=number]::-webkit-outer-spin-button { 
    -webkit-appearance: none; 
    margin: 0; 
  }
  .outline-text {
    -webkit-text-stroke: 1px rgba(255,255,255,0.1);
  }
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .editor-tab-active {
    background: rgba(204, 255, 0, 0.1);
    color: #ccff00;
    border: 1px solid rgba(204, 255, 0, 0.2);
  }
  .editor-tab-inactive {
    background: rgba(255, 255, 255, 0.05);
    color: #6b7280;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

// --- HELPER: SEARCH MODAL ---
const SearchSelectionModal = ({ isOpen, onClose, onSelect, type, options }: { isOpen: boolean, onClose: () => void, onSelect: (val: any) => void, type: string, options: any[] }) => {
    const [search, setSearch] = useState('');
    useEffect(() => { if(isOpen) setSearch(''); }, [isOpen]);

    if (!isOpen) return null;
    
    const filtered = options.filter(o => {
        const label = typeof o === 'string' ? o : (o.name || o.last_name || '');
        return label.toLowerCase().includes(search.toLowerCase());
    }).slice(0, 15);

    return (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={onClose}></div>
            <div className="relative bg-[#1a1d26] border-t md:border border-white/10 rounded-t-3xl md:rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom-20 md:zoom-in-95 duration-200 max-h-[85vh] flex flex-col z-10">
                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 md:hidden"></div>
                <h3 className="text-white font-black uppercase text-sm mb-4 tracking-widest">Select {type}</h3>
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                    <input autoFocus className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-tennis-lime transition-all" placeholder="Type to search..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="space-y-1 overflow-y-auto no-scrollbar flex-1 min-h-0 -mx-2 px-2">
                    {filtered.map((opt, idx) => {
                        const label = typeof opt === 'string' ? opt : (opt.name || opt.last_name);
                        const detail = typeof opt === 'object' ? (opt.surface || opt.country || '') : '';
                        return (
                            <button key={idx} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(opt); }} className="w-full text-left p-3 hover:bg-white/5 rounded-xl text-sm text-gray-300 hover:text-white transition-colors font-bold border-b border-white/5 last:border-0 flex justify-between items-center group">
                                <span>{label}</span>
                                {detail && <span className="text-[9px] font-mono text-gray-600 uppercase group-hover:text-gray-400">{detail}</span>}
                            </button>
                        );
                    })}
                    {filtered.length === 0 && <div className="text-gray-500 text-xs text-center py-8 italic">No results found.</div>}
                </div>
                <button onClick={onClose} className="mt-4 w-full py-4 bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors shrink-0">Cancel</button>
            </div>
        </div>
    );
};

// --- COMPONENT: MULTI-SELECT CREATABLE ---
const MultiSelectCreatable = ({ value, onChange, options, placeholder, max = 2 }: { value: string, onChange: (val: string) => void, options: string[], placeholder: string, max?: number }) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedTags = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) { setIsOpen(false); }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const addTag = (tag: string) => {
    if (selectedTags.length >= max) return;
    if (!selectedTags.includes(tag)) {
      const newTags = [...selectedTags, tag];
      onChange(newTags.join(', '));
    }
    setInputValue("");
    setIsOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    onChange(newTags.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    }
  };

  return (
    <div className="relative w-full group" ref={wrapperRef}>
      <div className={`bg-black/40 border border-white/10 rounded-2xl p-3 md:p-4 text-sm text-white flex flex-wrap items-center gap-2 min-h-[56px] focus-within:border-tennis-lime focus-within:ring-1 focus-within:ring-tennis-lime/50 transition-all duration-300 ${selectedTags.length >= max ? 'opacity-80' : ''}`} onClick={() => { if(selectedTags.length < max) setIsOpen(true); }}>
        {selectedTags.map(tag => (
          <span key={tag} className="bg-tennis-lime text-black text-[11px] md:text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 uppercase tracking-wide shadow-lg animate-in zoom-in duration-200">
            {tag}
            <button onClick={(e) => { e.stopPropagation(); removeTag(tag); }} className="hover:bg-black/20 rounded-full p-0.5 transition-colors"><X size={12} strokeWidth={3} /></button>
          </span>
        ))}
        {selectedTags.length < max && (
          <input type="text" className="bg-transparent outline-none flex-1 min-w-[100px] placeholder-gray-500 text-white font-medium text-base md:text-sm h-full py-1" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onFocus={() => setIsOpen(true)} onKeyDown={handleKeyDown} placeholder={selectedTags.length === 0 ? placeholder : ""} />
        )}
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#1a1d26] border border-gray-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 no-scrollbar ring-1 ring-white/10">
          {options.filter(opt => opt.toLowerCase().includes(inputValue.toLowerCase()) && !selectedTags.includes(opt)).map((opt) => (
            <div key={opt} className="px-5 py-3.5 text-sm text-gray-300 hover:bg-tennis-lime hover:text-black cursor-pointer transition-colors font-bold uppercase tracking-wide border-b border-white/5 last:border-0" onClick={() => addTag(opt)}>{opt}</div>
          ))}
          {inputValue && !options.includes(inputValue) && !selectedTags.includes(inputValue) && (
            <div className="px-5 py-3.5 text-sm text-tennis-lime italic border-t border-gray-700 cursor-pointer hover:bg-white/5 font-medium flex items-center gap-2" onClick={() => addTag(inputValue)}><Plus size={14} /> Create: "{inputValue}"</div>
          )}
        </div>
      )}
      {selectedTags.length >= max && (
        <div className="text-[10px] text-red-400 mt-2 text-right font-bold uppercase tracking-widest flex items-center justify-end gap-1"><ShieldAlert size={10} /> Max Capacity Reached</div>
      )}
    </div>
  );
};

// --- INTERFACES ---
interface Player { id: string; first_name: string; last_name: string; country: string; play_style: string; surface_preference: string; profile_image_url: string; tour: 'ATP' | 'WTA'; }
interface ScoutingReport { id: string; player_id: string; strengths: string; weaknesses: string; mental_game_notes: string; last_updated: string; }
interface PlayerSkills { id?: string; player_id: string; serve: number; forehand: number; backhand: number; volley: number; speed: number; power: number; mental: number; stamina: number; overall_rating: number; }
interface PlayerAchievement { id?: string; player_id: string; achievement_key: string; unlocked: boolean; }
interface Article { id?: string; slug: string; title: string; excerpt: string; content: string; hero_image_url: string; tags: string[]; is_published: boolean; author_name: string; published_at?: string; }
interface Tournament { id: string; name: string; bsi_rating: number; surface: string; }

const ACHIEVEMENT_KEYS = [ { key: 'power_hitter', label: 'Power Hitter' }, { key: 'defensive_master', label: 'Defensive Master' }, { key: 'hot_streak', label: 'Hot Streak' }, { key: 'tactical_genius', label: 'Tactical Genius' }, { key: 'precision_pro', label: 'Precision Pro' }, { key: 'aggressive_play', label: 'Aggressive Play' } ];
const SKILL_KEYS = ['serve', 'forehand', 'backhand', 'volley', 'speed', 'power', 'mental', 'stamina'] as const;
const PLAY_STYLE_OPTIONS = [ "Aggressive Baseliner", "Counter Puncher", "Serve & Volley", "All Court", "Big Server", "Flat Hitter", "Grinder", "Junk Baller", "Lefty", "Net Rusher" ];

// --- MAIN COMPONENT ---
export function AdminCMS() {
  const { user } = useAuth();
  const { isAdmin, isFounder, loading: accessLoading } = useAccess();
  
  const [activeTab, setActiveTab] = useState<'players' | 'metrics' | 'support' | 'settings'>('players');
  const [settingsSection, setSettingsSection] = useState<'courts' | 'promos' | 'designs'>('courts');
  const [affiliateRequests, setAffiliateRequests] = useState<any[]>([]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setToastMessage('User-ID in Zwischenablage kopiert!');
    setShowToast(true);
  };
  
  // DATA STATES
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]); 
  const [reports, setReports] = useState<{ [key: string]: ScoutingReport }>({});
  const [skills, setSkills] = useState<{ [key: string]: PlayerSkills }>({});
  const [achievements, setAchievements] = useState<{ [key: string]: PlayerAchievement[] }>({});
  
  // SUPPORT STATES
  const [supportView, setSupportView] = useState<'tickets' | 'feedback'>('tickets');
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [adminFeedback, setAdminFeedback] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // INTELLIGENCE STATES
  const [articles, setArticles] = useState<Article[]>([]);
  const [isEditingArticle, setIsEditingArticle] = useState(false);
  const [articleForm, setArticleForm] = useState<Article>({ slug: '', title: '', excerpt: '', content: '', hero_image_url: '', tags: [], is_published: false, author_name: 'Neural Scout AI' });
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [articleTagsInput, setArticleTagsInput] = useState(''); 
  const [newsFilter, setNewsFilter] = useState<'ALL' | 'DRAFT' | 'LIVE'>('ALL');

  // WIDGET STATES
  const [showMatchupModal, setShowMatchupModal] = useState(false);
  const [matchupStep, setMatchupStep] = useState(1);
  const [tempP1, setTempP1] = useState('');
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write'); 
  const articleImageInputRef = useRef<HTMLInputElement>(null);

  // PLAYER STATES
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [isEditingAchievements, setIsEditingAchievements] = useState(false);
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [playerForm, setPlayerForm] = useState({ first_name: '', last_name: '', country: '', play_style: '', surface_preference: 'Hard', profile_image_url: '', tour: 'ATP' as 'ATP' | 'WTA' });
  const [reportForm, setReportForm] = useState({ strengths: '', weaknesses: '', mental_game_notes: '' });
  const [skillsForm, setSkillsForm] = useState<PlayerSkills>({ player_id: '', serve: 50, forehand: 50, backhand: 50, volley: 50, speed: 50, power: 50, mental: 50, stamina: 50, overall_rating: 50 });
  const [achievementsForm, setAchievementsForm] = useState<{ [key: string]: boolean }>({});

  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return players;
    const term = searchTerm.toLowerCase();
    return players.filter((p) => p.first_name.toLowerCase().includes(term) || p.last_name.toLowerCase().includes(term) || `${p.first_name} ${p.last_name}`.toLowerCase().includes(term));
  }, [searchTerm, players]);

  const filteredArticles = useMemo(() => {
      return articles.filter(art => {
          if (newsFilter === 'ALL') return true;
          if (newsFilter === 'DRAFT') return !art.is_published;
          if (newsFilter === 'LIVE') return art.is_published;
          return true;
      });
  }, [articles, newsFilter]);

  useEffect(() => {
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(style); } catch(e) {} };
  }, []);

  useEffect(() => {
    if (user && isAdmin) {
      loadData();
      const channels = [
        supabase.channel('p').on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, loadData).subscribe(),
        supabase.channel('t').on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, loadData).subscribe(),
        supabase.channel('r').on('postgres_changes', { event: '*', schema: 'public', table: 'scouting_reports' }, loadData).subscribe(),
        supabase.channel('s').on('postgres_changes', { event: '*', schema: 'public', table: 'player_skills' }, loadData).subscribe(),
        supabase.channel('a').on('postgres_changes', { event: '*', schema: 'public', table: 'player_achievements' }, loadData).subscribe(),
        supabase.channel('st').on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, loadData).subscribe(),
        supabase.channel('fp').on('postgres_changes', { event: '*', schema: 'public', table: 'feedback_posts' }, loadData).subscribe(),
        supabase.channel('aff').on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_requests' }, loadData).subscribe()
      ];
      return () => { channels.forEach(c => supabase.removeChannel(c)); };
    }
  }, [user, isAdmin]);

  const loadData = async () => {
    try {
      const [p, r, s, a, arts, tours, tix, fb, aff] = await Promise.all([
          supabase.from('players').select('id, first_name, last_name, country, play_style, surface_preference, profile_image_url, tour').order('last_name', { ascending: true }),
          supabase.from('scouting_reports').select('id, player_id, strengths, weaknesses, mental_game_notes, last_updated'),
          supabase.from('player_skills').select('id, player_id, serve, forehand, backhand, volley, speed, power, mental, stamina, overall_rating'),
          supabase.from('player_achievements').select('id, player_id, achievement_key, unlocked'),
          supabase.from('articles').select('id, slug, title, excerpt, content, hero_image_url, tags, is_published, author_name, published_at').order('created_at', { ascending: false }),
          supabase.from('tournaments').select('id, name, bsi_rating, surface').order('name', { ascending: true }),
          supabase.from('support_tickets').select('id, user_id, subject, message, status, admin_response, created_at').order('created_at', { ascending: false }),
          supabase.from('feedback_posts').select('id, user_id, category, title, content, status, upvotes_count, created_at').order('created_at', { ascending: false }),
          supabase.from('affiliate_requests').select('id, user_id, neobet_username, status, rejection_reason, created_at, profiles(first_name, tier, is_premium)').order('created_at', { ascending: false })
      ]);
      
      if (p.error) console.warn("Players fetch error", p.error);
      if (tix.error) console.warn("Tickets fetch error", tix.error);
      if (fb.error) console.warn("Feedback fetch error", fb.error);
      if (aff.error) console.warn("Affiliate requests fetch error", aff.error);

      setPlayers(p.data || []);
      setTournaments(tours.data as any || []);
      setArticles(arts.data as any || []);
      setAdminTickets(tix.data as any || []);
      setAdminFeedback(fb.data as any || []);
      setAffiliateRequests(aff.data || []);
      
      const reportsMap: any = {}; r.data?.forEach(x => reportsMap[x.player_id] = x); setReports(reportsMap);
      const skillsMap: any = {}; s.data?.forEach(x => skillsMap[x.player_id] = x); setSkills(skillsMap);
      const achMap: any = {}; a.data?.forEach(x => { if(!achMap[x.player_id]) achMap[x.player_id]=[]; achMap[x.player_id].push(x); }); 
      setAchievements(achMap);
    } catch (e) { 
        console.error("Data Sync Failure:", e); 
        setToastMessage("Warning: Some data streams failed."); 
        setShowToast(true);
    } finally { 
        setLoading(false); 
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const handleCreatePlayer = async () => {
    try {
      setIsUploading(true);
      const { data, error } = await supabase.from('players').insert([{ ...playerForm, profile_image_url: '' }]).select().single();
      if (error) throw error;
      let imageUrl = '';
      if (selectedFile) {
        const result = await uploadPlayerImage(selectedFile, data.id);
        if (result.success && result.url) {
          imageUrl = result.url;
          await supabase.from('players').update({ profile_image_url: imageUrl }).eq('id', data.id);
        }
      }
      await Promise.all([
        supabase.from('scouting_reports').upsert({ player_id: data.id, author_id: user?.id, strengths: '', weaknesses: '', mental_game_notes: '' }, { onConflict: 'player_id' }),
        supabase.from('player_skills').upsert({ player_id: data.id, serve: 50, forehand: 50, backhand: 50, volley: 50, speed: 50, power: 50, mental: 50, stamina: 50, overall_rating: 50 }, { onConflict: 'player_id' }),
        supabase.from('player_achievements').upsert(ACHIEVEMENT_KEYS.map(k => ({ player_id: data.id, achievement_key: k.key, unlocked: false })), { onConflict: 'player_id, achievement_key' })
      ]);
      setShowNewPlayerForm(false);
      setPlayerForm({ first_name: '', last_name: '', country: '', play_style: '', surface_preference: 'Hard', profile_image_url: '', tour: 'ATP' });
      setSelectedFile(null);
      loadData();
      setToastMessage('Player Synchronized!'); setShowToast(true);
    } catch (e:any) { alert(e.message); } finally { setIsUploading(false); }
  };

  const handleUpdatePlayerInfo = async () => {
      if (!editingPlayer) return;
      setIsUploading(true);
      try {
          let imageUrl = playerForm.profile_image_url;
          if (selectedFile) {
              const res = await uploadPlayerImage(selectedFile, editingPlayer.id);
              if (res.success && res.url) imageUrl = res.url;
          }
          await supabase.from('players').update({ ...playerForm, profile_image_url: imageUrl }).eq('id', editingPlayer.id);
          setEditingPlayer(null); setSelectedFile(null); loadData(); setToastMessage('Asset Updated!'); setShowToast(true);
      } catch (e) { alert('Update Failure'); } finally { setIsUploading(false); }
  };

  const handleDeletePlayer = async (id: string) => {
      if (!confirm('Confirm permanent deletion?')) return;
      await supabase.from('players').delete().eq('id', id);
      loadData(); setToastMessage('Asset Deleted'); setShowToast(true);
  };

  const handleSaveSkills = async (pid: string) => {
      try {
          const payload = { ...skillsForm, player_id: pid, updated_at: new Date().toISOString() };
          delete (payload as any).id;
          await supabase.from('player_skills').upsert(payload, { onConflict: 'player_id' });
          setIsEditingSkills(false); loadData(); setToastMessage('Skills Re-calibrated!'); setShowToast(true);
      } catch (e) { alert('Skill Sync Failure'); }
  };

  const handleSaveReport = async (pid: string) => {
      try {
          await supabase.from('scouting_reports').upsert({ ...reportForm, player_id: pid, author_id: user?.id, last_updated: new Date().toISOString() }, { onConflict: 'player_id' });
          setIsEditingReport(false); loadData(); setToastMessage('Intel Saved!'); setShowToast(true);
      } catch (e) { alert('Report Sync Failure'); }
  };

  const handleSaveAchievements = async (pid: string) => {
      try {
          const data = ACHIEVEMENT_KEYS.map(k => ({ player_id: pid, achievement_key: k.key, unlocked: achievementsForm[k.key] || false, updated_at: new Date().toISOString() }));
          await supabase.from('player_achievements').upsert(data, { onConflict: 'player_id, achievement_key' });
          setIsEditingAchievements(false); loadData(); setToastMessage('Trophies Synchronized!'); setShowToast(true);
      } catch (e) { alert('Achievement Sync Failure'); }
  };

  // --- SUPPORT HANDLERS (VETERAN FIX: SOTA TICKET HANDLING) ---
  const handleTicketResponse = async (ticketId: string, newStatus: string, isReplyAction = false) => {
    // 1. Optimistic Update (Immediate UI Change)
    const oldTickets = [...adminTickets];
    
    // Update local state instantly
    setAdminTickets(prev => prev.map(t => 
        t.id === ticketId 
            ? { ...t, status: newStatus, ...(isReplyAction && replyText ? { admin_response: replyText } : {}) } 
            : t
    ));

    // 2. Prepare Payload
    const update: any = { status: newStatus };
    if (isReplyAction && replyText) {
        update.admin_response = replyText;
    }
    
    // 3. Database Sync (Silent Background)
    const { error } = await supabase.from('support_tickets').update(update).eq('id', ticketId);
    
    if (error) {
        // Rollback on failure
        setAdminTickets(oldTickets);
        console.error("Ticket update error:", error);
        alert(`Update Failed: ${error.message} - Ensure 'admin_response' column exists!`);
        return;
    }

    // 4. Success Cleanup
    if (isReplyAction) {
        setReplyText('');
        setActiveTicketId(null);
    }
    setToastMessage(isReplyAction ? 'Ticket Resolved & Replied' : 'Status Updated'); 
    setShowToast(true);
  };

  const handleFeedbackStatus = async (postId: string, status: string) => {
    // Optimistic Update for Feedback too
    const oldFeedback = [...adminFeedback];
    setAdminFeedback(prev => prev.map(p => p.id === postId ? { ...p, status } : p));

    const { error } = await supabase.from('feedback_posts').update({ status }).eq('id', postId);
    
    if (error) {
        setAdminFeedback(oldFeedback);
        alert("Failed to update status");
        return;
    }
    setToastMessage('Roadmap Updated'); setShowToast(true);
  };

  const deleteFeedback = async (id: string) => {
    if(!confirm('Delete this request?')) return;
    setAdminFeedback(prev => prev.filter(p => p.id !== id)); // Optimistic delete
    await supabase.from('feedback_posts').delete().eq('id', id);
  };

  const handleApproveRequest = async (reqId: string, userId: string) => {
    try {
      const { error: reqError } = await supabase
        .from('affiliate_requests')
        .update({ status: 'approved', rejection_reason: null })
        .eq('id', reqId);
      
      if (reqError) throw reqError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          tier: 'PREMIUM', 
          is_premium: true,
          premium_until: new Date(Date.now() + 86400000 * 365 * 99).toISOString() // lifetime (99 years)
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      setToastMessage('Request approved & user upgraded!');
      setShowToast(true);
      loadData();
    } catch (err: any) {
      console.error('Error approving request:', err);
      alert('Failed to approve request: ' + err.message);
    }
  };

  const handleDeclineRequest = async (reqId: string, userId: string, reason: string) => {
    try {
      const { error: reqError } = await supabase
        .from('affiliate_requests')
        .update({ status: 'rejected', rejection_reason: reason || null })
        .eq('id', reqId);
      
      if (reqError) throw reqError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_premium: false })
        .eq('id', userId);

      if (profileError) throw profileError;

      setToastMessage('Request declined.');
      setShowToast(true);
      loadData();
    } catch (err: any) {
      console.error('Error declining request:', err);
      alert('Failed to decline request: ' + err.message);
    }
  };

  const toggleAccordion = (pid: string) => {
      if (expandedPlayerId === pid) {
          setExpandedPlayerId(null);
          setEditingPlayer(null); setIsEditingSkills(false); setIsEditingReport(false); setIsEditingAchievements(false);
      } else {
          setExpandedPlayerId(pid);
          const p = players.find(x => x.id === pid);
          if (p) { setPlayerForm({ first_name: p.first_name, last_name: p.last_name, country: p.country, play_style: p.play_style || '', surface_preference: p.surface_preference || 'Hard', profile_image_url: p.profile_image_url, tour: p.tour }); }
          setSkillsForm(skills[pid] || { player_id: pid, serve: 50, forehand: 50, backhand: 50, volley: 50, speed: 50, power: 50, mental: 50, stamina: 50, overall_rating: 50 });
          const r = reports[pid];
          setReportForm(r ? { strengths: r.strengths, weaknesses: r.weaknesses, mental_game_notes: r.mental_game_notes } : { strengths: '', weaknesses: '', mental_game_notes: '' });
          const achForm: any = {};
          ACHIEVEMENT_KEYS.forEach(k => achForm[k.key] = achievements[pid]?.find(a => a.achievement_key === k.key)?.unlocked || false);
          setAchievementsForm(achForm);
      }
  };

  const startEditInfo = (p: Player) => { setEditingPlayer(p); setSelectedFile(null); };

  // --- INTELLIGENCE LOGIC ---
  const handleEditArticle = (art: Article) => {
      setEditingArticleId(art.id || null);
      setArticleForm(art);
      setArticleTagsInput(art.tags.join(', '));
      setIsEditingArticle(true);
      setEditorMode('write');
  };

  const handleNewArticle = () => {
      setEditingArticleId(null);
      setArticleForm({ slug: '', title: '', excerpt: '', content: '', hero_image_url: '', tags: [], is_published: false, author_name: 'Neural Scout AI' });
      setArticleTagsInput('');
      setIsEditingArticle(true);
      setEditorMode('write');
  };

  const saveArticle = async () => {
      try {
          let slugToUse = articleForm.slug;
          if (!slugToUse || slugToUse.trim() === '') {
              slugToUse = articleForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              if(!slugToUse) slugToUse = `report-${Date.now()}`;
          }

          const tagsArray = articleTagsInput.split(',').map(s => s.trim()).filter(Boolean);
          const payload = { ...articleForm, slug: slugToUse, tags: tagsArray, updated_at: new Date().toISOString() };
          
          if (!editingArticleId) delete (payload as any).id;

          let error;
          if (editingArticleId) {
              const res = await supabase.from('articles').update(payload).eq('id', editingArticleId);
              error = res.error;
          } else {
              const res = await supabase.from('articles').insert(payload);
              error = res.error;
          }
          
          if (error) {
              console.error("DB SAVE ERROR:", error);
              alert(`Error: ${error.message} (Code: ${error.code})`);
              return;
          }
          
          setIsEditingArticle(false);
          await loadData();
          
          if (articleForm.is_published) setToastMessage('Intel Published Live!');
          else setToastMessage('Draft Saved Securely');
          
          setShowToast(true);
      } catch (e: any) { 
          alert('System Failure: ' + e.message); 
      }
  };

  const deleteArticle = async (id: string) => {
      if(!confirm('Delete article? This cannot be undone.')) return;
      await supabase.from('articles').delete().eq('id', id);
      loadData();
  };



  const insertTextAtCursor = (text: string) => {
      const textarea = document.getElementById('article-editor') as HTMLTextAreaElement;
      if (!textarea) {
          setArticleForm({ ...articleForm, content: articleForm.content + text });
          return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const prev = articleForm.content;
      const next = prev.substring(0, start) + text + prev.substring(end);
      setArticleForm({ ...articleForm, content: next });
      setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = start + text.length;
      }, 0);
  };

  const handleMatchupSelect = (val: any) => {
      if (matchupStep === 1) {
          setTempP1(val.last_name); 
          setMatchupStep(2); 
      } else {
          const widget = `{{match:${tempP1}:${val.last_name}}}`;
          insertTextAtCursor(widget);
          setMatchupStep(1);
          setShowMatchupModal(false);
      }
  };

  const handleTournamentSelect = (val: any) => {
      const name = val.name || 'Unknown';
      const bsi = val.bsi_rating || 5.0;
      const surface = val.surface || 'Hard';
      const widget = `{{bsi:${name}:${bsi}:${surface}}}`;
      insertTextAtCursor(widget);
      setShowTournamentModal(false);
  };

  const handleArticleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setIsUploading(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `article-${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('player-images').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('player-images').getPublicUrl(fileName);
          const widget = `\n![Image Description](${publicUrl})\n`;
          insertTextAtCursor(widget);
          setToastMessage('Image Injected'); setShowToast(true);
      } catch (err) { alert('Upload failed'); } 
      finally { setIsUploading(false); }
  };

  const toggleBold = () => {
    const textarea = document.getElementById('article-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) {
        const text = `****`;
        const prev = articleForm.content;
        const next = prev.substring(0, start) + text + prev.substring(end);
        setArticleForm({ ...articleForm, content: next });
        setTimeout(() => { textarea.focus(); textarea.selectionStart = textarea.selectionEnd = start + 2; }, 0);
        return;
    }
    const sel = articleForm.content.substring(start, end);
    const text = `**${sel}**`;
    const prev = articleForm.content;
    const next = prev.substring(0, start) + text + prev.substring(end);
    setArticleForm({ ...articleForm, content: next });
    setTimeout(() => { textarea.focus(); textarea.selectionStart = start; textarea.selectionEnd = end + 4; }, 0);
  };

  const insertWidget = (type: string) => {
      if(type === 'match') { setMatchupStep(1); setShowMatchupModal(true); return; }
      if(type === 'bsi') { setShowTournamentModal(true); return; }
  };

  // GATEKEEPER CHECK
  if (accessLoading || loading) return <LoadingScreen message="Verifying Clearance..." />;

  if (!isAdmin) return (
    <div className="min-h-screen bg-[#0a0c10] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-6 animate-pulse"/>
        <h1 className="text-3xl font-black text-white uppercase tracking-widest mb-2">Restricted Area</h1>
        <p className="text-gray-500 font-mono text-sm max-w-md mx-auto">System Override Failed. Your Neural ID does not have Admin clearance level.</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold uppercase transition-colors">Return to Base</button>
    </div>
  );

  const tabs = [
      { id: 'players', label: 'Players', icon: Users },
      { id: 'metrics', label: 'Metrics', icon: BarChart3 },
      { id: 'support', label: 'Support', icon: LifeBuoy },
      { id: 'settings', label: 'Settings', icon: Sliders },
    ];

  // --- RENDER CONTENT ---
  const renderContent = () => {
    switch(activeTab) {
      case 'metrics': return <MetricsDashboard />;
      case 'settings':
        return (
          <div className="space-y-6 animate-in fade-in">
            {/* Settings Sub-Nav (Apple Segmented Control Style) */}
            <div className="flex gap-2 p-1 bg-black/45 backdrop-blur-md rounded-2xl border border-white/5 w-fit shadow-lg">
              {([
                { id: 'courts', label: 'Courts', icon: LayoutGrid },
                { id: 'promos', label: 'Promos', icon: Ticket },
                { id: 'designs', label: 'Designs', icon: Palette },
              ] as const).map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSettingsSection(item.id)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                      settingsSection === item.id
                        ? 'bg-tennis-lime text-black shadow-lg shadow-tennis-lime/20'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Icon size={14} /> {item.label}
                  </button>
                );
              })}
            </div>

            {settingsSection === 'courts' && <CourtsManager />}
            {settingsSection === 'promos' && <PromoCodeManager />}
            {settingsSection === 'designs' && <CardGallery />}
          </div>
        );
      case 'support':
        return (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mb-6 pb-1">
                 <button onClick={() => setSupportView('tickets')} className={`px-5 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border transition-all whitespace-nowrap active:scale-95 duration-200 ${supportView === 'tickets' ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 text-gray-500 border-white/5 hover:text-white'}`}>Tickets ({adminTickets.filter(t => t.status === 'open').length} Open)</button>
                 <button onClick={() => setSupportView('feedback')} className={`px-5 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border transition-all whitespace-nowrap active:scale-95 duration-200 ${supportView === 'feedback' ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 text-gray-500 border-white/5 hover:text-white'}`}>Feedback Board</button>
             </div>
             {supportView === 'tickets' ? (
                 <div className="grid gap-6">
                     {adminTickets.length === 0 && <div className="text-gray-500 text-center py-10">No support tickets found.</div>}
                     {adminTickets.map(ticket => (
                         <div key={ticket.id} className="bg-[#15171e]/70 backdrop-blur-md p-6 rounded-3xl border border-white/5 relative group hover:border-white/10 hover:shadow-2xl transition-all duration-300">
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                                 <div>
                                     <div className="flex items-center gap-2 mb-1">
                                         <span className="relative flex h-2 w-2">
                                             {ticket.status === 'open' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                                             <span className={`relative inline-flex rounded-full h-2 w-2 ${ticket.status === 'open' ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                                         </span>
                                         <span className="text-[10px] font-mono text-gray-500 uppercase">{ticket.user_id ? `User: ${ticket.user_id.slice(0,8)}...` : 'Unknown User'}</span>
                                         <span className="text-gray-700 text-[10px]">•</span>
                                         <span className="text-[10px] text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                     </div>
                                     <h4 className="text-white font-bold text-base md:text-lg">{ticket.subject}</h4>
                                 </div>
                                 <div className="relative shrink-0">
                                     <select 
                                        value={ticket.status} 
                                        onChange={(e) => handleTicketResponse(ticket.id, e.target.value, false)} 
                                        className="bg-black/40 border border-white/10 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-tennis-lime cursor-pointer appearance-none pr-8 font-bold"
                                     >
                                         <option value="open">Open</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                                     </select>
                                     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={12}/>
                                 </div>
                             </div>
                             <div className="bg-black/20 p-5 rounded-2xl text-gray-300 text-sm mb-4 font-medium leading-relaxed border border-white/5">{ticket.message}</div>
                             <div className="border-t border-white/5 pt-4">
                                 {ticket.admin_response ? (
                                     <div className="text-xs text-gray-400 bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed"><span className="font-black text-tennis-lime uppercase tracking-widest mr-2 block sm:inline mb-1 sm:mb-0">Replied:</span>{ticket.admin_response}</div>
                                 ) : (
                                     <div className="flex gap-2 bg-black/45 border border-white/5 rounded-2xl p-2.5 focus-within:border-white/20 transition-all items-center">
                                         <input className="flex-1 bg-transparent border-none text-sm text-white placeholder-gray-600 focus:ring-0 px-3 outline-none" placeholder="Type reply to resolve..." value={activeTicketId === ticket.id ? replyText : ''} onChange={e => { setActiveTicketId(ticket.id); setReplyText(e.target.value); }} />
                                         {activeTicketId === ticket.id && replyText && (
                                             <button onClick={() => handleTicketResponse(ticket.id, 'resolved', true)} className="px-4 py-2 bg-tennis-lime hover:bg-tennis-lime/90 text-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-tennis-lime/10">Send & Resolve</button>
                                         )}
                                     </div>
                                 )}
                             </div>
                         </div>
                     ))}
                 </div>
             ) : (
                 <div className="grid gap-6">
                     {adminFeedback.length === 0 && <div className="text-gray-500 text-center py-10">No feedback items yet.</div>}
                     {adminFeedback.map(post => (
                         <div key={post.id} className="bg-[#15171e]/70 backdrop-blur-md p-6 rounded-3xl border border-white/5 flex flex-col sm:flex-row gap-6 hover:border-white/10 hover:shadow-2xl transition-all duration-300">
                             <div className="flex sm:flex-col items-center justify-center min-w-[50px] text-gray-500 bg-white/5 p-3 rounded-2xl border border-white/5 sm:h-fit gap-2"><ThumbsUp size={16} /><span className="font-black text-lg text-white leading-none">{post.upvotes_count}</span></div>
                             <div className="flex-1">
                                 <div className="flex items-center gap-3 mb-2">
                                     <span className="text-[10px] text-gray-500 font-mono uppercase">{post.user_id ? `User: ${post.user_id.slice(0,8)}...` : 'Unknown'}</span>
                                     <span className="text-[10px] text-tennis-lime font-black uppercase tracking-widest border border-tennis-lime/20 px-2.5 py-0.5 rounded-lg bg-tennis-lime/5">{post.category}</span>
                                 </div>
                                 <h4 className="text-white font-bold text-lg mb-1">{post.title}</h4>
                                 <p className="text-gray-400 text-sm mb-4 leading-relaxed font-semibold">{post.content}</p>
                                 <div className="flex gap-2 items-center flex-wrap">
                                     <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider mr-2">Status:</label>
                                     <div className="flex gap-1.5 flex-wrap">
                                         {['under-review', 'planned', 'in-progress', 'completed'].map(s => (
                                             <button key={s} onClick={() => handleFeedbackStatus(post.id, s)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${post.status === s ? 'bg-white text-black border-white shadow-md' : 'bg-transparent text-gray-600 border-white/5 hover:border-white/10 hover:text-gray-400'}`}>{s}</button>
                                         ))}
                                     </div>
                                     <button onClick={() => deleteFeedback(post.id)} className="ml-auto p-2 bg-red-500/10 text-red-500 hover:text-red-400 rounded-lg hover:bg-red-500/20 transition-all active:scale-95"><Trash2 size={14}/></button>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
          </div>
        );
      default: // Players (Default Case)
        return (
          <div> 
            <div className="bg-black/45 backdrop-blur-md rounded-2xl shadow-xl p-1 md:p-2 mb-8 md:mb-10 border border-white/5 flex items-center gap-4 transition-all focus-within:border-tennis-lime/50 focus-within:shadow-[0_0_40px_rgba(132,204,22,0.15)] group">
              <Search className="text-gray-500 ml-4 shrink-0 group-focus-within:text-tennis-lime transition-colors" size={20} />
              <input type="text" placeholder="QUERY DATABASE..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-700 text-sm font-black h-12 md:h-14 uppercase tracking-wider outline-none" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:gap-6">
              {filteredPlayers.map((player) => {
                  const isExpanded = expandedPlayerId === player.id;
                  return (
                      <div key={player.id} className={`bg-[#15171e]/50 backdrop-blur-md rounded-[2rem] border transition-all duration-500 overflow-hidden ${isExpanded ? 'bg-[#15171e]/90 border-tennis-lime shadow-[0_0_50px_rgba(132,204,22,0.15)] ring-1 ring-tennis-lime/20' : 'border-white/5 hover:border-white/10 hover:bg-[#1a1d26]/80'}`}>
                          <div onClick={() => toggleAccordion(player.id)} className="p-4 md:p-7 cursor-pointer select-none active:bg-white/5">
                              <div className="flex flex-row md:items-center justify-between gap-4">
                                  <div className="flex items-start md:items-center gap-4 md:gap-8 flex-1">
                                      <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-gray-900 overflow-hidden border border-white/10 shrink-0 shadow-2xl relative group">
                                          {player.profile_image_url ? <img src={player.profile_image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-700 bg-gradient-to-br from-gray-900 to-black"><Users size={32}/></div>}
                                          <div className={`absolute bottom-0 left-0 right-0 h-1 md:h-1.5 ${player.tour === 'ATP' ? 'bg-blue-600 shadow-[0_-4px_10px_rgba(37,99,235,0.5)]' : 'bg-pink-600 shadow-[0_-4px_10px_rgba(219,39,119,0.5)]'}`}></div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="text-white font-black text-lg md:text-3xl leading-tight uppercase tracking-tighter italic flex flex-col md:flex-row md:items-baseline gap-1 md:gap-2 truncate">
                                              {player.last_name} <span className="text-gray-500 md:text-gray-600 font-medium text-xs md:text-base normal-case tracking-normal not-italic truncate">{player.first_name}</span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 md:mt-3">
                                              <span className={`text-[9px] md:text-[10px] font-black px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg border ${player.tour === 'ATP' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-pink-500/10 border-pink-500/30 text-pink-400'}`}>{player.tour}</span>
                                              <span className="text-gray-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 md:gap-2">
                                                  <img src={`https://flagcdn.com/w40/${player.country.toLowerCase()}.png`} className="w-4 md:w-5 rounded-sm opacity-80" alt={player.country}/> {player.country}
                                              </span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-3 md:gap-10 pl-2">
                                      <div className="hidden md:flex flex-col items-end">
                                          <div className="text-[9px] text-gray-600 uppercase font-black tracking-[0.3em] mb-1">Combat Rating</div>
                                          <div className="text-white font-black text-4xl leading-none tabular-nums italic outline-text">{skills[player.id]?.overall_rating || '??'}</div>
                                      </div>
                                      <div className={`w-10 h-10 md:w-16 md:h-16 flex items-center justify-center rounded-xl md:rounded-2xl transition-all duration-300 ${isExpanded ? 'bg-tennis-lime text-black shadow-2xl rotate-180' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
                                          <ChevronDown size={20} className="md:w-6 md:h-6" strokeWidth={3}/>
                                      </div>
                                  </div>
                              </div>
                              <div className="md:hidden mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                   <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Global Rating</span>
                                   <span className="text-white font-black text-xl italic">{skills[player.id]?.overall_rating || '??'}</span>
                              </div>
                          </div>

                          {isExpanded && (
                              <div className="border-t border-white/5 bg-[#0a0c10]/80 p-4 md:p-10 space-y-6 md:space-y-10 animate-in slide-in-from-top-10 duration-500">
                                  {/* SECTION 1: CORE DATA */}
                                  <div className="bg-[#1a1d26] rounded-3xl border border-white/5 p-5 md:p-8 relative overflow-hidden group">
                                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={120} className="text-white"/></div>
                                      <div className="relative z-10">
                                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                                              <h4 className="text-white font-black text-[10px] md:text-[11px] uppercase tracking-[0.4em] flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Core Biometrics</h4>
                                              <div className="flex gap-2 w-full md:w-auto">
                                                  {editingPlayer?.id === player.id ? (
                                                      <>
                                                          <button onClick={handleUpdatePlayerInfo} disabled={isUploading} className="flex-1 md:flex-none justify-center px-4 md:px-5 py-3 md:py-2 bg-green-500 hover:bg-green-400 text-black text-[10px] uppercase font-black rounded-xl transition-all flex items-center gap-2"><Save size={14}/> Save</button>
                                                          <button onClick={() => setEditingPlayer(null)} className="flex-1 md:flex-none justify-center px-4 md:px-5 py-3 md:py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] uppercase font-black rounded-xl transition-all">Abort</button>
                                                      </>
                                                  ) : (
                                                      <>
                                                          <button onClick={() => startEditInfo(player)} className="flex-1 md:flex-none justify-center text-[10px] font-black text-gray-400 hover:text-white flex items-center gap-2 transition-all bg-white/5 px-4 py-3 md:py-2 rounded-xl border border-white/5"><Edit2 size={12}/> Modify</button>
                                                          <button onClick={() => handleDeletePlayer(player.id)} className="flex-1 md:flex-none justify-center text-[10px] font-black text-red-500 hover:text-red-400 flex items-center gap-2 transition-all bg-red-500/10 px-4 py-3 md:py-2 rounded-xl border border-red-500/10"><Trash2 size={12}/> Purge</button>
                                                      </>
                                                  )}
                                              </div>
                                          </div>

                                          {editingPlayer?.id === player.id ? (
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                                  <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-6 p-6 border-2 border-dashed border-white/10 rounded-2xl bg-black/40">
                                                      <div className="w-20 h-20 rounded-2xl bg-gray-900 overflow-hidden shrink-0 border border-white/10">
                                                          {playerForm.profile_image_url ? <img src={playerForm.profile_image_url} className="w-full h-full object-cover"/> : <ImageIcon className="w-full h-full p-6 text-gray-700"/>}
                                                      </div>
                                                      <div className="w-full md:w-auto">
                                                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                          <button onClick={() => fileInputRef.current?.click()} className="w-full md:w-auto text-[10px] bg-white text-black font-black px-6 py-3 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><Upload size={14}/> {selectedFile ? selectedFile.name : 'Update Portrait'}</button>
                                                      </div>
                                                  </div>

                                                  {/* Group inputs for correct layout */}
                                                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                      <input className="bg-black/40 border border-white/10 rounded-2xl p-4 text-base md:text-sm text-white focus:border-tennis-lime outline-none font-bold placeholder-gray-800" value={playerForm.first_name} onChange={e => setPlayerForm({...playerForm, first_name: e.target.value})} placeholder="First Name" />
                                                      <input className="bg-black/40 border border-white/10 rounded-2xl p-4 text-base md:text-sm text-white focus:border-tennis-lime outline-none font-bold placeholder-gray-800" value={playerForm.last_name} onChange={e => setPlayerForm({...playerForm, last_name: e.target.value})} placeholder="Last Name" />
                                                      <input className="md:col-span-2 bg-black/40 border border-white/10 rounded-2xl p-4 text-base md:text-sm text-white focus:border-tennis-lime outline-none font-bold placeholder-gray-800 uppercase" value={playerForm.country} onChange={e => setPlayerForm({...playerForm, country: e.target.value})} placeholder="Country" />
                                                  </div>
                                                  
                                                  <div className="md:col-span-2 space-y-6">
                                                      <MultiSelectCreatable value={playerForm.play_style} onChange={(val) => setPlayerForm({...playerForm, play_style: val})} options={PLAY_STYLE_OPTIONS} placeholder="Tactical Play Styles" />
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                                          <div className="relative">
                                                              <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-base md:text-sm text-white focus:border-tennis-lime outline-none font-bold appearance-none cursor-pointer" value={playerForm.surface_preference} onChange={e => setPlayerForm({...playerForm, surface_preference: e.target.value})}>
                                                                  <option value="Hard">Hard Court</option><option value="Clay">Clay</option><option value="Grass">Grass</option><option value="Indoor">Indoor</option>
                                                              </select>
                                                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16}/>
                                                          </div>
                                                          <div className="relative">
                                                              <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-base md:text-sm text-white focus:border-tennis-lime outline-none font-bold appearance-none cursor-pointer" value={playerForm.tour} onChange={e => setPlayerForm({...playerForm, tour: e.target.value as any})}>
                                                                  <option value="ATP">ATP Tour</option><option value="WTA">WTA Tour</option>
                                                              </select>
                                                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16}/>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </div>
                                          ) : (
                                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 text-sm">
                                                  <div className="space-y-1"><span className="text-[9px] uppercase font-black text-gray-600 tracking-widest block">Combat Style</span><span className="text-white font-bold tracking-wide uppercase">{player.play_style || 'Undefined'}</span></div>
                                                  <div className="space-y-1"><span className="text-[9px] uppercase font-black text-gray-600 tracking-widest block">Preferred Surface</span><span className="text-white font-bold tracking-wide uppercase">{player.surface_preference || 'Adaptive'}</span></div>
                                                  <div className="space-y-1"><span className="text-[9px] uppercase font-black text-gray-600 tracking-widest block">Operational ID</span><span className="text-white font-mono text-[10px] text-gray-400">{player.id.split('-')[0]}...</span></div>
                                                  <div className="space-y-1"><span className="text-[9px] uppercase font-black text-gray-600 tracking-widest block">Registry Name</span><span className="text-white font-bold tracking-wide uppercase">{player.first_name} {player.last_name}</span></div>
                                              </div>
                                          )}
                                      </div>
                                  </div>

                                  {/* SECTION 2: SKILLS */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                                          <div className="bg-[#1a1d26] rounded-3xl border border-white/5 p-5 md:p-8">
                                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                                                  <h4 className="text-white font-black text-[10px] md:text-[11px] uppercase tracking-[0.4em] flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-tennis-lime animate-pulse"></span> Attribute Matrix</h4>
                                                  {isEditingSkills ? (
                                                      <div className="flex gap-2 w-full md:w-auto">
                                                          <button onClick={() => handleSaveSkills(player.id)} className="flex-1 md:flex-none justify-center px-4 md:px-5 py-3 md:py-2 bg-tennis-lime text-black text-[10px] uppercase font-black rounded-xl shadow-lg transition-all">Save Grid</button>
                                                          <button onClick={() => setIsEditingSkills(false)} className="flex-1 md:flex-none justify-center px-4 md:px-5 py-3 md:py-2 bg-white/10 text-white text-[10px] uppercase font-black rounded-xl transition-all">Abort</button>
                                                      </div>
                                                  ) : (
                                                      <button onClick={() => setIsEditingSkills(true)} className="w-full md:w-auto justify-center text-[10px] font-black text-tennis-lime hover:text-white flex items-center gap-2 transition-all bg-tennis-lime/10 px-4 py-3 md:py-2 rounded-xl border border-tennis-lime/10"><Zap size={12}/> Re-Calibrate</button>
                                                  )}
                                              </div>

                                              <div className="space-y-4 md:space-y-6">
                                                  {isEditingSkills && (
                                                      <div className="p-4 md:p-5 bg-tennis-lime/5 border border-tennis-lime/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 mb-6 shadow-inner">
                                                          <label className="text-tennis-lime text-[11px] font-black uppercase tracking-[0.3em]">Operational Rating</label>
                                                          <input type="number" className="bg-black/60 text-3xl font-black text-white text-center w-full md:w-24 border border-white/10 rounded-xl focus:border-tennis-lime outline-none py-2 italic" value={skillsForm.overall_rating} onChange={e => setSkillsForm({...skillsForm, overall_rating: parseInt(e.target.value) || 0})} />
                                                      </div>
                                                  )}
                                                  <div className={`grid ${isEditingSkills ? 'grid-cols-2 md:grid-cols-4 gap-3 md:gap-6' : 'grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 md:gap-y-6'}`}>
                                                      {SKILL_KEYS.map(key => (
                                                          <div key={key} className={`group ${isEditingSkills ? 'bg-black/40 border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center' : ''}`}>
                                                              <div className={`flex justify-between items-center text-[10px] font-black uppercase tracking-widest w-full ${isEditingSkills ? 'text-gray-500 mb-2 justify-center' : 'text-gray-600 mb-2'}`}>
                                                                  <span>{key}</span>
                                                                  {!isEditingSkills && <span className="text-white italic text-xs">{(skills[player.id] as any)?.[key] || 50}</span>}
                                                              </div>
                                                              {isEditingSkills ? (
                                                                  <div className="w-full">
                                                                      <input type="number" min="0" max="99" className="w-full bg-transparent border-none text-center text-white text-xl md:text-2xl font-black focus:ring-0 outline-none p-0" placeholder="00" value={(skillsForm as any)[key]} onChange={e => setSkillsForm({...skillsForm, [key]: parseInt(e.target.value) || 0})} />
                                                                  </div>
                                                              ) : (
                                                                  <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                                                      <div className="h-full bg-gradient-to-r from-gray-700 via-gray-400 to-white shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-all duration-1000" style={{width: `${(skills[player.id] as any)?.[key] || 50}%`}}/>
                                                                  </div>
                                                              )}
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          </div>

                                          <div className="space-y-6 md:space-y-10">
                                              {/* ACHIEVEMENTS */}
                                              <div className="bg-[#1a1d26] rounded-3xl border border-white/5 p-5 md:p-8">
                                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                                                      <h4 className="text-white font-black text-[10px] md:text-[11px] uppercase tracking-[0.4em] flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> Tactical Badges</h4>
                                                      {isEditingAchievements ? (
                                                          <div className="flex gap-2 w-full md:w-auto">
                                                              <button onClick={() => handleSaveAchievements(player.id)} className="flex-1 md:flex-none justify-center px-4 md:px-5 py-3 md:py-2 bg-yellow-500 text-black text-[10px] uppercase font-black rounded-xl shadow-lg transition-all">Commit</button>
                                                              <button onClick={() => setIsEditingAchievements(false)} className="flex-1 md:flex-none justify-center px-4 md:px-5 py-3 md:py-2 bg-white/10 text-white text-[10px] uppercase font-black rounded-xl transition-all">Cancel</button>
                                                          </div>
                                                      ) : (
                                                          <button onClick={() => setIsEditingAchievements(true)} className="w-full md:w-auto justify-center text-[10px] font-black text-yellow-500 hover:text-white flex items-center gap-2 transition-all bg-yellow-500/10 px-4 py-3 md:py-2 rounded-xl border border-yellow-500/10"><Award size={12}/> Modify</button>
                                                      )}
                                                  </div>
                                                  <div className="flex flex-wrap gap-2 md:gap-3">
                                                      {ACHIEVEMENT_KEYS.map(ach => (
                                                          isEditingAchievements ? (
                                                              <label key={ach.key} className={`cursor-pointer w-full md:w-auto px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all select-none flex items-center gap-3 ${achievementsForm[ach.key] ? 'bg-yellow-500/20 border-yellow-500 text-yellow-200 shadow-lg' : 'bg-black/40 border-white/5 text-gray-700 hover:border-white/20'}`}>
                                                                  <input type="checkbox" className="hidden" checked={achievementsForm[ach.key] || false} onChange={e => setAchievementsForm({...achievementsForm, [ach.key]: e.target.checked})} />
                                                                  {achievementsForm[ach.key] ? <CheckCircle2 size={14} className="text-yellow-500 shrink-0"/> : <Circle size={14} className="opacity-40 shrink-0"/>}
                                                                  {ach.label}
                                                              </label>
                                                          ) : (
                                                              achievements[player.id]?.find(a => a.achievement_key === ach.key)?.unlocked && (
                                                                  <span key={ach.key} className="px-4 py-2 bg-gradient-to-br from-yellow-500/10 to-yellow-900/30 border border-yellow-500/30 text-yellow-200 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl shadow-xl flex items-center gap-2">
                                                                      <Award size={12} className="text-yellow-500 shadow-sm"/> {ach.label}
                                                                  </span>
                                                              )
                                                          )
                                                      ))}
                                                      {!isEditingAchievements && !achievements[player.id]?.some(a => a.unlocked) && <span className="text-gray-700 text-[10px] font-black uppercase tracking-widest italic p-4 border border-dashed border-white/5 rounded-xl w-full text-center">No Operational Badges Assigned</span>}
                                                  </div>
                                              </div>

                                              {/* INTEL REPORT */}
                                              <div className="bg-[#1a1d26] rounded-3xl border border-white/5 p-5 md:p-8">
                                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                                                      <div className="flex flex-col gap-2">
                                                          <h4 className="text-white font-black text-[10px] md:text-[11px] uppercase tracking-[0.4em] flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span> Intelligence Report</h4>
                                                          <div className="md:hidden flex items-center gap-1.5 text-gray-500"><Languages size={10} className="text-purple-500"/><span className="text-[9px] font-black uppercase tracking-widest">AI Trans. Active</span></div>
                                                      </div>
                                                      <div className="flex gap-4 items-center w-full md:w-auto">
                                                          <div className="hidden md:flex items-center gap-1.5 text-gray-600 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5"><Languages size={12} className="text-purple-500"/><span className="text-[9px] font-black uppercase tracking-widest">AI Translation Active</span></div>
                                                          {isEditingReport ? (
                                                              <div className="flex gap-2 w-full">
                                                                  <button onClick={() => handleSaveReport(player.id)} className="flex-1 md:flex-none justify-center px-4 md:px-5 py-3 md:py-2 bg-purple-500 text-white text-[10px] uppercase font-black rounded-xl shadow-lg transition-all">Sync Intel</button>
                                                                  <button onClick={() => setIsEditingReport(false)} className="flex-1 md:flex-none justify-center px-4 md:px-5 py-3 md:py-2 bg-white/10 text-white text-[10px] uppercase font-black rounded-xl transition-all">Abort</button>
                                                              </div>
                                                          ) : (
                                                              <button onClick={() => setIsEditingReport(true)} className="w-full md:w-auto justify-center text-[10px] font-black text-purple-500 hover:text-white flex items-center gap-2 transition-all bg-purple-500/10 px-4 py-3 md:py-2 rounded-xl border border-purple-500/10"><Brain size={12}/> Edit Intel</button>
                                                          )}
                                                      </div>
                                                  </div>
                                                  <div className="space-y-4 md:space-y-6">
                                                      {[
                                                          { label: 'Tactical Strengths', color: 'text-green-500', key: 'strengths' },
                                                          { label: 'Strategic Weaknesses', color: 'text-red-500', key: 'weaknesses' },
                                                          { label: 'Psychological Profile', color: 'text-purple-500', key: 'mental_game_notes' }
                                                      ].map(section => (
                                                          <div key={section.key} className="bg-black/30 p-4 md:p-5 rounded-2xl border border-white/5 transition-all hover:bg-black/40">
                                                              <div className={`text-[9px] font-black uppercase tracking-[0.3em] mb-3 ${section.color}`}>{section.label}</div>
                                                              {isEditingReport ? (
                                                                  <textarea className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm md:text-xs text-white focus:border-purple-500 outline-none leading-relaxed no-scrollbar resize-none font-bold placeholder-gray-800" rows={4} value={(reportForm as any)[section.key]} onChange={e => setReportForm({...reportForm, [section.key]: e.target.value})} />
                                                              ) : (
                                                                  <p className="text-gray-400 text-sm md:text-xs leading-relaxed font-bold italic">{reports[player.id]?.[section.key as keyof ScoutingReport] || "Awaiting intelligence data..."}</p>
                                                              )}
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  );
              })}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10 pb-32">
      <ScrollToTop />
      <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} />
      
      {/* HEADER — Logo + Aktion (wie alle anderen Seiten) */}
      <div className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
            <Link to="/scout" className="shrink-0">
                <BrandLogo className="h-7 md:h-8 text-white" />
            </Link>
            <div className="h-8 w-px bg-white/10 hidden md:block"></div>
            <div>
                <h1 className="text-lg md:text-2xl font-black text-white tracking-tight capitalize">
                    {tabs.find(t => t.id === activeTab)?.label || 'Admin'}
                </h1>
                <p className="text-gray-500 text-[10px] md:text-xs font-mono uppercase tracking-widest mt-0.5">
                    {activeTab === 'players' && 'Spieler-Verwaltung & Scouting'}
                    {activeTab === 'metrics' && 'Performance Dashboard'}
                    {activeTab === 'support' && 'Tickets & Feedback'}
                    {activeTab === 'settings' && 'Courts, Promos & Designs'}
                </p>
            </div>
        </div>
        {activeTab === 'players' && (
            <button onClick={() => setShowNewPlayerForm(true)} className="w-full md:w-auto flex items-center justify-center gap-3 bg-tennis-lime text-black px-6 py-3.5 rounded-2xl hover:scale-105 hover:shadow-[0_0_30px_rgba(132,204,22,0.4)] font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"><Plus size={18} strokeWidth={3} /> <span>Neuer Spieler</span></button>
        )}
      </div>

      {/* Desktop TABS — Hidden on Mobile (Bottom Nav statt dessen) */}
      <div className="mb-8 md:mb-10 hidden md:block overflow-x-auto pb-2 no-scrollbar">
        <div className="flex p-1.5 bg-black/45 backdrop-blur-md rounded-2xl border border-white/5 w-fit shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${isActive ? 'bg-white/10 text-white border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}>
                        <Icon size={16} className={isActive ? 'text-tennis-lime' : ''} /> {tab.label}
                    </button>
                )
            })}
        </div>
      </div>

      {/* Mobile Bottom Navigation — Exakt wie App MobileTabBar (ios-tab-bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <nav className="ios-tab-bar pointer-events-auto">
          <div className="ios-tab-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="ios-tab-item group relative"
                >
                  {isActive && (
                    <div className="absolute inset-x-1.5 inset-y-1 bg-white/[0.06] border border-white/[0.04] rounded-xl z-0"></div>
                  )}
                  <div className={`ios-tab-content relative z-10 ${isActive ? 'ios-tab-active' : 'ios-tab-inactive'}`}>
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className="ios-tab-label">{tab.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          {renderContent()}
      </div>

      {/* NEW PLAYER MODAL */}
      {showNewPlayerForm && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-end md:items-center justify-center z-[100] p-0 md:p-4 animate-in fade-in duration-300">
            <div className="bg-[#15171e] rounded-t-[2.5rem] md:rounded-[3rem] w-full max-w-2xl p-6 md:p-12 border-t md:border border-white/10 shadow-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-20 md:zoom-in-95 duration-500 no-scrollbar relative flex flex-col">
                <div className="flex justify-between items-center mb-6 md:mb-10 sticky top-0 bg-[#15171e] z-20 pb-6 border-b border-white/5 shrink-0">
                    <div>
                        <div className="text-[10px] text-tennis-lime uppercase font-black tracking-widest mb-1">System Override</div>
                        <h2 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tighter">New Asset</h2>
                    </div>
                    <button onClick={() => setShowNewPlayerForm(false)} className="p-3 bg-white/5 rounded-2xl hover:bg-red-500/20 hover:text-red-500 transition-all border border-white/5"><X size={20}/></button>
                </div>
                
                <div className="space-y-6 md:space-y-8 pb-safe overflow-y-auto">
                    <div className="flex flex-col items-center gap-6 p-6 md:p-8 border-2 border-dashed border-white/10 rounded-[2.5rem] bg-black/40 hover:border-tennis-lime/30 transition-all group cursor-pointer relative overflow-hidden">
                        <div className="absolute inset-0 bg-tennis-lime/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2rem] bg-gray-900 overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-500 border border-white/10">
                            {selectedFile ? <img src={URL.createObjectURL(selectedFile)} className="w-full h-full object-cover"/> : <ImageIcon className="w-full h-full p-8 md:p-10 text-gray-800"/>}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        <button onClick={() => fileInputRef.current?.click()} className="text-[10px] bg-white text-black font-black px-8 py-4 rounded-2xl hover:bg-gray-200 transition-all flex items-center gap-3 shadow-2xl w-full justify-center md:w-auto uppercase tracking-widest relative z-10">
                            <Upload size={16}/> {selectedFile ? 'Change Portrait' : 'Upload Tactical Portrait'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Asset Forename</label>
                            <input className="w-full bg-[#1a1d26] border border-white/10 rounded-2xl p-4 md:p-5 text-base md:text-sm text-white focus:border-tennis-lime outline-none font-black placeholder-gray-800 uppercase tracking-wider" placeholder="First Name" value={playerForm.first_name} onChange={e => setPlayerForm({...playerForm, first_name: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Asset Surname</label>
                            <input className="w-full bg-[#1a1d26] border border-white/10 rounded-2xl p-4 md:p-5 text-base md:text-sm text-white focus:border-tennis-lime outline-none font-black placeholder-gray-800 uppercase tracking-wider" placeholder="Last Name" value={playerForm.last_name} onChange={e => setPlayerForm({...playerForm, last_name: e.target.value})}/>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Country Designation (ISO-3)</label>
                        <input className="w-full bg-[#1a1d26] border border-white/10 rounded-2xl p-4 md:p-5 text-base md:text-sm text-white focus:border-tennis-lime outline-none font-black placeholder-gray-800 uppercase tracking-widest" placeholder="e.g. ESP" value={playerForm.country} onChange={e => setPlayerForm({...playerForm, country: e.target.value})}/>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Combat Style Tags</label>
                            <MultiSelectCreatable value={playerForm.play_style} onChange={(val) => setPlayerForm({...playerForm, play_style: val})} options={PLAY_STYLE_OPTIONS} placeholder="Select Multi-Style" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Terrain Preference</label>
                                <div className="relative">
                                    <select className="w-full bg-[#1a1d26] border border-white/10 rounded-2xl p-4 md:p-5 text-base md:text-sm text-white focus:border-tennis-lime outline-none font-black appearance-none cursor-pointer uppercase tracking-widest" value={playerForm.surface_preference} onChange={e => setPlayerForm({...playerForm, surface_preference: e.target.value})}>
                                            <option value="Hard">Hard Court</option><option value="Clay">Clay</option><option value="Grass">Grass</option><option value="Indoor">Indoor Hard</option>
                                    </select>
                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={20}/>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Operational Tour</label>
                                <div className="relative">
                                    <select className="w-full bg-[#1a1d26] border border-white/10 rounded-2xl p-4 md:p-5 text-base md:text-sm text-white focus:border-tennis-lime outline-none font-black appearance-none cursor-pointer uppercase tracking-widest" value={playerForm.tour} onChange={e => setPlayerForm({...playerForm, tour: e.target.value as any})}>
                                            <option value="ATP">ATP Tour</option><option value="WTA">WTA Tour</option>
                                    </select>
                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={20}/>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={handleCreatePlayer} disabled={isUploading} className="w-full bg-tennis-lime text-black py-5 md:py-6 rounded-3xl font-black uppercase tracking-[0.3em] hover:scale-[1.02] transition-all mt-6 flex justify-center items-center gap-4 shadow-[0_20px_40px_rgba(132,204,22,0.2)] mb-safe active:scale-95 group">
                        {isUploading ? <Loader2 className="animate-spin" size={24}/> : <><Plus size={24} strokeWidth={4} className="group-hover:rotate-90 transition-transform duration-500"/> Deploy Asset</>}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}