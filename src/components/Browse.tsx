
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { quizAPI } from '../api';
import { Quiz, QuizGenre } from '../types';
import { getGenreIcon } from '../utils/genre';
import { generateAvatarUrl } from '../utils/avatar';
import Footer from './Footer';

interface BrowseProps {
  onStartQuiz: (q: Quiz, solo?: boolean) => void;
}

const genres: QuizGenre[] = [
  'All', 
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

const INITIAL_GENRES_SHOWN = 7;

const Browse: React.FC<BrowseProps> = ({ onStartQuiz }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeGenre, setActiveGenre] = useState<QuizGenre>(
    (searchParams.get('genre') as QuizGenre) || 'All'
  );
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'newest');
  const [loading, setLoading] = useState(true);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [displayCount, setDisplayCount] = useState(15);

  useEffect(() => {
    const loadQuizzes = async () => {
      setLoading(true);
      setDisplayCount(15);
      try {
        const params: any = {};
        if (activeGenre !== 'All') params.genre = activeGenre;
        if (searchTerm) params.search = searchTerm;
        if (sortBy !== 'newest') params.sort = sortBy;

        const response = await quizAPI.getAll(params);
        setQuizzes(response.data.quizzes);
      } catch (error) {
        console.error('Failed to load quizzes:', error);
      } finally {
        setLoading(false);
      }
    };
    loadQuizzes();
  }, [activeGenre, searchTerm, sortBy]);

  // Update URL params when filters change
  useEffect(() => {
    const params: any = {};
    if (activeGenre !== 'All') params.genre = activeGenre;
    if (searchTerm) params.search = searchTerm;
    if (sortBy !== 'newest') params.sort = sortBy;
    setSearchParams(params);
  }, [activeGenre, searchTerm, sortBy, setSearchParams]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const displayedGenres = showAllGenres ? genres : genres.slice(0, INITIAL_GENRES_SHOWN);

  return (
    <>
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,#1e1b4b_0%,#020617_60%)]"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-20 pt-8 relative z-10">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-black text-white tracking-tighter mb-4">
            Browse <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">All Quizzes</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium">Discover and filter through thousands of quizzes</p>
        </div>

        {/* Filters and Search */}
        <section className="mb-12 space-y-8">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
            <div className="flex-1 space-y-4 w-full">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Filter by Genre</p>
              <div className="flex flex-wrap items-center gap-2">
                {displayedGenres.map(g => (
                  <button
                    key={g}
                    onClick={() => setActiveGenre(g)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeGenre === g ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105' : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}
                  >
                    {g}
                  </button>
                ))}
                <button 
                  onClick={() => setShowAllGenres(!showAllGenres)}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all"
                >
                  {showAllGenres ? <><i className="bi bi-chevron-up mr-1"></i> Less</> : <><i className="bi bi-chevron-down mr-1"></i> More Genres</>}
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Sort By</p>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-black uppercase text-white outline-none focus:border-blue-500/50 transition-all"
                >
                  <option value="newest" className="bg-slate-900">Newest</option>
                  <option value="updated" className="bg-slate-900">Recently Updated</option>
                  <option value="oldest" className="bg-slate-900">Oldest</option>
                  <option value="name" className="bg-slate-900">Name (A-Z)</option>
                  <option value="trending" className="bg-slate-900">Trending</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Search</p>
                <div className="relative w-full sm:w-96 group shrink-0 flex gap-2">
                  <div className="relative flex-1">
                    <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"></i>
                    <input 
                      type="text" 
                      placeholder="Filter quizzes..." 
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      maxLength={100}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:opacity-30"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="glass h-64 rounded-2xl animate-pulse"></div>)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {quizzes.length === 0 ? (
                <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-slate-700 text-5xl">
                    <i className="bi bi-journal-x"></i>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">No Quizzes Found</h3>
                    <p className="text-slate-500 max-w-sm font-medium">No quizzes match your current filters. Try adjusting your search.</p>
                  </div>
                  <button 
                    onClick={() => { setActiveGenre('All'); setSearchTerm(''); setSortBy('newest'); }}
                    className="text-blue-400 font-black text-xs uppercase tracking-[0.3em] hover:text-white transition-all duration-300 ease-out hover:scale-105"
                  >
                    <i className="bi bi-arrow-counterclockwise mr-2"></i> Reset Filters
                  </button>
                </div>
              ) : (
                <>
                  {quizzes.slice(0, displayCount).map(q => (
                    <div 
                      key={q.id} 
                      onClick={() => navigate(`/quiz/${q.id}`)}
                      className="glass p-4 rounded-2xl border-white/5 hover:border-blue-500/30 transition-all duration-300 ease-out group hover:bg-white/5 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col h-full cursor-pointer"
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
                </>
              )}
            </div>
          )}
          
          {!loading && quizzes.length > displayCount && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setDisplayCount(prev => prev + 15)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <i className="bi bi-arrow-down-circle"></i>
                Load More
              </button>
            </div>
          )}
        </section>
      </div>
      
    </div>
    <Footer />
    </>
  );
};

export default Browse;
