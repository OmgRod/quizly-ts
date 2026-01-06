import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Quiz } from '../types';
import { quizAPI, userAPI } from '../api';
import { generateAvatarUrl } from '../utils/avatar';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { getGenreIcon } from '../utils/genre';
import { getLevelProgress } from '../utils/leveling';
import ReportModal from './ReportModal';
import { useUser } from '../context/UserContext';

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { handleError } = useErrorHandler();
  const { user: currentUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalRank, setGlobalRank] = useState<{ xp: number | null; coins: number | null }>({ xp: null, coins: null });
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!id) return;
      try {
        const [userResponse, quizzesResponse, xpLeaderboard, coinsLeaderboard] = await Promise.all([
          userAPI.getProfile(id),
          quizAPI.getAll({ userId: id }),
          userAPI.getGlobalLeaderboard({ limit: 100, type: 'xp' }),
          userAPI.getGlobalLeaderboard({ limit: 100, type: 'coins' })
        ]);
        setUser(userResponse.data.user);
        setQuizzes(quizzesResponse.data.quizzes);
        
        // Find user's rank in both leaderboards
        const xpRankIndex = xpLeaderboard.data.users.findIndex((u: any) => u.id === id);
        const coinsRankIndex = coinsLeaderboard.data.users.findIndex((u: any) => u.id === id);
        
        setGlobalRank({
          xp: xpRankIndex !== -1 ? xpRankIndex + 1 : null,
          coins: coinsRankIndex !== -1 ? coinsRankIndex + 1 : null
        });
      } catch (error: any) {
        console.error('Failed to load user profile:', error);
        // Check if it's a 404 or 403 response - both mean user doesn't exist or is private
        if (error.response?.status === 404 || error.response?.status === 403) {
          handleError(411, 'User profile unavailable');
        } else if (error.response) {
          // Server responded with an error
          handleError(error.response.status, error.response.data?.error || 'Failed to load user profile');
        } else {
          // Network or other error
          handleError(500, 'Failed to load user profile');
        }
      } finally {
        setLoading(false);
      }
    };
    loadUserProfile();
  }, [id, handleError]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass p-8 rounded-3xl">
          <div className="animate-pulse text-white font-black">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Error handler will redirect to error page
  }

  const { level, progress } = getLevelProgress(user?.xp || 0);

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
      >
        <i className="bi bi-arrow-left"></i> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass p-10 rounded-[3rem] border-white/10">
          <div className="flex flex-col items-center text-center">
            <img 
              src={user?.profilePicture || generateAvatarUrl(user?.username || 'User')}
              alt={user?.username}
              className="w-32 h-32 rounded-[3rem] shadow-2xl mb-6 object-contain bg-white/5"
            />
            <h1 className="text-4xl font-black text-white mb-2">{user?.username || 'User'}</h1>
            
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20 mb-4">
              Level {level}
            </div>

            {/* Join Date and Last Online, shown only if allowed by privacy settings */}
            <div className="flex flex-col items-center gap-1 mb-8">
              {user?.showJoinDate !== false && user?.createdAt && (
                <div className="text-xs text-slate-400 font-bold">Joined: {new Date(user.createdAt).toLocaleDateString()}</div>
              )}
              {user?.showLastOnline !== false && user?.lastActiveAt && (
                <div className="text-xs text-slate-400 font-bold">Last Online: {new Date(user.lastActiveAt).toLocaleDateString()}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="text-[10px] font-black text-slate-500 uppercase mb-1">XP</div>
                <div className="text-2xl font-black text-white">{(user?.xp || 0).toLocaleString()}</div>
                {globalRank.xp && (
                  <div className="text-[9px] font-black text-blue-400 uppercase mt-1">
                    #{globalRank.xp} Global
                  </div>
                )}
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Coins</div>
                <div className="text-2xl font-black text-white">{(user?.coins || 0).toLocaleString()}</div>
                {globalRank.coins && (
                  <div className="text-[9px] font-black text-yellow-400 uppercase mt-1">
                    #{globalRank.coins} Global
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              {user?.showQuizStats !== false && (
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Quizzes</div>
                  <div className="text-2xl font-black text-white">{quizzes.length}</div>
                </div>
              )}
            </div>

            <div className="w-full text-left space-y-4">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                <span>Progress</span>
                <span className="text-blue-400">{progress.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {currentUser?.id !== user.id && (
              <button
                onClick={() => setReportModalOpen(true)}
                className="w-full mt-8 glass border-white/10 text-slate-400 hover:text-amber-400 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2"
              >
                <i className="bi bi-flag-fill"></i> Report User
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {user?.showQuizStats !== false ? (
            <>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-6">Created Quizzes</h2>
              {quizzes.length === 0 ? (
                <div className="glass p-20 rounded-[3rem] border-dashed border-white/10 text-center space-y-4 opacity-30">
                  <i className="bi bi-journal-x text-6xl block"></i>
                  <p className="font-bold text-xl uppercase tracking-widest">No Quizzes Yet</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paginatedQuizzes.map(q => (
                      <div
                        key={q.id}
                        onClick={() => navigate(`/quiz/${q.id}`)}
                        className="glass p-6 rounded-2xl border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                            <i className={`bi ${getGenreIcon(q.genre)} text-xl`}></i>
                          </div>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{q.playCount}</span>
                        </div>
                        <h3 className="text-lg font-black text-white mb-2 line-clamp-2">{q.title}</h3>
                        <p className="text-slate-500 text-xs font-medium line-clamp-2 mb-4">{q.description}</p>
                        <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                          {q.questions.length} Questions
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center mt-6 gap-2">
                    <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded bg-slate-700 text-white disabled:opacity-50">Prev</button>
                    <span className="px-3 py-1 font-bold text-slate-400">Page {page} of {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded bg-slate-700 text-white disabled:opacity-50">Next</button>
                  </div>
                </>
              )}
          ) : (
            <div className="glass p-20 rounded-[3rem] border-white/10 text-center space-y-4">
              <i className="bi bi-eye-slash text-6xl text-slate-600 block"></i>
              <p className="font-bold text-xl uppercase tracking-widest text-slate-500">Quiz Stats Hidden</p>
              <p className="text-slate-600 text-sm">This user has chosen to keep their quiz creations private</p>
            </div>
          )}        </div>
      </div>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType="user"
        targetId={user.id}
        targetName={user.username}
      />
    </div>
  );
};

export default UserProfile;
