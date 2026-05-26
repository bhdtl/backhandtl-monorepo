import { useState, useEffect, useRef } from 'react';
import { Bell, LifeBuoy, Briefcase, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAccess } from '../hooks/useAccess';

export function AdminNotificationWidget({ isMobile = false }: { isMobile?: boolean }) {
  const { isAdmin } = useAccess();
  
  const [isOpen, setIsOpen] = useState(false);
  const [openTickets, setOpenTickets] = useState(0);
  const [pendingPartners, setPendingPartners] = useState(0);
  const [pendingFeedback, setPendingFeedback] = useState(0);
  
  const [isBouncing, setIsBouncing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchCounts = async () => {
      try {
        const { count: ticketsCount } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');
        const { count: feedbackCount } = await supabase.from('feedback_posts').select('*', { count: 'exact', head: true }).eq('status', 'under-review');
        const { count: partnerCount } = await supabase.from('partner_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending');

        setOpenTickets(ticketsCount || 0);
        setPendingFeedback(feedbackCount || 0);
        setPendingPartners(partnerCount || 0);
      } catch (error) { console.error(error); }
    };

    fetchCounts();

    const channels = [
      supabase.channel('notif-tickets').on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => { fetchCounts(); triggerBounce(); }).subscribe(),
      supabase.channel('notif-feedback').on('postgres_changes', { event: '*', schema: 'public', table: 'feedback_posts' }, () => { fetchCounts(); triggerBounce(); }).subscribe(),
      supabase.channel('notif-partners').on('postgres_changes', { event: '*', schema: 'public', table: 'partner_applications' }, () => { fetchCounts(); triggerBounce(); }).subscribe(),
    ];

    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [isAdmin]);

  const triggerBounce = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 1000);
  };

  // 🚀 ABSOLUTE SICHERHEIT: Wenn du kein Admin bist, rendert React NICHTS (null). Es existiert nicht im HTML.
  if (!isAdmin) return null;

  const totalNotifications = openTickets + pendingPartners + pendingFeedback;

  // --- DAS INNERE MENÜ (Jetzt im edlen Liquid-Glass Design) ---
  const DropdownMenu = () => (
    <>
      <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex justify-between items-center rounded-t-2xl backdrop-blur-md">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Command Center</span>
        {totalNotifications > 0 && <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-400 text-[9px] font-black rounded uppercase shadow-[0_0_10px_rgba(239,68,68,0.2)]">{totalNotifications} Action Req.</span>}
      </div>

      <div className="p-2 space-y-1">
        <a href="/admin?tab=support" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors group">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${openTickets > 0 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-black/40 text-gray-500 border border-white/5'}`}>
              <LifeBuoy size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white uppercase tracking-wide">Tickets</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {openTickets > 0 ? <span className="text-xs font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">{openTickets}</span> : <span className="text-[10px] text-gray-600 font-bold uppercase">Clear</span>}
            <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
          </div>
        </a>

        <a href="/admin?tab=partners" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors group">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${pendingPartners > 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' : 'bg-black/40 text-gray-500 border border-white/5'}`}>
              <Briefcase size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white uppercase tracking-wide">Partners</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingPartners > 0 ? <span className="text-xs font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-md">{pendingPartners}</span> : <span className="text-[10px] text-gray-600 font-bold uppercase">Clear</span>}
            <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
          </div>
        </a>

        <a href="/admin?tab=support" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors group">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${pendingFeedback > 0 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'bg-black/40 text-gray-500 border border-white/5'}`}>
              <AlertCircle size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white uppercase tracking-wide">Feedback</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingFeedback > 0 ? <span className="text-xs font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-md">{pendingFeedback}</span> : <span className="text-[10px] text-gray-600 font-bold uppercase">Clear</span>}
            <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
          </div>
        </a>
      </div>

      <div className="p-2 border-t border-white/10">
        <a href="/admin" className="block w-full py-3 bg-black/40 hover:bg-white/10 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white transition-colors border border-white/5">
          Open Admin
        </a>
      </div>
    </>
  );

  // 🚀 DIE MOBILE VERSION (Schwebender Liquid-Glass Button)
  if (isMobile) {
    return (
      <div className="md:hidden absolute bottom-[90px] left-4 pointer-events-auto z-[100]" ref={wrapperRef}>
        {isOpen && (
          <div className="absolute left-0 bottom-full mb-4 w-64 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-4 duration-200">
            <DropdownMenu />
          </div>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-3 rounded-2xl transition-all duration-300 border shadow-2xl group backdrop-blur-xl
            ${isOpen 
              ? 'bg-tennis-lime/20 text-tennis-lime border-tennis-lime/50 shadow-[0_0_30px_rgba(204,255,0,0.2)]' 
              : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/20 hover:text-white'}
            ${isBouncing ? 'animate-bounce' : ''}
          `}
        >
          <Bell size={20} className={totalNotifications > 0 && !isOpen ? 'animate-pulse text-tennis-lime' : ''} />
          {totalNotifications > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-lg border border-black/50">
              {totalNotifications > 9 ? '9+' : totalNotifications}
            </span>
          )}
        </button>
      </div>
    );
  }

  // 💻 DIE DESKTOP VERSION (Im Header, ebenfalls im Liquid Design)
  return (
    <div className="hidden md:inline-block relative z-50" ref={wrapperRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-2xl transition-all duration-300 border shadow-lg group backdrop-blur-xl
          ${isOpen 
            ? 'bg-tennis-lime/20 text-tennis-lime border-tennis-lime/50 shadow-[0_0_20px_rgba(204,255,0,0.2)]' 
            : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/20 hover:text-white'}
          ${isBouncing ? 'animate-bounce' : ''}
        `}
      >
        <Bell size={20} className={totalNotifications > 0 && !isOpen ? 'animate-pulse text-tennis-lime' : ''} />
        {totalNotifications > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-lg border border-black/50">
            {totalNotifications > 9 ? '9+' : totalNotifications}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-72 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-4 duration-200">
          <DropdownMenu />
        </div>
      )}
    </div>
  );
}