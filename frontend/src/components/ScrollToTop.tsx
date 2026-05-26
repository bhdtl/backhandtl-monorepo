import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Button zeigen, wenn mehr als 300px gescrollt wurde
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-24 right-4 z-50 p-3 rounded-full 
        bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-2xl 
        transition-all duration-500 ease-out transform
        hover:bg-tennis-lime hover:text-black hover:scale-110 hover:border-tennis-lime
        active:scale-95 group
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}
      `}
      aria-label="Scroll to top"
    >
      <ArrowUp size={20} className="group-hover:-translate-y-1 transition-transform duration-300" />
    </button>
  );
}