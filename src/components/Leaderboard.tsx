
import React from 'react';
import { Player, getRankFromAccuracy } from '../types';

interface LeaderboardProps {
  players: Player[];
  humanId: string;
  isSolo: boolean;
  isHost?: boolean;
  onNext: () => void;
  questionsAnswered?: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ players, humanId, isSolo, isHost = false, onNext, questionsAnswered = 1 }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  console.log('Leaderboard - Original players:', players.map(p => ({ name: p.name, score: p.score })));
  console.log('Leaderboard - Sorted players:', sortedPlayers.map(p => ({ name: p.name, score: p.score })));
  const player = players.find(p => p.id === humanId);
  
  // Calculate player rank based on performance
  // Max possible score: 1000 points per question (assuming standard scoring)
  const maxPossibleScore = 1000 * questionsAnswered;
  const accuracy = player ? Math.min(100, Math.max(0, (player.score / maxPossibleScore) * 100)) : 0;
  const playerRank = getRankFromAccuracy(accuracy);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-[#020617] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,#1e1b4b_0%,#020617_60%)]"></div>

      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black mb-4 sm:mb-6 md:mb-8 lg:mb-16 drop-shadow-xl text-white z-10 tracking-tighter uppercase px-4">
        {isSolo ? "Level Analysis" : "Leaderboard"}
      </h2>
      
      <div className="w-full max-w-3xl z-10 px-3 sm:px-4">
        {isSolo ? (
          <div className="glass p-4 sm:p-6 md:p-10 lg:p-16 rounded-2xl sm:rounded-3xl md:rounded-[4rem] border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-4 -right-4 opacity-5">
                  <i className="bi bi-stack text-[80px] sm:text-[120px] md:text-[200px] text-white"></i>
              </div>
              <div className="text-[9px] sm:text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-2 sm:mb-3 md:mb-4">Score</div>
              <div className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black mb-4 sm:mb-6 md:mb-8 lg:mb-12 text-white drop-shadow-2xl">{player?.score.toLocaleString()}</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8 border-t border-white/10 pt-4 sm:pt-6 md:pt-8 lg:pt-12">
                  <div className="glass p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl lg:rounded-3xl border-white/5 flex flex-col items-center gap-2 sm:gap-3">
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 sm:mb-1">Max Streak</div>
                      <div className="text-2xl sm:text-3xl md:text-4xl font-black text-orange-500 flex items-center gap-2">
                        <i className="bi bi-fire"></i> {player?.streak}
                      </div>
                  </div>
                  <div className="glass p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl lg:rounded-3xl border-white/5 flex flex-col items-center gap-2 sm:gap-3">
                      <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 sm:mb-1">Player Rank</div>
                      <div className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-400 uppercase tracking-widest">{playerRank}</div>
                  </div>
              </div>
          </div>
        ) : (
          <div className="glass p-3 sm:p-4 md:p-6 lg:p-10 rounded-2xl sm:rounded-2xl md:rounded-3xl lg:rounded-[3rem] border-white/5 shadow-2xl space-y-2 sm:space-y-3">
            {sortedPlayers.slice(0, 5).map((p, index) => (
              <div 
                  key={p.id} 
                  className={`flex items-center justify-between p-2.5 sm:p-3 md:p-4 lg:p-6 rounded-lg sm:rounded-xl md:rounded-2xl transition-all relative ${
                      p.id === humanId ? 'bg-indigo-600/20 ring-2 ring-indigo-500/50 scale-[1.03]' : 'bg-white/5'
                  }`}
              >
                <div className="flex items-center gap-3 sm:gap-4 md:gap-6 text-left">
                  <span className="text-2xl sm:text-3xl font-black opacity-10 w-6 sm:w-8">{index + 1}</span>
                  <div>
                    <div className="text-base sm:text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2 sm:gap-3">
                      {p.name}
                      {/* Connection indicator */}
                      {!p.isBot && (
                        <div className={`w-2 h-2 rounded-full ${
                          p.connected !== false ? 'bg-emerald-500' : 'bg-red-500'
                        }`} title={p.connected !== false ? 'Connected' : 'Disconnected'}></div>
                      )}
                    </div>
                    {p.streak >= 3 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-orange-400 font-black tracking-widest mt-1">
                          <i className="bi bi-fire"></i> CHAIN x{p.streak}
                        </div>
                    )}
                  </div>
                </div>
                <div className="text-2xl sm:text-2xl md:text-3xl font-black text-white font-mono">{p.score.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(isHost || isSolo) ? (
        <button 
          onClick={onNext}
          className="mt-16 bg-white text-slate-950 px-20 py-6 rounded-full text-2xl font-black shadow-2xl transition-all hover:scale-105 active:scale-95 z-10"
        >
          {isSolo ? 'Next Question' : 'Continue'}
        </button>
      ) : (
        <p className="mt-16 text-slate-500 font-bold uppercase tracking-[0.4em] animate-pulse">
          Waiting for host...
        </p>
      )}
    </div>
  );
};

export default Leaderboard;
