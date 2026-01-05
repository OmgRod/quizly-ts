import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  // Close modal on click outside or Esc key
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-200" onClick={handleOverlayClick}>
      <div className="glass w-full max-w-lg p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl shadow-blue-500/10 relative">
        <button
          className="absolute top-4 right-4 text-slate-300 hover:text-white text-2xl font-bold transition-all"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {title && <h2 className="text-xl sm:text-2xl font-black mb-4 text-white drop-shadow-lg">{title}</h2>}
        <div className="text-white text-base sm:text-lg font-medium drop-shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
