import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner'; // 🚀 SOTA FIX: Moderne Toasts statt alter alerts!
import { 
  Users, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Search,
  Activity,
  Wallet,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface Partner {
  id: string;
  ls_discount_code: string;
  commission_rate: number;
  paypal_email?: string; // Fallback für alte DB-Einträge
  payout_method?: string; // 🚀 NEU: 'paypal' oder 'iban'
  payout_details?: string; // 🚀 NEU: Die tatsächliche E-Mail oder IBAN
  total_earned: number;
  total_paid: number;
  status: 'pending' | 'active' | 'rejected';
  audience_url: string;
  created_at: string;
}

export function AdminPartnerManager() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Setup Live-Daten
  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to fetch partners");
    } else {
      setPartners(data || []);
    }
    setLoading(false);
  };

  // --- ACTIONS ---
  
  const updatePartnerStatus = async (id: string, newStatus: 'active' | 'rejected') => {
    // Optimistic UI Update
    setPartners(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    
    const { error } = await supabase
      .from('partners')
      .update({ status: newStatus })
      .eq('id', id);
      
    if (error) {
      toast.error("Error updating status"); // 🚀 SOTA FIX: Toasts statt Alerts
      fetchPartners(); // Rollback bei Fehler
    } else if (newStatus === 'active') {
      toast.success("Partner approved!", {
        description: "IMPORTANT: Don't forget to create the discount code in Lemon Squeezy now."
      });
    } else {
      toast.info(`Partner application ${newStatus}.`);
    }
  };

  const markAsPaid = async (partner: Partner) => {
    const pendingAmount = partner.total_earned - partner.total_paid;
    if (pendingAmount <= 0) return;

    // 🚀 SOTA FIX: Dynamisches Wording basierend auf der Payout-Methode
    const methodStr = partner.payout_method === 'iban' ? 'Bank (IBAN)' : 'PayPal';
    const detailStr = partner.payout_details || partner.paypal_email || 'Unknown Details';
    
    const confirmMsg = `Confirm payout of €${pendingAmount.toFixed(2)} to ${detailStr} via ${methodStr}?`;
    if (!window.confirm(confirmMsg)) return;

    const newTotalPaid = partner.total_earned; // Nach Auszahlung ist alles bezahlt

    setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, total_paid: newTotalPaid } : p));

    const { error } = await supabase
      .from('partners')
      .update({ total_paid: newTotalPaid })
      .eq('id', partner.id);

    if (error) {
      toast.error("Error updating payout status");
      fetchPartners();
    } else {
      toast.success(`Payout of €${pendingAmount.toFixed(2)} marked as completed!`);
    }
  };

  // --- METRIKEN BERECHNEN ---
  const pendingCount = partners.filter(p => p.status === 'pending').length;
  const activeCount = partners.filter(p => p.status === 'active').length;
  const totalLiability = partners.reduce((acc, p) => acc + (p.total_earned - p.total_paid), 0);

  // --- FILTER ---
  const displayedPartners = partners
    .filter(p => p.status === activeTab)
    .filter(p => 
      p.ls_discount_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
      // 🚀 SOTA FIX: Suche durchsucht jetzt auch die neuen payout_details Felder
      (p.payout_details || p.paypal_email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="w-full bg-[#0f1115] min-h-screen text-white font-sans">
      <Toaster theme="dark" position="bottom-right" /> {/* 🚀 SOTA FIX: Toaster Container */}
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        
        {/* HEADER & METRICS */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-tennis-lime/10 rounded-xl border border-tennis-lime/20">
              <ShieldCheck className="text-tennis-lime" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">Partner Network Hub</h1>
              <p className="text-gray-500 font-medium text-sm tracking-wide">Manage affiliates, applications and payouts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1a1d26] border border-white/5 p-6 rounded-[1.5rem] shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Pending Applications</p>
                <Clock size={16} className="text-yellow-500" />
              </div>
              <p className="text-3xl font-black">{pendingCount}</p>
            </div>
            <div className="bg-[#1a1d26] border border-white/5 p-6 rounded-[1.5rem] shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Active Partners</p>
                <Activity size={16} className="text-tennis-lime" />
              </div>
              <p className="text-3xl font-black">{activeCount}</p>
            </div>
            <div className="bg-[#1a1d26] border border-white/5 p-6 rounded-[1.5rem] shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-500/10 blur-xl rounded-full" />
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total Liability (Unpaid)</p>
                <Wallet size={16} className="text-red-400" />
              </div>
              <p className="text-3xl font-black text-white">€{totalLiability.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* CONTROLS (TABS & SEARCH) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex bg-[#1a1d26] p-1.5 rounded-full border border-white/5 shadow-inner">
            {(['pending', 'active', 'rejected'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-white/10 text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab} {tab === 'pending' && pendingCount > 0 && `(${pendingCount})`}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text"
              placeholder="Search code or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1d26] border border-white/5 rounded-full py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-tennis-lime transition-colors"
            />
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-[#1a1d26] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-20 text-center text-gray-500 font-mono text-sm uppercase tracking-widest animate-pulse">
              Syncing Partner Data...
            </div>
          ) : displayedPartners.length === 0 ? (
            <div className="p-20 text-center">
              <Users size={40} className="text-gray-600 mx-auto mb-4" />
              <h3 className="text-white font-bold mb-1">No {activeTab} partners found</h3>
              <p className="text-gray-500 text-sm">Waiting for new applications.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#12141a]/80 border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  <tr>
                    <th className="px-6 py-5">Requested Code</th>
                    <th className="px-6 py-5">Audience Link</th>
                    <th className="px-6 py-5">Contact / Payout</th>
                    {activeTab === 'active' && (
                      <th className="px-6 py-5 text-right">Financials</th>
                    )}
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence>
                    {displayedPartners.map(partner => {
                      const pendingPayout = partner.total_earned - partner.total_paid;
                      
                      return (
                        <motion.tr 
                          key={partner.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-6 py-5">
                            <span className="font-mono text-white font-bold bg-white/5 px-2 py-1 rounded-md border border-white/10">
                              {partner.ls_discount_code}
                            </span>
                            <div className="text-[10px] text-gray-600 mt-2">
                              Joined: {new Date(partner.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <a 
                              href={partner.audience_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              View Channel <ExternalLink size={12} />
                            </a>
                          </td>
                          <td className="px-6 py-5">
                            {/* 🚀 SOTA FIX: Rendering der Payout Details je nach Methode */}
                            <div className="text-sm text-gray-300 font-medium">
                                {partner.payout_details || partner.paypal_email || 'No details provided'}
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1 flex items-center gap-1.5">
                                {partner.payout_method === 'iban' ? (
                                    <span className="text-emerald-400 font-bold">IBAN</span>
                                ) : (
                                    <span className="text-blue-400 font-bold">PAYPAL</span>
                                )}
                                <span>• 30% Comm. Rate</span>
                            </div>
                          </td>
                          
                          {activeTab === 'active' && (
                            <td className="px-6 py-5 text-right">
                              <div className="text-sm font-black text-white">€{partner.total_earned.toFixed(2)} Earned</div>
                              <div className={`text-xs font-bold mt-1 ${pendingPayout > 0 ? 'text-tennis-lime' : 'text-gray-600'}`}>
                                €{pendingPayout.toFixed(2)} Pending
                              </div>
                            </td>
                          )}

                          <td className="px-6 py-5 text-right">
                            {activeTab === 'pending' && (
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => updatePartnerStatus(partner.id, 'rejected')}
                                  className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                  title="Reject"
                                >
                                  <XCircle size={18} />
                                </button>
                                <button 
                                  onClick={() => updatePartnerStatus(partner.id, 'active')}
                                  className="px-4 py-2 rounded-xl bg-tennis-lime text-black font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform"
                                >
                                  Approve
                                </button>
                              </div>
                            )}

                            {activeTab === 'active' && (
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => markAsPaid(partner)}
                                  disabled={pendingPayout <= 0}
                                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-30 disabled:pointer-events-none"
                                >
                                  Mark as Paid
                                </button>
                              </div>
                            )}

                            {activeTab === 'rejected' && (
                              <button 
                                onClick={() => updatePartnerStatus(partner.id, 'active')}
                                className="text-xs text-gray-500 hover:text-white underline decoration-dashed transition-colors"
                              >
                                Restore
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Info Box */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
            <AlertCircle className="text-blue-400 shrink-0" size={18} />
            <p className="text-xs text-blue-200/70 leading-relaxed font-medium">
              <strong>Workflow Note:</strong> When you approve a partner here, you must still log into your Lemon Squeezy Dashboard and manually create the Discount Code (e.g. 10% OFF) with their requested code name. Only then will the tracking work.
            </p>
        </div>

      </div>
    </div>
  );
}

export default AdminPartnerManager;