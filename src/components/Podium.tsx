
import React, { useEffect, useState, useRef } from 'react';
import { Player, User } from '../types';
import { getLevelProgress } from '../utils/leveling';

interface PodiumProps {
  players: Player[];
  humanId: string;
  user: User | null;
  onRestart: () => void;
  onUpdateUser: (user: User) => void;
}

const Podium: React.FC<PodiumProps> = ({ players, humanId, user, onRestart, onUpdateUser }) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const human = players.find(p => p.id === humanId);
  const rank = human ? sorted.findIndex(p => p.id === human.id) + 1 : 0;
  
  const [xpEarned, setXpEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showRewards, setShowRewards] = useState(false);
  const hasUpdated = useRef(false);

  console.log('Podium component rendered', { humanId, userId: user?.id, rank });

  useEffect(() => {
    console.log('Podium useEffect triggered', { human: !!human, user: !!user, hasUpdated: hasUpdated.current });
    // Only run update once per component lifecycle to prevent infinite loop
    if (!human || !user || hasUpdated.current) return;
    
    hasUpdated.current = true;

    // Calculate rewards
    const scoreXp = Math.floor(human.score / 10);
    const rankBonus = rank === 1 ? 500 : rank <= 3 ? 200 : 50;
    const totalXp = scoreXp + rankBonus;
    
    const scoreCoins = Math.floor(human.score / 100);
    const rankCoinBonus = rank === 1 ? 50 : 10;
    const totalCoins = scoreCoins + rankCoinBonus;
    
    setXpEarned(totalXp);
    setCoinsEarned(totalCoins);

    // Rewards are already updated on the server via game end endpoint
    // Just show the animation
    setTimeout(() => setShowRewards(true), 1500);
  }, [human, user?.id, rank]); // Use user.id to stabilize dependency

  const { level, progress, currentXP, nextXP } = user ? getLevelProgress(user.xp) : { level: 1, progress: 0, currentXP: 0, nextXP: 1000 };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center relative overflow-hidden bg-[#020617] animate-in fade-in duration-1000">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#1e1b4b_0%,#020617_70%)] opacity-50"></div>

      <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-black mb-4 sm:mb-8 md:mb-12 lg:mb-20 drop-shadow-xl text-white z-10 tracking-tighter uppercase italic px-4">
        Game Over
      </h1>

      {/* Leaderboard Reveal - Best to Worst */}
      <div className="w-full max-w-3xl z-10 mb-6 sm:mb-8 md:mb-12 lg:mb-16 px-3 sm:px-4">
        <div className="space-y-2 sm:space-y-3">
          {sorted.map((player, index) => {
            const position = index + 1;
            const isHuman = player.id === humanId;
            const delay = index * 150;
            
            return (
              <div
                key={player.id}
                style={{
                  animation: `slideInLeft 0.6s ease-out ${delay}ms forwards`,
                  opacity: 0,
                }}
                className={`glass p-2.5 sm:p-3 md:p-4 lg:p-6 rounded-lg sm:rounded-xl md:rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                  isHuman
                    ? 'border-yellow-500/50 bg-yellow-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-sm sm:text-base ${
                    position === 1 ? 'bg-yellow-500/30 text-yellow-400' :
                    position === 2 ? 'bg-slate-400/30 text-slate-300' :
                    position === 3 ? 'bg-orange-500/30 text-orange-400' :
                    'bg-white/5 text-slate-400'
                  }`}>
                    {position}
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                      {player.name}
                      {isHuman && <span className="text-yellow-400 ml-2">(You)</span>}
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest">
                      {player.correctAnswers || 0} correct
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-black text-white">{player.score.toLocaleString()}</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest">points</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      {showRewards && user && (
        <div className="z-20 w-full max-w-2xl glass p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] border-blue-500/20 animate-in slide-in-from-bottom-10 duration-700 mx-4">
          <div className="text-left mb-6 sm:mb-8">
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">Rewards</h3>
            <p className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-widest">Protocol rewards calculated successfully.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10">
            <div className="bg-white/5 p-4 sm:p-6 rounded-2xl border border-white/5 flex items-center gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 text-2xl sm:text-3xl">
                <i className="bi bi-lightning-charge-fill"></i>
              </div>
              <div className="text-left">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">XP Earned</div>
                <div className="text-2xl sm:text-3xl font-black text-white">+{xpEarned.toLocaleString()}</div>
              </div>
            </div>
            <div className="bg-white/5 p-4 sm:p-6 rounded-2xl border border-white/5 flex items-center gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-500 text-2xl sm:text-3xl">
                <i className="bi bi-coin"></i>
              </div>
              <div className="text-left">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Coins Earned</div>
                <div className="text-2xl sm:text-3xl font-black text-yellow-500">+{coinsEarned.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>Level {level}</span>
              <span className="text-blue-400">{currentXP.toLocaleString()} / {nextXP.toLocaleString()} XP</span>
            </div>
            <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-lg">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500 transition-all duration-1000 shadow-lg shadow-blue-500/50"
                style={{ width: `${Math.max(2, progress)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRestart();
        }}
        className="mt-8 sm:mt-12 px-8 sm:px-12 py-3 sm:py-4 text-slate-400 hover:text-white transition-colors font-bold uppercase text-xs sm:text-sm tracking-wider z-10 border border-slate-600 rounded-full hover:border-slate-400"
      >
        Back to Browse
      </button>
    </div>
  );
};

export default Podium;
