
import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface JoinProps {
  onJoin: (pin: string) => Promise<boolean>;
  onBack: () => void;
}

const Join: React.FC<JoinProps> = ({ onJoin, onBack }) => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (pin.length < 6) {
      toast.error('Enter the 6-digit PIN to join.');
      return;
    }
    setLoading(true);
    const success = await onJoin(pin);
    if (!success) {
      toast.error('Game not found. Please check the PIN.');
      setPin("");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-3 sm:px-4">
      <div className="glass p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl md:rounded-[3.5rem] border-white/10 w-full max-w-md space-y-6 sm:space-y-8 md:space-y-10 transition-all animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="w-16 sm:w-18 md:w-20 h-16 sm:h-18 md:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-4xl md:text-5xl mx-auto mb-2 shadow-2xl transition-all font-black bg-blue-500/10 text-blue-400 shadow-blue-500/10">
            #
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tighter uppercase">
            Enter Game PIN
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">
            Join a multiplayer quiz game.
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <input 
            type="tel" 
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="000000" 
            maxLength={6}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/[^0-9]/g, ''));
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={loading}
            className="w-full bg-white/5 border border-white/5 px-2 py-8 rounded-3xl font-black text-5xl text-center focus:outline-none transition-all placeholder:opacity-10 tracking-[0.1em] text-white focus:border-blue-500/50"
            autoFocus
          />
          
          <button 
            onClick={handleSubmit}
            disabled={pin.length < 6 || loading}
            className="w-full font-black py-6 rounded-2xl text-2xl transition-all duration-300 ease-out shadow-xl active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-105"
          >
            {loading ? (
              <i className="bi bi-arrow-repeat animate-spin"></i>
            ) : (
              'JOIN GAME'
            )}
          </button>
        </div>

        <div className="text-center">
          <button onClick={onBack} className="text-slate-700 font-bold hover:text-slate-500 text-[10px] uppercase tracking-[0.5em] transition-all duration-300 ease-out hover:scale-105">
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default Join;
