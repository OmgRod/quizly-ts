import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../api';
import { generateAvatarUrl } from '../utils/avatar';
import { useUser } from '../context/UserContext';

interface LeaderboardUser {
  id: string;
  username: string;
  totalPoints: number;
  xp: number;
  coins: number;
  profilePicture: string | null;
  createdAt: string;
}

type LeaderboardType = 'xp' | 'coins';

const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<LeaderboardType>('xp');

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await userAPI.getGlobalLeaderboard({ limit: 100, type: activeTab });
      setUsers(response.data.users);
      
      // Find current user's rank
      if (currentUser) {
        const userIndex = response.data.users.findIndex((u: LeaderboardUser) => u.id === currentUser.id);
        if (userIndex !== -1) {
          setCurrentUserRank(userIndex + 1);
        } else {
          setCurrentUserRank(null);
        }
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-amber-500';
    if (rank === 2) return 'from-gray-300 to-gray-400';
    if (rank === 3) return 'from-orange-400 to-orange-600';
    return 'from-slate-400 to-slate-600';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return 'bi-trophy-fill';
    if (rank === 2) return 'bi-award-fill';
    if (rank === 3) return 'bi-star-fill';
    return 'bi-hash';
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,#1e1b4b_0%,#020617_60%)]"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-20 pt-6 sm:pt-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-blue-500/20 mb-6">
            <i className="bi bi-trophy"></i> Global Rankings
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter leading-none mb-4">
            Leaderboard
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
            {activeTab === 'xp' ? 'Top players ranked by experience points' : 'Top players ranked by coins earned'}
          </p>
          
          {/* Tabs */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-8">
            <button
              onClick={() => setActiveTab('xp')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${
                activeTab === 'xp'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'
              }`}
            >
              <i className="bi bi-lightning-charge-fill mr-1 sm:mr-2"></i> <span className="hidden xs:inline">XP </span>Leaderboard
            </button>
            <button
              onClick={() => setActiveTab('coins')}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${
                activeTab === 'coins'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'
              }`}
            >
              <i className="bi bi-coin mr-1 sm:mr-2"></i> <span className="hidden xs:inline">Coins </span>Leaderboard
            </button>
          </div>
        </div>

        {/* Current User Stats */}
        {currentUser && currentUserRank && (
          <div className="glass p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-white/10 mb-6 sm:mb-8 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <img
                  src={currentUser.profilePicture || generateAvatarUrl(currentUser.username)}
                  alt={currentUser.username}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Your Rank</div>
                  <div className="text-lg sm:text-2xl font-black text-white truncate">{currentUser.username}</div>
                </div>
              </div>
              <div className="flex items-center gap-6 sm:gap-8 w-full sm:w-auto justify-around sm:justify-end">
                <div className="text-center sm:text-right">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Rank</div>
                  <div className="text-2xl sm:text-3xl font-black text-blue-400">#{currentUserRank}</div>
                </div>
                <div className="text-center sm:text-right">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{activeTab === 'xp' ? 'XP' : 'Coins'}</div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{activeTab === 'xp' ? currentUser.xp.toLocaleString() : currentUser.coins.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {loading ? (
          <div className="space-y-4 max-w-4xl mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="glass h-24 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-slate-700 text-5xl">
              <i className="bi bi-trophy"></i>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">No Rankings Yet</h3>
              <p className="text-slate-500 max-w-sm font-medium">Be the first to compete and claim the top spot!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 max-w-4xl mx-auto">
            {users.map((user, index) => {
              const rank = index + 1;
              const isCurrentUser = currentUser?.id === user.id;
              
              return (
                <div 
                  key={user.id}
                  onClick={() => navigate(`/user/${user.id}`)}
                  className={`glass p-3 sm:p-6 rounded-xl sm:rounded-2xl border-white/5 hover:border-blue-500/30 transition-all duration-300 ease-out group hover:bg-white/5 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer ${
                    isCurrentUser ? 'ring-2 ring-blue-500/50 bg-blue-500/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-6">
                    {/* Rank Badge */}
                    <div className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl flex flex-col items-center justify-center ${
                      rank <= 3 ? `bg-gradient-to-br ${getRankColor(rank)} text-white` : 'bg-white/5 text-slate-400'
                    }`}>
                      <i className={`bi ${getRankIcon(rank)} text-lg sm:text-2xl`}></i>
                      <div className="text-[10px] sm:text-xs font-black">{rank}</div>
                    </div>

                    {/* Avatar */}
                    <img
                      src={user.profilePicture || generateAvatarUrl(user.username)}
                      alt={user.username}
                      className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover flex-shrink-0"
                    />

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                        <h3 className="text-base sm:text-xl font-black text-white truncate">{user.username}</h3>
                        {isCurrentUser && (
                          <span className="text-[10px] sm:text-xs font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg">You</span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 font-medium hidden sm:block">
                        Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 sm:gap-8 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-0.5 sm:mb-1">{activeTab === 'xp' ? 'XP' : 'Coins'}</div>
                        <div className={`text-lg sm:text-2xl font-black ${activeTab === 'xp' ? 'text-indigo-400' : 'text-amber-400'}`}>
                          {activeTab === 'xp' ? user.xp.toLocaleString() : user.coins.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <i className="bi bi-chevron-right text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0 text-sm sm:text-base"></i>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
