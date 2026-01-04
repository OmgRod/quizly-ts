
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../api';
import { Quiz, QuizGenre } from '../types';
import { getGenreIcon } from '../utils/genre';
import { generateAvatarUrl } from '../utils/avatar';
import Footer from './Footer';

interface ExploreProps {
  onStartQuiz: (q: Quiz, solo?: boolean) => void;
  onStartAI: () => void;
  onManualCreate: () => void;
}

const genres: QuizGenre[] = [
  'General', 
  'Science', 
  'History', 
  'Geography', 
  'Politics', 
  'Business', 
  'Technology', 
  'Nature',
  'Pop Culture', 
  'Sports', 
  'Movies', 
  'Music', 
  'Gaming', 
  'Food & Drink', 
  'Literature', 
  'Art', 
  'Mythology'
];

const Explore: React.FC<ExploreProps> = ({ onStartQuiz, onStartAI, onManualCreate }) => {
  const navigate = useNavigate();
  const [quizzesByGenre, setQuizzesByGenre] = useState<Record<string, Quiz[]>>({});
  const [loading, setLoading] = useState(true);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const loadQuizzesByGenre = async () => {
      setLoading(true);
      try {
        const genreMap: Record<string, Quiz[]> = {};
        
        // Fetch quizzes for each genre
        for (const genre of genres) {
          const response = await quizAPI.getAll({ genre, sort: 'trending' });
          const quizzesForGenre = response.data.quizzes.slice(0, 10); // Limit to 10 per genre
          if (quizzesForGenre.length > 0) {
            genreMap[genre] = quizzesForGenre;
          }
        }
        
        setQuizzesByGenre(genreMap);
      } catch (error) {
        console.error('Failed to load quizzes:', error);
      } finally {
        setLoading(false);
      }
    };
    loadQuizzesByGenre();
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setGlowPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const viewAllGenre = (genre: QuizGenre) => {
    navigate(`/browse?genre=${encodeURIComponent(genre)}`);
  };

  // Get genres that have quizzes
  const genresWithQuizzes = Object.keys(quizzesByGenre) as QuizGenre[];

  return (
    <>
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,#1e1b4b_0%,#020617_60%)]"></div>
      
      <div className="max-w-7xl mx-auto px-8 pb-20 min-h-screen flex flex-col relative z-10">
      {/* Hero AI Section */}
      <section className="mb-16 relative group pt-8">
        <div 
          ref={heroRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className="glass rounded-[3rem] p-12 border-white/10 flex flex-row items-center justify-between gap-12 overflow-hidden relative"
        >
          {/* Cursor-following glow overlay */}
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity duration-700 ease-in-out"
            style={{
              opacity: isHovering ? 1 : 0,
              background: `radial-gradient(600px circle at ${glowPos.x}px ${glowPos.y}px, rgba(59, 130, 246, 0.15), transparent)`
            }}
          />

          <div className="flex-1 space-y-6 pointer-events-none md:pointer-events-auto relative z-10">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
              <i className="bi bi-stars"></i> Create with AI
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter leading-none">
              Create Quizzes<br />
              <span style={{ background: 'linear-gradient(to right, #60a5fa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Instantly with AI</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl font-medium">
              Use AI to create unique quizzes on any topic in seconds.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={onStartAI}
                className="bg-white text-slate-950 px-10 py-5 rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all duration-300 ease-out shadow-2xl hover:shadow-blue-500/20 flex items-center gap-4 pointer-events-auto"
              >
                <i className="bi bi-lightning-charge-fill text-blue-600"></i> Create with AI
              </button>
              <button 
                onClick={onManualCreate}
                className="glass border-white/10 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-white/10 active:scale-95 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-white/10 flex items-center gap-4 pointer-events-auto"
              >
                <i className="bi bi-tools text-indigo-400"></i> Create Manually
              </button>
            </div>
          </div>
          <div className="flex-shrink-0 w-64 flex justify-center pointer-events-none relative z-10">
            <div className="w-64 h-64 bg-white/5 rounded-full border border-white/10 flex items-center justify-center animate-pulse-slow">
              <i className="bi bi-cpu text-9xl text-indigo-400 opacity-20"></i>
            </div>
          </div>
        </div>
      </section>

      {/* Genre Carousels */}
      <section className="space-y-12 flex-1">
        {loading ? (
          <div className="space-y-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-4">
                <div className="h-8 w-48 bg-white/5 rounded-xl animate-pulse"></div>
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="glass h-64 w-64 rounded-2xl animate-pulse flex-shrink-0"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : genresWithQuizzes.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-slate-700 text-5xl">
               <i className="bi bi-journal-x"></i>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">No Quizzes Available</h3>
              <p className="text-slate-500 max-w-sm font-medium">There are no quizzes to explore yet. Be the first to create one!</p>
            </div>
            <button 
              onClick={onStartAI}
              className="text-blue-400 font-black text-xs uppercase tracking-[0.3em] hover:text-white transition-all duration-300 ease-out hover:scale-105"
            >
              <i className="bi bi-lightning-charge-fill mr-2"></i> Create with AI
            </button>
          </div>
        ) : (
          genresWithQuizzes.map(genre => (
            <div key={genre} className="space-y-4">
              {/* Genre Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-blue-400">
                    <i className={`bi ${getGenreIcon(genre)} text-xl`}></i>
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight">{genre}</h2>
                </div>
                <button 
                  onClick={() => viewAllGenre(genre)}
                  className="text-blue-400 font-black text-xs uppercase tracking-[0.3em] hover:text-white transition-all duration-300 ease-out hover:scale-105 flex items-center gap-2"
                >
                  View All <i className="bi bi-arrow-right"></i>
                </button>
              </div>

              {/* Horizontal Scroll Container */}
              <div className="relative">
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {quizzesByGenre[genre].slice(0, 10).map(q => (
                    <div 
                      key={q.id} 
                      onClick={() => navigate(`/quiz/${q.id}`)}
                      className="glass p-4 rounded-2xl border-white/5 hover:border-blue-500/30 transition-all duration-300 ease-out group hover:bg-white/5 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col cursor-pointer flex-shrink-0 w-64 h-72"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-blue-400 group-hover:scale-110 transition-all duration-300 ease-out group-hover:rotate-3 flex-shrink-0">
                          <i className={`bi ${getGenreIcon(q.genre)} text-lg`}></i>
                        </div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex-shrink-0">{(q.playCount || 0).toLocaleString()}</span>
                      </div>
                      <h3 className="text-base font-black text-white mb-1 line-clamp-2 tracking-tight">{q.title}</h3>
                      <p className="text-slate-500 text-[11px] font-medium mb-3 line-clamp-2 leading-snug flex-grow">{q.description}</p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <img
                          src={q.authorProfilePicture || generateAvatarUrl(q.authorName)}
                          alt={q.authorName}
                          className="w-5 h-5 rounded object-cover flex-shrink-0"
                        />
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/user/${q.userId}`); }}
                          className="text-[9px] font-black text-slate-400 hover:text-blue-400 uppercase tracking-widest truncate transition-all duration-300 ease-out"
                        >
                          {q.authorName}
                        </button>
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onStartQuiz(q); }} 
                          className="flex-1 bg-white text-slate-950 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all duration-300 ease-out shadow-lg hover:shadow-blue-500/20"
                        >
                          <i className="bi bi-play-fill mr-1"></i> Multi
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onStartQuiz(q, true); }} 
                          className="flex-1 glass border-white/10 text-white py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-white/10"
                        >
                          <i className="bi bi-person-fill mr-1"></i> Solo
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {quizzesByGenre[genre].length > 10 && (
                    <div
                      onClick={() => viewAllGenre(genre)}
                      className="glass p-4 rounded-2xl border-white/5 border-dashed hover:border-blue-500/30 transition-all duration-300 ease-out group hover:bg-white/5 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col items-center justify-center cursor-pointer flex-shrink-0 w-64 h-72"
                    >
                      <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 group-hover:scale-110 transition-all duration-300 ease-out mb-4">
                        <i className="bi bi-arrow-right text-3xl"></i>
                      </div>
                      <h3 className="text-lg font-black text-white mb-2 text-center">View More</h3>
                      <p className="text-slate-500 text-xs font-medium text-center">{quizzesByGenre[genre].length - 10} more {genre} quizzes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
    
  </div>
  <Footer />
  </>
  );
};

export default Explore;
