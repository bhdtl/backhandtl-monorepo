import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: any;
}

export function SearchableSelect({ options, value, onChange, placeholder, icon: Icon }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Schließt das Menü beim Klick außerhalb
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Optionen filtern
  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Der Button (sieht aus wie ein Select) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-[#15171e] border rounded-xl flex items-center justify-between transition-all ${isOpen ? 'border-tennis-lime ring-1 ring-tennis-lime' : 'border-white/10 hover:border-white/20'}`}
      >
        <span className={`text-sm truncate flex items-center gap-2 ${value ? 'text-white font-medium' : 'text-gray-400'}`}>
           {Icon && <Icon size={14} className={value ? "text-tennis-lime" : "text-gray-500"}/>}
           {value || placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Das Dropdown Menü */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#1a1d26] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Suchfeld INNERHALB des Dropdowns */}
          <div className="p-2 border-b border-white/5 bg-[#15171e]">
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                <input 
                    autoFocus
                    type="text" 
                    placeholder="Search list..." 
                    className="w-full bg-black/20 text-white text-xs pl-8 pr-2 py-2 rounded-lg border border-white/5 focus:outline-none focus:border-tennis-lime placeholder-gray-600"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>

          {/* Scrollbare Liste */}
          <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
            <button
                onClick={() => { onChange(''); setIsOpen(false); setSearchTerm(''); }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-colors mb-1"
            >
                Any / Reset
            </button>
            
            {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-gray-600">No results found</div>
            ) : (
                filteredOptions.map((option) => (
                <button
                    key={option}
                    onClick={() => { onChange(option); setIsOpen(false); setSearchTerm(''); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex justify-between items-center ${value === option ? 'bg-tennis-lime/10 text-tennis-lime font-bold' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                >
                    {option}
                    {value === option && <span className="w-1.5 h-1.5 rounded-full bg-tennis-lime"></span>}
                </button>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}