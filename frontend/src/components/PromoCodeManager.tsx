import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Copy, RefreshCw, Tag } from 'lucide-react';

export function PromoCodeManager() {
  const [codes, setCodes] = useState<any[]>([]);
  const [newCode, setNewCode] = useState({ code: '', type: 'credits', value: 5, max_uses: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCodes();
  }, []);

  async function fetchCodes() {
    setLoading(true);
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    if (data) setCodes(data);
    setLoading(false);
  }

  async function createCode() {
    if (!newCode.code) return;
    
    const payload = {
        code: newCode.code.toUpperCase(),
        type: newCode.type,
        value: parseInt(newCode.value.toString()),
        max_uses: newCode.max_uses ? parseInt(newCode.max_uses) : null
    };

    const { error } = await supabase.from('promo_codes').insert([payload]);
    
    if (!error) {
        setNewCode({ code: '', type: 'credits', value: 5, max_uses: '' });
        fetchCodes();
    } else {
        alert('Error creating code: ' + error.message);
    }
  }

  async function deleteCode(id: string) {
      if(!confirm("Delete this code? User usage history remains.")) return;
      await supabase.from('promo_codes').delete().eq('id', id);
      fetchCodes();
  }

  const generateRandom = () => {
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      setNewCode({...newCode, code: `PROMO-${random}`});
  }

  return (
    <div className="bg-[#1a1d26] p-6 rounded-2xl border border-white/5 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-tennis-lime/10 rounded-lg">
            <Tag className="text-tennis-lime" size={24} />
          </div>
          <h3 className="text-xl font-bold text-white">Promo Code Engine</h3>
      </div>

      {/* CREATOR FORM */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 bg-black/20 p-4 rounded-xl border border-white/5">
         <div className="md:col-span-4">
             <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Code Name</label>
             <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={newCode.code} 
                    onChange={e => setNewCode({...newCode, code: e.target.value})}
                    placeholder="e.g. SUMMER2026"
                    className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm uppercase focus:border-tennis-lime outline-none"
                 />
                 <button onClick={generateRandom} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors" title="Generate Random">
                    <RefreshCw size={16} className="text-gray-400"/>
                 </button>
             </div>
         </div>
         
         <div className="md:col-span-3">
             <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Type</label>
             <select 
                value={newCode.type}
                onChange={e => setNewCode({...newCode, type: e.target.value})}
                className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-tennis-lime outline-none"
             >
                 <option value="credits">Credits (Analyses)</option>
                 <option value="trial_days">Premium Days</option>
             </select>
         </div>

         <div className="md:col-span-2">
             <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Value</label>
             <input 
                type="number" 
                value={newCode.value}
                onChange={e => setNewCode({...newCode, value: parseInt(e.target.value)})}
                className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-tennis-lime outline-none"
             />
         </div>

         <div className="md:col-span-3 flex items-end">
             <button onClick={createCode} className="w-full bg-tennis-lime text-black font-bold py-2 rounded-lg hover:opacity-90 flex items-center justify-center gap-2 transition-opacity">
                 <Plus size={16} /> Create Code
             </button>
         </div>
      </div>

      {/* LIST OF CODES */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
              <div className="text-center py-4 text-gray-500 text-sm">Loading codes...</div>
          ) : codes.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">No active codes found.</div>
          ) : (
              codes.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors group">
                      <div className="flex items-center gap-4">
                          <span className="font-mono text-tennis-lime font-bold tracking-wider">{c.code}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${c.type === 'credits' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                              {c.type === 'credits' ? `+${c.value} Credits` : `+${c.value} Days`}
                          </span>
                          {c.max_uses && <span className="text-xs text-gray-500 hidden sm:inline-block">Max Uses: {c.max_uses}</span>}
                      </div>
                      <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigator.clipboard.writeText(c.code)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="Copy"><Copy size={14}/></button>
                          <button onClick={() => deleteCode(c.id)} className="p-1.5 hover:bg-red-500/10 rounded text-gray-400 hover:text-red-500" title="Delete"><Trash2 size={14}/></button>
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
}