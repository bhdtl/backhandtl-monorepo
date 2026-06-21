import { useState, useEffect, useMemo } from 'react';
import { 
  Search, MessageSquare, Plus, ThumbsUp, LifeBuoy, 
  ChevronDown, ChevronUp, CheckCircle2, 
  Loader2, Mail, Twitter, Shield 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// --- TYPES ---
interface FeedbackItem {
  id: string;
  title: string;
  content: string;
  category: string;
  status: 'under-review' | 'planned' | 'in-progress' | 'completed';
  upvotes_count: number;
  user_has_voted?: boolean;
}

interface TicketItem {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  created_at: string;
  admin_response?: string;
}

export function SupportPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'hub' | 'feedback' | 'tickets'>('hub');
  const [loading, setLoading] = useState(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [myTickets, setMyTickets] = useState<TicketItem[]>([]);
  
  // Local Search State for FAQ
  const [searchQuery, setSearchQuery] = useState('');

  // Forms
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [formSubject, setFormSubject] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('feature');
  
  // Toast
  const [toast, setToast] = useState({ show: false, message: '' });

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    if (activeTab === 'feedback') loadFeedback();
    if (activeTab === 'tickets' && user) loadTickets();
  }, [activeTab, user]);

  // --- REALTIME SYNC ENGINE ---
  useEffect(() => {
    if (!user) return;

    // 1. Channel für Tickets (Persönliche Updates)
    const ticketChannel = supabase
      .channel('ticket-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${user.id}`, // Nur eigene Tickets hören
        },
        (payload) => {
          setMyTickets((prev) => 
            prev.map((ticket) => 
              ticket.id === payload.new.id ? { ...ticket, ...payload.new } : ticket
            )
          );
          
          if (payload.new.status !== payload.old.status || payload.new.admin_response !== payload.old.admin_response) {
             setToast({ show: true, message: 'Ticket Status Updated!' });
          }
        }
      )
      .subscribe();

    // 2. Channel für Roadmap (Globale Updates)
    const feedbackChannel = supabase
      .channel('roadmap-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'feedback_posts' },
        (payload) => {
          setFeedbackList((prev) => 
            prev.map((item) => 
              item.id === payload.new.id ? { ...item, ...payload.new } : item
            ).sort((a, b) => b.upvotes_count - a.upvotes_count)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(feedbackChannel);
    };
  }, [user]);

  // --- DATA LOADING ---
  const loadFeedback = async () => {
    setLoading(true);
    const { data: posts, error } = await supabase
      .from('feedback_posts')
      .select('*')
      .order('upvotes_count', { ascending: false });
    
    if (error) console.error(error);

    let processedPosts = posts || [];
    if (user && posts) {
      const { data: votes } = await supabase.from('upvotes').select('post_id').eq('user_id', user.id);
      const votedIds = new Set(votes?.map(v => v.post_id));
      processedPosts = posts.map(p => ({ ...p, user_has_voted: votedIds.has(p.id) }));
    }
    
    // Sortierung sicherstellen
    processedPosts.sort((a, b) => b.upvotes_count - a.upvotes_count);
    
    setFeedbackList(processedPosts as any);
    setLoading(false);
  };

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setMyTickets(data);
    setLoading(false);
  };

  // --- ACTIONS ---
  const handleUpvote = async (postId: string, hasVoted: boolean) => {
    if (!user) {
        setToast({ show: true, message: 'Login required to vote' });
        return;
    }
    
    const currentItem = feedbackList.find(p => p.id === postId);
    if (!currentItem) return;

    const newCount = hasVoted 
        ? Math.max(0, currentItem.upvotes_count - 1) 
        : currentItem.upvotes_count + 1;

    setFeedbackList(prev => {
        const updatedList = prev.map(p => {
            if (p.id !== postId) return p;
            return { 
                ...p, 
                upvotes_count: newCount,
                user_has_voted: !hasVoted
            };
        });
        return updatedList.sort((a, b) => b.upvotes_count - a.upvotes_count);
    });

    try {
        if (hasVoted) {
            await supabase.from('upvotes').delete().match({ user_id: user.id, post_id: postId });
        } else {
            await supabase.from('upvotes').insert({ user_id: user.id, post_id: postId });
        }

        const { error } = await supabase
            .from('feedback_posts')
            .update({ upvotes_count: newCount })
            .eq('id', postId);

        if (error) throw error;

    } catch (e) {
        console.error("Vote Sync Error:", e);
        setToast({ show: true, message: 'Vote failed. Please try again.' });
        loadFeedback(); 
    }
  };

  const submitFeedback = async () => {
    if (!user) return;
    if (!formSubject || !formContent) return alert("Fields required");
    
    const { error } = await supabase.from('feedback_posts').insert({
      user_id: user.id,
      title: formSubject,
      content: formContent,
      category: formCategory,
      upvotes_count: 0 
    });

    if (!error) {
      setShowFeedbackModal(false);
      setFormSubject(''); setFormContent('');
      setToast({ show: true, message: 'Request submitted to roadmap!' });
      loadFeedback();
    }
  };

  const submitTicket = async () => {
    if (!user) return;
    if (!formSubject || !formContent) return alert("Fields required");

    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      subject: formSubject,
      message: formContent,
      status: 'open'
    });

    if (!error) {
      setShowTicketModal(false);
      setFormSubject(''); setFormContent('');
      setToast({ show: true, message: 'Priority Ticket Created' });
      loadTickets();
    }
  };

  // --- SOTA FIX: EXPANDED FAQ DATA ---
  const faqItems = useMemo(() => [
    { 
        q: "Who analyzes the players?", 
        a: "Our proprietary 'Alpha Engine' AI analyzes every player. It uses advanced computer vision to break down technique, biometrics, and movement patterns from thousands of match hours. This raw data is processed to generate comprehensive scouting reports, including strengths, weaknesses, mental game assessments, and our signature Skill Ratings." 
    },
    { 
        q: "How does the subscription & payment work?", 
        a: "We use Lemon Squeezy as our secure Merchant of Record. You can pay via Credit Card, PayPal, or Apple/Google Pay. Once subscribed, your plan renews automatically based on your chosen interval (Weekly, Monthly, Yearly)." 
    },
    { 
        q: "Can I cancel my subscription anytime?", 
        a: "Yes! You have full control. You can cancel your subscription at any time with a single click inside your Account/Dashboard settings. Your premium access will simply remain active until the end of your currently paid billing cycle." 
    },
    { 
        q: "Do you offer refunds or a money-back guarantee?", 
        a: "Due to the digital nature of our real-time AI data and immediate access to proprietary value picks, all sales are final. We do not offer refunds. We encourage new users to utilize our free tools or shorter-term passes to evaluate the platform before committing long-term." 
    },
    { 
        q: "What does '+EV' mean?", 
        a: "Positive Expected Value. It implies our model calculates the probability of a player winning is mathematically higher than what the bookmaker's implied odds suggest." 
    },
    { 
        q: "How are the AI skill ratings calculated?", 
        a: "We process over 50 data points per match using computer vision to analyze shot velocity, placement, and error rates. These are normalized against tour averages to create the 0-99 rating scale." 
    },
    { 
        q: "Can I publish news or add player reports?", 
        a: "Yes! We thrive on community intelligence. If you are a scout or analyst, you can apply for contributor access. Simply open a Support Ticket, email us at bh.dtl@web.de, or DM us on X (@backhandtl)." 
    }
  ].filter(item => 
    item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.a.toLowerCase().includes(searchQuery.toLowerCase())
  ), [searchQuery]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 pb-32">
      <Toast message={toast.message} show={toast.show} onClose={() => setToast({ ...toast, show: false })} />

      {/* HERO HEADER */}
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4">
          {t('support.titlePart1', 'Mission')} <span className="text-tennis-lime">{t('support.titlePart2', 'Control')}</span>
        </h1>
        <p className="text-gray-400 font-medium max-w-xl mx-auto text-sm md:text-base px-4">
          {t('support.subtitle', 'Access documentation, shape the roadmap, or contact high-priority support.')}
        </p>
      </div>

      {/* NAVIGATION PILL */}
      <div className="flex justify-center mb-8 md:mb-12">
        <div className="bg-[#15171e] p-1.5 rounded-2xl border border-white/10 flex gap-1 shadow-2xl overflow-x-auto max-w-full no-scrollbar">
          {[
            { id: 'hub', label: t('support.tabs.hub', 'Help Hub'), icon: LifeBuoy },
            { id: 'feedback', label: t('support.tabs.feedback', 'Roadmap'), icon: ThumbsUp },
            { id: 'tickets', label: t('support.tabs.tickets', 'My Tickets'), icon: MessageSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white text-black shadow-lg' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={14} strokeWidth={3} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* --- TAB 1: HELP HUB (FAQ) --- */}
        {activeTab === 'hub' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 max-w-3xl mx-auto">
            <div className="bg-[#1a1d26] rounded-2xl border border-white/5 p-6 md:p-8 text-center mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><LifeBuoy size={120} className="text-white"/></div>
              <h3 className="text-white font-black uppercase text-xl mb-2 relative z-10">Instant Answers</h3>
              <p className="text-gray-500 text-sm mb-6 relative z-10">Search our knowledge base or browse common topics.</p>
              <div className="relative group max-w-md mx-auto z-10">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-tennis-lime transition-colors" size={18} />
                <input 
                    placeholder="Search keywords..." 
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:border-tennis-lime outline-none transition-all font-medium placeholder-gray-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
                {faqItems.length === 0 && <div className="text-center text-gray-500 py-8 italic">No matching results found.</div>}
                {faqItems.map((faq, idx) => (
                <div key={idx} className="bg-[#15171e] rounded-xl border border-white/5 overflow-hidden group hover:border-white/10 transition-colors">
                    <details className="group">
                    <summary className="flex items-center justify-between p-5 md:p-6 cursor-pointer list-none select-none">
                        <span className="font-bold text-gray-200 group-hover:text-tennis-lime transition-colors text-sm md:text-base pr-4">{faq.q}</span>
                        <ChevronDown size={16} className="text-gray-500 group-open:rotate-180 transition-transform shrink-0" />
                    </summary>
                    <div className="px-5 md:px-6 pb-6 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                        {faq.a}
                    </div>
                    </details>
                </div>
                ))}
            </div>
            
            <div className="mt-8 text-center">
                <p className="text-gray-600 text-xs font-medium uppercase tracking-widest mb-2">Still blocked?</p>
                <div className="flex justify-center gap-4">
                    <a href="mailto:bh.dtl@web.de" className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors border border-white/5 hover:border-white/20"><Mail size={12}/> Email Support</a>
                    <a href="https://x.com/backhandtl" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors border border-white/5 hover:border-white/20"><Twitter size={12}/> X / Twitter</a>
                </div>
            </div>
          </motion.div>
        )}

        {/* --- TAB 2: ROADMAP (FEEDBACK) --- */}
        {activeTab === 'feedback' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-black text-white uppercase italic">Community Roadmap</h2>
                <p className="text-gray-500 text-xs mt-1">Vote on features you want to see next.</p>
              </div>
              <button onClick={() => setShowFeedbackModal(true)} className="w-full md:w-auto bg-tennis-lime text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-tennis-lime/10">
                <Plus size={14} strokeWidth={3} /> Suggest Feature
              </button>
            </div>

            {loading ? <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-tennis-lime" /></div> : (
              <div className="grid gap-4">
                {feedbackList.map((item) => (
                  <div key={item.id} className="bg-[#15171e] p-5 md:p-6 rounded-2xl border border-white/5 flex gap-4 md:gap-6 group hover:border-white/10 transition-all">
                    <button 
                      onClick={() => handleUpvote(item.id, item.user_has_voted || false)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all h-fit min-w-[50px] md:min-w-[60px] active:scale-95 ${item.user_has_voted ? 'bg-tennis-lime border-tennis-lime text-black' : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/20'}`}
                    >
                      <ChevronUp size={20} strokeWidth={3} />
                      <span className="font-black text-lg">{item.upvotes_count}</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border whitespace-nowrap ${
                          item.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                          item.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          item.status === 'planned' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                          'bg-gray-500/10 text-gray-500 border-white/10'
                        }`}>
                          {item.status}
                        </span>
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest truncate">{item.category}</span>
                      </div>
                      <h3 className="text-base md:text-lg font-bold text-white mb-1 leading-tight">{item.title}</h3>
                      <p className="text-gray-400 text-xs md:text-sm leading-relaxed line-clamp-2 md:line-clamp-none">{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* --- TAB 3: TICKETS (PRIVATE) --- */}
        {activeTab === 'tickets' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-[#1a1d26] to-black rounded-3xl border border-white/10 p-8 text-center mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 p-10 opacity-5 pointer-events-none"><Shield size={120} className="text-white"/></div>
              <h3 className="text-white font-black uppercase text-xl mb-2 relative z-10">Priority Support</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto relative z-10">Issues with billing, data access, or account security? Our engineering team responds within 24 hours.</p>
              <button onClick={() => setShowTicketModal(true)} className="bg-white text-black px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center gap-2 mx-auto relative z-10 shadow-xl">
                <MessageSquare size={14} strokeWidth={3} /> Open New Ticket
              </button>
            </div>

            <div className="space-y-4">
              {myTickets.length === 0 ? (
                <div className="text-center text-gray-600 text-xs font-bold uppercase tracking-widest py-10 border border-dashed border-white/10 rounded-2xl">No active tickets</div>
              ) : (
                myTickets.map(ticket => (
                  <div key={ticket.id} className="bg-[#15171e] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-2">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-bold text-white text-lg">{ticket.subject}</h4>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border self-start md:self-center ${
                        ticket.status === 'open' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-800 text-gray-400 border-white/10'
                      }`}>{ticket.status}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4 bg-black/20 p-4 rounded-xl">{ticket.message}</p>
                    {ticket.admin_response && (
                      <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl ml-0 md:ml-4 relative animate-in fade-in slide-in-from-top-2">
                        <div className="absolute -left-2 top-4 w-2 h-2 bg-blue-500/20 rotate-45 border-l border-t border-blue-500/10 hidden md:block"></div>
                        <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-2"><CheckCircle2 size={10}/> Support Team Response</div>
                        <p className="text-gray-300 text-sm">{ticket.admin_response}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS (Mobile Optimized) */}
      {(showFeedbackModal || showTicketModal) && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0" onClick={() => { setShowFeedbackModal(false); setShowTicketModal(false); }}></div>
          <div className="relative bg-[#1a1d26] w-full max-w-lg rounded-t-[2rem] md:rounded-3xl border-t md:border border-white/10 p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 overflow-hidden">
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 md:hidden"></div>
            <h3 className="text-2xl font-black text-white uppercase italic mb-6">
              {showFeedbackModal ? 'Propose Feature' : 'Submit Ticket'}
            </h3>
            
            <div className="space-y-4">
              {showFeedbackModal && (
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Category</label>
                  <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-tennis-lime outline-none appearance-none cursor-pointer">
                    <option value="feature">Feature Request</option>
                    <option value="bug">Bug Report</option>
                    <option value="data">Data Accuracy</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Subject</label>
                <input value={formSubject} onChange={e => setFormSubject(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-tennis-lime outline-none font-bold placeholder-gray-600" placeholder="Short title..." />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Details</label>
                <textarea value={formContent} onChange={e => setFormContent(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-tennis-lime outline-none h-32 resize-none placeholder-gray-600" placeholder="Describe in detail..." />
              </div>
              
              <div className="flex gap-3 mt-6 pb-safe">
                <button onClick={showFeedbackModal ? submitFeedback : submitTicket} className="flex-1 bg-white text-black py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 active:scale-95 transition-transform">Submit</button>
                <button onClick={() => { setShowFeedbackModal(false); setShowTicketModal(false); }} className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 active:scale-95 transition-transform">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}