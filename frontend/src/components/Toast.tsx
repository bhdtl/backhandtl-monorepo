import { CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

interface ToastProps {
  message: string;
  show: boolean;
  onClose: () => void;
}

export function Toast({ message, show, onClose }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in">
      <div className="bg-tennis-green text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 border-2 border-tennis-lime">
        <CheckCircle size={24} className="text-tennis-lime" />
        <span className="font-semibold">{message}</span>
      </div>
    </div>
  );
}
