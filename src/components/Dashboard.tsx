
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Quiz, getLevelProgress } from '../types';
import { quizAPI } from '../api';
import { getGenreIcon } from '../utils/genre';
import { generateAvatarUrl } from '../utils/avatar';
import { downloadQuiz } from '../utils/quizImportExport';
import toast from 'react-hot-toast';

interface DashboardProps {
  user: User;
  onEditQuiz: (quiz: Quiz) => void;
  onPlayQuiz: (quiz: Quiz) => void;
  onNewQuiz: () => void;
  onSettings: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onEditQuiz, onPlayQuiz, onNewQuiz, onSettings }) => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingQuiz, setConfirmingQuiz] = useState<Quiz | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const loadQuizzes = async () => {
      if (user) {
        try {
          const response = await quizAPI.getAll({ userId: user.id });
          setQuizzes(response.data.quizzes);
        } catch (error) {
          console.error('Failed to load quizzes:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadQuizzes();
  }, [user?.id]);

  const handleConfirmDelete = async () => {
    if (!confirmingQuiz) return;
    const id = confirmingQuiz.id;
    setRemovingId(id);
    try {
      await quizAPI.delete(id);
      setTimeout(() => {
        setQuizzes(prev => prev.filter(q => q.id !== id));
      }, 180);
    } catch (error) {
      console.error('Failed to delete quiz:', error);
    } finally {
      setConfirmingQuiz(null);
      setTimeout(() => setRemovingId(null), 200);
    }
  };

  if (!user) return (
    <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
       <i className="bi bi-shield-lock text-6xl text-slate-700"></i>
       <h2 className="text-3xl font-black text-white uppercase">Authentication Required</h2>
       <p className="text-slate-500 max-w-sm">Please sign in to access your dashboard.</p>
    </div>
  );

  const { level, progress } = getLevelProgress(user.xp);

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,#1e1b4b_0%,#020617_60%)]"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-12">
        {/* Left: User Bio & Stats */}
        <div className="space-y-6 sm:space-y-8">
          <div className="glass p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl md:rounded-[3rem] border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
            <img 
              src={user.profilePicture || generateAvatarUrl(user.username)}
              alt={user.username}
              className="w-20 sm:w-24 h-20 sm:h-24 rounded-2xl sm:rounded-[2.5rem] object-cover shadow-2xl mb-4 sm:mb-6"
            />
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">{user.username}</h2>
              
              <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3 sm:px-4 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-blue-500/20 mb-6 sm:mb-8">
                Level {level}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                <div className="bg-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5">
                  <div className="text-[10px] font-black text-slate-500 uppercase mb-1">XP Points</div>
                  <div className="text-xl font-black text-white">{user.xp.toLocaleString()}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Coins</div>
                  <div className="text-xl font-black text-yellow-500">{user.coins.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="w-full h-px bg-white/10 my-8"></div>
              
              <div className="w-full text-left space-y-4 mb-8">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                  <span>Level Progress</span>
                  <span className="text-blue-400">{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              <button 
                onClick={onSettings}
                className="w-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/5 transition-all flex items-center justify-center gap-3"
              >
                <i className="bi bi-gear-fill"></i> Account Settings
              </button>
            </div>
          </div>
        </div>

        {/* Right: Quiz Management */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Your Quizzes</h3>
            <button 
              onClick={onNewQuiz}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-95"
            >
              <i className="bi bi-plus-lg mr-2"></i> New Quiz
            </button>
          </div>

          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map(i => <div key={i} className="glass h-24 rounded-[2rem] animate-pulse"></div>)}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="glass p-20 rounded-[3rem] border-dashed border-white/10 text-center space-y-4 opacity-30">
              <i className="bi bi-journal-x text-6xl block"></i>
              <p className="font-bold text-xl uppercase tracking-widest">No Quizzes Yet</p>
              <p className="text-sm max-w-xs mx-auto">Create your first quiz to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {quizzes.map(q => (
                <div 
                  key={q.id} 
                  onClick={() => navigate(`/quiz/${q.id}`)}
                  className={`glass p-6 rounded-[2rem] border-white/5 flex flex-col md:flex-row items-center justify-between group transition-all duration-300 gap-6 overflow-hidden relative cursor-pointer hover:border-blue-500/30 ${removingId === q.id ? 'opacity-0 -translate-y-2 scale-95' : ''}`}
                >
                  
                  <>
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                          <i className={`bi ${getGenreIcon(q.genre)} text-2xl`}></i>
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-white">{q.title}</h4>
                          <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">
                            {q.questions.length} Questions • {q.playCount} Plays
                          </p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <span className="text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-widest bg-white/5 text-slate-300 border border-white/5 inline-flex items-center gap-1">
                              <i className={`bi ${getGenreIcon(q.genre)}`}></i>
                              {q.genre}
                            </span>
                            <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${(q.visibility || 'PUBLIC') === 'DRAFT' ? 'bg-amber-500/20 text-amber-300' : (q.visibility || 'PUBLIC') === 'PRIVATE' ? 'bg-slate-600/50 text-slate-200' : 'bg-emerald-500/20 text-emerald-300'}`}>
                              {q.visibility || 'PUBLIC'}
                            </span>
                            <span className="text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-widest bg-white/5 text-slate-300 border border-white/5">
                              {q.playCount?.toLocaleString() || 0} plays
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 w-full md:w-auto">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onPlayQuiz(q); }}
                          className="flex-1 md:flex-none bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                        >
                          {q.visibility === 'DRAFT' ? 'Play Solo' : 'Launch'}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); downloadQuiz(q); toast.success('Quiz downloaded!'); }}
                          className="bg-white/5 text-slate-400 p-3 rounded-xl hover:bg-blue-500/20 hover:text-blue-400 transition-all"
                          title="Download quiz as JSON"
                        >
                          <i className="bi bi-download"></i>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditQuiz(q); }}
                          className="bg-white/5 text-slate-400 p-3 rounded-xl hover:bg-white/10 hover:text-white transition-all"
                        >
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setConfirmingQuiz(q); }}
                          className="bg-rose-500/10 text-rose-500 p-3 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                        >
                          <i className="bi bi-trash3-fill"></i>
                        </button>
                      </div>
                    </>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmingQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass w-full max-w-lg p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-rose-500/30 shadow-2xl shadow-rose-500/10">
            <div className="flex items-start gap-3 sm:gap-4 mb-6">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                <i className="bi bi-exclamation-triangle-fill text-lg sm:text-2xl"></i>
              </div>
              <div className="flex-1">
                <p className="text-[9px] sm:text-xs font-black uppercase tracking-[0.3em] text-rose-300 mb-1 sm:mb-2">Confirm Deletion</p>
                <h4 className="text-lg sm:text-xl font-black text-white mb-1">Delete "{confirmingQuiz.title}"?</h4>
                <p className="text-slate-400 text-xs sm:text-sm">This will permanently remove the quiz and its play history. This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button 
                onClick={() => setConfirmingQuiz(null)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 text-slate-200 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Dashboard;
