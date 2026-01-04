
import React from 'react';
import toast from 'react-hot-toast';
import { Player } from '../types';

interface GameLobbyProps {
  pin: string;
  players: Player[];
  onStart: () => void;
  quizTitle: string;
  isHost: boolean;
  createdAt: Date;
  onExit: () => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({ pin, players, onStart, quizTitle, isHost, createdAt, onExit }) => {
  console.log('[GAMELOBBY] Rendering with:', { pin, playersCount: players.length, players, isHost });
  const [timeRemaining, setTimeRemaining] = React.useState<string>('');

  // Update timer every second
  React.useEffect(() => {
    const updateTimer = () => {
      const created = new Date(createdAt);
      const inactiveAt = new Date(created.getTime() + 10 * 60 * 1000); // 10 minutes
      const now = new Date();
      const diff = inactiveAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Inactive');
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const copyPin = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pin || '')
        .then(() => toast.success('PIN copied to clipboard!'))
        .catch(err => {
          console.error('Failed to copy:', err);
          toast.error('Failed to copy PIN');
        });
    } else {
      // Fallback for older browsers or insecure contexts
      const textArea = document.createElement('textarea');
      textArea.value = pin || '';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('PIN copied to clipboard!');
      } catch (err) {
        console.error('Fallback copy failed:', err);
        toast.error('Failed to copy PIN');
      }
      document.body.removeChild(textArea);
    }
  };

  const shareLink = async () => {
    const lobbyUrl = `${window.location.origin}/lobby/${pin}`;
    
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Join Quizly Game',
          text: `Join my Quizly game! PIN: ${pin}`,
          url: lobbyUrl
        });
      } catch (err) {
        // User cancelled share or error occurred
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Share failed:', err);
          // Fall back to clipboard if share fails
          try {
            await navigator.clipboard.writeText(lobbyUrl);
            toast.success('Lobby link copied to clipboard!');
          } catch (clipErr) {
            toast.error('Failed to share link');
          }
        }
      }
    } else {
      // Fallback to clipboard for browsers that don't support Web Share API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(lobbyUrl);
          toast.success('Lobby link copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy:', err);
          toast.error('Failed to copy link');
        }
      } else {
        toast.error('Share not supported on this device');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] animate-in fade-in duration-500">
      <div className="glass text-white p-6 md:p-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Left: Exit Button */}
            <button
              onClick={onExit}
              className="glass border-red-500/20 text-red-400 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-widest hover:bg-red-500/10 transition-all duration-300 ease-out hover:scale-105 hover:border-red-500/40 flex items-center gap-2"
              title="Exit lobby"
            >
              <i className="bi bi-x-lg"></i> Exit
            </button>

            {/* Center: PIN and Quiz Name */}
            <div className="flex-1 text-left">
              <div className="mb-3 sm:mb-4">
                <h2 className="text-[9px] sm:text-[10px] font-black opacity-40 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-1 sm:mb-2">Room PIN</h2>
                <button
                  onClick={copyPin}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-blue-400 hover:text-blue-300 transition-all duration-300 ease-out cursor-pointer hover:opacity-80 hover:scale-105"
                  title="Click to copy PIN"
                >
                  {pin || '------'}
                </button>
              </div>
              <div>
                <div className="text-[9px] sm:text-[10px] font-black opacity-40 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-1 sm:mb-2">Quiz Name</div>
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-white">{quizTitle}</h1>
              </div>
            </div>

            {/* Right: Timer and Share Button */}
            <div className="flex-shrink-0 w-full md:w-auto flex flex-col gap-2 sm:gap-3">
              <div className="glass border-white/10 text-white font-black px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-center">
                <div className="text-[8px] sm:text-[10px] opacity-60 uppercase tracking-widest mb-0.5 sm:mb-1">Becomes Inactive In</div>
                <div className="text-lg sm:text-2xl font-black text-amber-400">{timeRemaining}</div>
              </div>
              <button
                onClick={shareLink}
                className="glass border-white/10 text-white font-black px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm uppercase tracking-widest hover:bg-white/10 transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg hover:shadow-white/10 flex items-center justify-center gap-2"
                title="Copy lobby link"
              >
                <i className="bi bi-share-fill"></i> Share Link
              </button>
              {isHost ? (
                <button 
                    onClick={onStart}
                    className="w-full bg-white text-slate-900 font-black px-12 py-4 rounded-full text-xl transition-all duration-300 ease-out shadow-xl hover:scale-105 hover:shadow-2xl active:scale-95 disabled:opacity-20"
                    disabled={players.length < 1}
                >
                    Start Game
                </button>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/20 px-6 py-3 rounded-3xl text-blue-400 font-black text-sm uppercase tracking-widest animate-pulse text-center">
                  Connected • Waiting...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 md:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
            <div className="mb-6 sm:mb-8 md:mb-12 flex justify-center">
              <div className="glass border-white/5 px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-full flex items-center gap-2 sm:gap-3">
                  <i className="bi bi-people-fill text-emerald-400 text-sm sm:text-base"></i>
                  <span className="font-black text-xs sm:text-sm uppercase tracking-widest text-slate-400">{players.length} Players</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 lg:gap-8\">
                {players.map((p) => (
                    <div 
                        key={p.id} 
                        className="glass border-white/5 p-6 rounded-3xl flex flex-col items-center animate-in zoom-in duration-300 transition-all hover:bg-white/5 relative"
                    >
                        {/* Connection status indicator */}
                        {!p.isBot && (
                          <div className="absolute top-3 right-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              p.connected !== false ? 'bg-emerald-500' : 'bg-red-500'
                            }`} title={p.connected !== false ? 'Connected' : 'Disconnected'}></div>
                          </div>
                        )}
                        
                        <div className={`w-16 h-16 rounded-2xl mb-4 flex items-center justify-center text-white border-2 ${
                            p.isHost ? 'bg-blue-500/20 border-blue-500' : 'bg-emerald-500/20 border-emerald-500/50'
                        }`}>
                            <i className={`bi ${p.isHost ? 'bi-shield-fill' : 'bi-person-fill'} text-xl`}></i>
                        </div>
                        <div className="font-black text-center truncate w-full text-sm uppercase tracking-widest text-white">{p.name}</div>
                        {p.isHost && <span className="text-[8px] font-black text-blue-400 uppercase mt-1 tracking-widest">Host</span>}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;
