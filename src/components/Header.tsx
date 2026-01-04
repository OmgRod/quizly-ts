import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, getLevelFromXP } from '../types';
import { generateAvatarUrl } from '../utils/avatar';

interface HeaderProps {
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const checkOverflow = () => {
      if (!navRef.current || !navLinksRef.current) return;
      
      // Mobile-first: always show hamburger on screens smaller than 768px
      if (window.innerWidth < 768) {
        setShowHamburger(true);
        return;
      }
      
      const nav = navRef.current;
      const navLinks = navLinksRef.current;
      
      // Get all children widths
      const navRect = nav.getBoundingClientRect();
      const availableWidth = navRect.width;
      
      // Calculate total width needed
      let totalWidth = 0;
      Array.from(nav.children).forEach((child) => {
        if (child !== navLinksRef.current?.parentElement) {
          totalWidth += (child as HTMLElement).offsetWidth;
        }
      });
      
      // Add nav-links width
      totalWidth += navLinks.offsetWidth;
      
      // Add some padding/margin buffer (150px for safety)
      const needsHamburger = totalWidth > availableWidth - 150;
      setShowHamburger(needsHamburger);
    };
    
    // Debounce to prevent twitching
    let timeoutId: NodeJS.Timeout;
    const debouncedCheck = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkOverflow, 100);
    };
    
    // Check on mount
    checkOverflow();
    
    window.addEventListener('resize', debouncedCheck);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedCheck);
    };
  }, [user]); // Re-check when user changes (affects navbar content)
  
  return (
    <nav ref={navRef} className="fixed top-0 left-0 w-full z-50 glass border-b border-white/5 px-4 sm:px-8 py-4 flex items-center justify-between">
      <style>{`
        .nav-links-hidden {
          display: none;
        }
        .hamburger-btn-hidden {
          display: none;
        }
      `}</style>
      <div className="flex items-center gap-4 sm:gap-8">
        <Link 
          to="/"
          className="text-2xl sm:text-3xl font-black tracking-tighter text-white cursor-pointer group"
        >
          QUIZ<span className="text-blue-400 group-hover:text-indigo-400 transition-colors">LY</span>
        </Link>
        
        <div ref={navLinksRef} className={`nav-links flex items-center gap-1 ${showHamburger ? 'nav-links-hidden' : ''}`}>
          <Link 
            to="/explore"
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${location.pathname === '/explore' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-white'}`}
          >
            <i className="bi bi-compass mr-2"></i> Explore
          </Link>
          <Link 
            to="/browse"
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${location.pathname === '/browse' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-white'}`}
          >
            <i className="bi bi-collection mr-2"></i> Browse
          </Link>
          <Link 
            to={user ? '/create' : '/auth'}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${location.pathname === '/create' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-white'}`}
          >
            <i className="bi bi-plus-square mr-2"></i> Create
          </Link>
          <Link 
            to="/join"
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${location.pathname === '/join' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-white'}`}
          >
            <i className="bi bi-hash mr-1 text-blue-400"></i> Enter PIN
          </Link>
          {user && (
            <Link 
              to="/leaderboard"
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${location.pathname === '/leaderboard' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-white'}`}
            >
              <i className="bi bi-trophy mr-2"></i> Leaderboard
            </Link>
          )}
          {user?.isAdmin && (
            <Link 
              to="/admin"
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${location.pathname === '/admin' ? 'text-white bg-purple-600/30 border border-purple-500' : 'text-purple-400 hover:text-white'}`}
            >
              <i className="bi bi-shield-lock mr-2"></i> Admin
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {user ? (
          <Link 
            to="/dashboard"
            className={`flex items-center gap-2 sm:gap-4 bg-white/5 px-2 sm:px-4 py-2 rounded-2xl border border-white/5 cursor-pointer transition-all hover:bg-white/10 ${location.pathname === '/dashboard' ? 'border-blue-500/50' : ''}`}
          >
            <div className="flex flex-col items-end">
              <span className="text-white font-black text-xs">{user.username}</span>
              <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Level {getLevelFromXP(user.xp)}</span>
            </div>
            <img 
              src={user.profilePicture || generateAvatarUrl(user.username)}
              alt={user.username}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain border border-white/10 bg-white/5"
            />
          </Link>
        ) : (
          <Link 
            to="/auth"
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <i className="bi bi-door-open-fill mr-1 sm:mr-2"></i><span className="hidden sm:inline">Login</span><span className="sm:hidden">Log In</span>
          </Link>
        )}
        
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`hamburger-btn text-white p-2 hover:bg-white/10 rounded-xl transition-all active:scale-95 ${showHamburger ? '' : 'hamburger-btn-hidden'}`}
          aria-label="Toggle menu"
        >
          <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'} text-2xl`}></i>
        </button>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && showHamburger && (
        <div className="sm:hidden absolute top-full left-0 w-full bg-slate-900 border-b border-white/10 z-50 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col max-h-[calc(100vh-100px)] overflow-y-auto">
            {/* User Section */}
            {user && (
            <div className="p-4 border-b border-white/10 bg-slate-800/50">
              <Link 
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 bg-slate-800 p-3 rounded-xl border border-white/10 hover:bg-slate-700 transition-all"
              >
                <img 
                  src={user.profilePicture || generateAvatarUrl(user.username)}
                  alt={user.username}
                  className="w-12 h-12 rounded-xl object-contain border border-white/10 bg-white/5"
                />
                <div className="flex flex-col">
                  <span className="text-white font-black text-sm">{user.username}</span>
                  <span className="text-xs text-blue-400 font-black uppercase tracking-widest">Level {getLevelFromXP(user.xp)}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{user.xp} XP</span>
                </div>
              </Link>
            </div>
          )}
          
          {/* Navigation Links */}
          <div className="p-4 bg-slate-900/50">
            <div className="flex flex-col gap-2">
              {/* Main Navigation */}
              <div className="mb-2">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 px-2">Navigation</p>
                <Link 
                  to="/explore"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === '/explore' ? 'text-white bg-blue-600 border border-blue-500' : 'text-slate-300 bg-slate-800 hover:text-white hover:bg-slate-700'}`}
                >
                  <i className="bi bi-compass text-lg w-5"></i>
                  <span>Explore Quizzes</span>
                </Link>
                <Link 
                  to="/browse"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === '/browse' ? 'text-white bg-blue-600 border border-blue-500' : 'text-slate-300 bg-slate-800 hover:text-white hover:bg-slate-700'}`}
                >
                  <i className="bi bi-collection text-lg w-5"></i>
                  <span>Browse All</span>
                </Link>
                <Link 
                  to={user ? '/create' : '/auth'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === '/create' ? 'text-white bg-blue-600 border border-blue-500' : 'text-slate-300 bg-slate-800 hover:text-white hover:bg-slate-700'}`}
                >
                  <i className="bi bi-plus-square text-lg w-5"></i>
                  <span>Create Quiz</span>
                </Link>
                <Link 
                  to="/join"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === '/join' ? 'text-white bg-blue-600 border border-blue-500' : 'text-slate-300 bg-slate-800 hover:text-white hover:bg-slate-700'}`}
                >
                  <i className="bi bi-hash text-lg w-5 text-blue-400"></i>
                  <span>Enter PIN</span>
                </Link>
                <Link 
                  to="/leaderboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === '/leaderboard' ? 'text-white bg-blue-600 border border-blue-500' : 'text-slate-300 bg-slate-800 hover:text-white hover:bg-slate-700'}`}
                >
                  <i className="bi bi-trophy text-lg w-5 text-amber-400"></i>
                  <span>Global Leaderboard</span>
                </Link>
              </div>

              {/* User Menu */}
              {user && (
                <div className="mb-2">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 px-2">My Quizly</p>
                  <Link 
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === '/dashboard' ? 'text-white bg-blue-600 border border-blue-500' : 'text-slate-300 bg-slate-800 hover:text-white hover:bg-slate-700'}`}
                  >
                    <i className="bi bi-speedometer2 text-lg w-5"></i>
                    <span>Dashboard</span>
                  </Link>
                  {user?.isAdmin && (
                    <Link 
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === '/admin' ? 'text-white bg-purple-600 border border-purple-500' : 'text-slate-300 bg-slate-800 hover:text-white hover:bg-slate-700'}`}
                    >
                      <i className="bi bi-shield-lock text-lg w-5"></i>
                      <span>Admin Panel</span>
                    </Link>
                  )}
                  <Link 
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === '/settings' ? 'text-white bg-blue-600 border border-blue-500' : 'text-slate-300 bg-slate-800 hover:text-white hover:bg-slate-700'}`}
                  >
                    <i className="bi bi-gear text-lg w-5"></i>
                    <span>Account Settings</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {user && (
            <div className="p-4 border-t border-white/10 bg-slate-800/50">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  // Add logout logic here if needed
                  window.location.href = '/';
                }}
                className="flex items-center justify-center gap-2 w-full bg-red-600/10 hover:bg-red-600/20 text-red-400 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest border border-red-600/20 active:scale-95 transition-all"
              >
                <i className="bi bi-box-arrow-right"></i>
                <span>Logout</span>
              </button>
            </div>
          )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Header;
