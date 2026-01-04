
import React, { useState } from 'react';
import { User } from '../types';

interface HomeProps {
  user: User | null;
  onStart: () => void;
  onSolo: () => void;
  onJoin: (name: string) => void;
}

const Home: React.FC<HomeProps> = ({ user, onStart, onSolo, onJoin }) => {
  const [name, setName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinClusterClick = () => {
    if (user) {
      // Authenticated user: skip nickname prompt and use their username
      onJoin(user.username);
    } else {
      // Guest user: show nickname input form
      setIsJoining(true);
    }
  };

  const handleNicknameSubmit = () => {
    if (name.trim()) {
      onJoin(name.trim());
      setIsJoining(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      <div className="absolute top-[20%] right-[-10%] w-64 sm:w-96 h-64 sm:h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-[-10%] w-64 sm:w-96 h-64 sm:h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="mb-8 sm:mb-16 text-center z-10">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-indigo-500/20 text-indigo-400 text-[9px] sm:text-[10px] font-black tracking-[0.3em] uppercase mb-4 sm:mb-6">
            <i className="bi bi-lightning-charge-fill"></i> Version 1.0
        </div>
        <h1 className="text-5xl sm:text-7xl md:text-9xl font-black tracking-tighter text-white drop-shadow-[0_0_40px_rgba(56,189,248,0.1)]">
          QUIZ<span style={{ background: 'linear-gradient(to right, #60a5fa, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>LY</span>
        </h1>
        <p className="text-slate-400 text-base sm:text-xl font-medium mt-2 sm:mt-4 px-4">AI-powered knowledge exploration.</p>
      </div>

      <div className="w-full max-w-md z-10 space-y-3 sm:space-y-4">
        {!isJoining ? (
          <>
            <button 
              onClick={onSolo}
              className="w-full group glass border-white/5 hover:border-indigo-500/50 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] flex items-center justify-between transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/20 active:scale-95"
            >
              <div className="flex items-center gap-3 sm:gap-5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:rotate-6 group-hover:scale-110 transition-all duration-300 ease-out">
                      <i className="bi bi-play-fill text-2xl sm:text-3xl"></i>
                  </div>
                  <div className="text-left">
                      <div className="text-lg sm:text-xl font-black text-white">Solo Mode</div>
                      <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Single Player</div>
                  </div>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-white group-hover:bg-indigo-500 transition-all duration-300 ease-out group-hover:translate-x-1">
                  <i className="bi bi-chevron-right text-sm sm:text-base"></i>
              </div>
            </button>

            <button 
              onClick={handleJoinClusterClick}
              className="w-full group glass border-white/5 hover:border-blue-500/50 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] flex items-center justify-between transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20 active:scale-95"
            >
              <div className="flex items-center gap-3 sm:gap-5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:rotate-6 group-hover:scale-110 transition-all duration-300 ease-out">
                      <i className="bi bi-people-fill text-xl sm:text-2xl"></i>
                  </div>
                  <div className="text-left">
                      <div className="text-lg sm:text-xl font-black text-white">Join Game</div>
                      <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Multiplayer</div>
                  </div>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-white group-hover:bg-blue-500 transition-all duration-300 ease-out group-hover:translate-x-1">
                  <i className="bi bi-chevron-right text-sm sm:text-base"></i>
              </div>
            </button>

            {!user && (
              <button 
                onClick={onStart}
                className="w-full text-slate-500 font-bold hover:text-white transition-colors text-[10px] uppercase tracking-[0.4em] pt-8"
              >
                Access Account to Save Progress
              </button>
            )}
          </>
        ) : (
          <div className="glass p-8 rounded-[2rem] border-white/10 space-y-5 animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-xs font-black text-slate-400 tracking-[0.3em] mb-2 uppercase">Enter Name</h3>
            <input 
              type="text" 
              placeholder="Your Nickname" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-bold text-xl focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNicknameSubmit()}
            />
            <button 
              onClick={handleNicknameSubmit}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black py-5 rounded-2xl text-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-30"
              disabled={!name.trim()}
            >
              CONTINUE
            </button>
            <button 
              onClick={() => setIsJoining(false)}
              className="w-full text-slate-500 font-bold hover:text-slate-300 transition-colors text-xs uppercase tracking-widest pt-2"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="mt-20 flex items-center gap-4 text-slate-700 font-black text-[10px] uppercase tracking-[0.5em] opacity-40">
        <span>EST. 2026</span>
        <i className="bi bi-dot"></i>
        <span>Quizly</span>
      </div>
    </div>
  );
};

export default Home;
