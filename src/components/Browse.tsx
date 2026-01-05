
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { quizAPI, userAPI } from '../api';
import { Quiz, QuizGenre, User } from '../types';
import { getGenreIcon } from '../utils/genre';
import { generateAvatarUrl } from '../utils/avatar';
import Footer from './Footer';
import { Button, Card, Icon } from './ui';

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
  // Tabs: 'quizzes' or 'users'
  const [activeTab, setActiveTab] = useState<'quizzes' | 'users'>(searchParams.get('tab') === 'users' ? 'users' : 'quizzes');

  // Quizzes state
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeGenre, setActiveGenre] = useState<QuizGenre>(
    (searchParams.get('genre') as QuizGenre) || 'All'
  );
  const [quizSearchInput, setQuizSearchInput] = useState(searchParams.get('search') || '');
  const [quizSearchTerm, setQuizSearchTerm] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'newest');
  const [quizLoading, setQuizLoading] = useState(true);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [displayCount, setDisplayCount] = useState(15);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [userSearchInput, setUserSearchInput] = useState(searchParams.get('userSearch') || '');
  const [userSearchTerm, setUserSearchTerm] = useState(searchParams.get('userSearch') || '');
  const [userLoading, setUserLoading] = useState(false);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 20;


  // Load quizzes
  useEffect(() => {
    if (activeTab !== 'quizzes') return;
    const loadQuizzes = async () => {
      setQuizLoading(true);
      setDisplayCount(15);
      try {
        const params: any = {};
        if (activeGenre !== 'All') params.genre = activeGenre;
        if (quizSearchTerm) params.search = quizSearchTerm;
        if (sortBy !== 'newest') params.sort = sortBy;
        const response = await quizAPI.getAll(params);
        setQuizzes(response.data.quizzes);
      } catch (error) {
        console.error('Failed to load quizzes:', error);
      } finally {
        setQuizLoading(false);
      }
    };
    loadQuizzes();
  }, [activeTab, activeGenre, quizSearchTerm, sortBy]);

  // Load users
  useEffect(() => {
    if (activeTab !== 'users') return;
    const loadUsers = async () => {
      setUserLoading(true);
      try {
        const params: any = {
          limit: USERS_PER_PAGE,
          offset: (userPage - 1) * USERS_PER_PAGE
        };
        if (userSearchTerm) params.search = userSearchTerm;
        const response = await userAPI.getAll(params);
        setUsers(response.data.users);
        setUserTotal(response.data.total);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setUserLoading(false);
      }
    };
    loadUsers();
  }, [activeTab, userSearchTerm, userPage]);


  // Update URL params when filters change
  useEffect(() => {
    const params: any = { tab: activeTab };
    if (activeTab === 'quizzes') {
      if (activeGenre !== 'All') params.genre = activeGenre;
      if (quizSearchTerm) params.search = quizSearchTerm;
      if (sortBy !== 'newest') params.sort = sortBy;
    } else if (activeTab === 'users') {
      if (userSearchTerm) params.userSearch = userSearchTerm;
      if (userPage > 1) params.userPage = userPage;
    }
    setSearchParams(params);
  }, [activeTab, activeGenre, quizSearchTerm, sortBy, userSearchTerm, userPage, setSearchParams]);


  // Quiz search handlers
  const handleQuizSearch = () => setQuizSearchTerm(quizSearchInput);
  const handleQuizKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleQuizSearch(); };

  // User search handlers
  const handleUserSearch = () => { setUserPage(1); setUserSearchTerm(userSearchInput); };
  const handleUserKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleUserSearch(); };

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
              Browse{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                {activeTab === 'quizzes' ? 'All Quizzes' : 'Users'}
              </span>
            </h1>
            <p className="text-slate-400 text-lg font-medium">
              {activeTab === 'quizzes'
                ? 'Discover and filter through thousands of quizzes'
                : 'Find and explore users on Quizly'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8">
            <Button
              variant={activeTab === 'quizzes' ? 'primary' : 'secondary'}
              size="lg"
              onClick={() => setActiveTab('quizzes')}
            >
              <Icon name="bi-journal-x" className="mr-2" /> Quizzes
            </Button>
            <Button
              variant={activeTab === 'users' ? 'primary' : 'secondary'}
              size="lg"
              onClick={() => setActiveTab('users')}
            >
              <Icon name="bi-person-fill" className="mr-2" /> Users
            </Button>
          </div>

          {/* Quizzes Tab */}
          {activeTab === 'quizzes' && (
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
                      {showAllGenres ? <><Icon name="bi-chevron-up" className="mr-1" /> Less</> : <><Icon name="bi-chevron-down" className="mr-1" /> More Genres</>}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Sort By</p>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-blue-500/50 transition-all cursor-pointer"
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
                        <Icon name="bi-search" className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type="text"
                          placeholder="Filter quizzes..."
                          value={quizSearchInput}
                          onChange={(e) => setQuizSearchInput(e.target.value)}
                          onKeyPress={handleQuizKeyPress}
                          maxLength={100}
                          className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:opacity-30"
                        />
                      </div>
                      <Button onClick={handleQuizSearch} variant="primary" size="md">Search</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid */}
              {quizLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="glass h-64 rounded-2xl animate-pulse"></div>)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {quizzes.length === 0 ? (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
                      <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-slate-700 text-5xl">
                        <Icon name="bi-journal-x" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">No Quizzes Found</h3>
                        <p className="text-slate-500 max-w-sm font-medium">No quizzes match your current filters. Try adjusting your search.</p>
                      </div>
                      <Button
                        onClick={() => { setActiveGenre('All'); setQuizSearchTerm(''); setSortBy('newest'); }}
                        variant="secondary"
                        size="md"
                      >
                        <Icon name="bi-arrow-counterclockwise" className="mr-2" /> Reset Filters
                      </Button>
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
                              <Icon name={getGenreIcon(q.genre)} className="text-lg" />
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
                            <Button
                              onClick={(e) => { e.stopPropagation(); onStartQuiz(q); }}
                              variant="primary"
                              size="sm"
                            >
                              <Icon name="bi-play-fill" className="mr-1" /> Multi
                            </Button>
                            <Button
                              onClick={(e) => { e.stopPropagation(); onStartQuiz(q, true); }}
                              variant="glass"
                              size="sm"
                            >
                              <Icon name="bi-person-fill" className="mr-1" /> Solo
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {!quizLoading && quizzes.length > displayCount && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={() => setDisplayCount(prev => prev + 15)}
                    variant="secondary"
                    size="lg"
                  >
                    <Icon name="bi-arrow-down-circle" className="mr-2" /> Load More
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <section className="mb-12 space-y-8">
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto mb-6">
                <div className="flex flex-col gap-2 w-full sm:w-96">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Search Users</p>
                  <div className="relative w-full group shrink-0 flex gap-2">
                    <div className="relative flex-1">
                      <Icon name="bi-search" className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search users by username..."
                        value={userSearchInput}
                        onChange={(e) => setUserSearchInput(e.target.value)}
                        onKeyPress={handleUserKeyPress}
                        maxLength={100}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:opacity-30"
                      />
                    </div>
                    <Button onClick={handleUserSearch} variant="primary" size="md">Search</Button>
                  </div>
                </div>
              </div>

              {/* User Grid */}
              {userLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="glass h-40 rounded-2xl animate-pulse"></div>)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {users.length === 0 ? (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
                      <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-slate-700 text-5xl">
                        <Icon name="bi-person-fill" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">No Users Found</h3>
                        <p className="text-slate-500 max-w-sm font-medium">No users match your search. Try a different username.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {users.map(u => (
                        <Card
                          key={u.id}
                          className="flex items-center gap-4 cursor-pointer hover:bg-white/10"
                          variant="glass"
                          hover
                          onClick={() => navigate(`/user/${u.id}`)}
                        >
                          <img
                            src={u.profilePicture || generateAvatarUrl(u.username)}
                            alt={u.username}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
                          />
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-black text-white truncate text-lg">{u.username}</span>
                            <span className="text-xs text-slate-400 truncate">Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-blue-400 font-black flex items-center gap-1"><Icon name="bi-lightning-fill" /> {u.xp}</span>
                            <span className="text-xs text-yellow-400 font-black flex items-center gap-1"><Icon name="bi-coin" /> {u.coins}</span>
                          </div>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Pagination */}
              {!userLoading && userTotal > USERS_PER_PAGE && (
                <div className="flex justify-center mt-8 gap-2">
                  <Button
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    variant="secondary"
                    size="md"
                    disabled={userPage === 1}
                  >
                    <Icon name="bi-arrow-left" className="mr-1" /> Prev
                  </Button>
                  <span className="text-white font-bold px-4 py-2">Page {userPage} / {Math.ceil(userTotal / USERS_PER_PAGE)}</span>
                  <Button
                    onClick={() => setUserPage(p => p + 1)}
                    variant="secondary"
                    size="md"
                    disabled={userPage >= Math.ceil(userTotal / USERS_PER_PAGE)}
                  >
                    Next <Icon name="bi-arrow-right" className="ml-1" />
                  </Button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Browse;
