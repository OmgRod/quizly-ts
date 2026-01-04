
import React, { useState } from 'react';

interface AuthProps {
  onAuth: (username: string, password: string, isRegister: boolean) => Promise<void>;
  onBack: () => void;
  error?: string | null;
}

const Auth: React.FC<AuthProps> = ({ onAuth, onBack, error: externalError }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async () => {
    if (!username || !password) return;
    setLoading(true);
    setError("");

    try {
      await onAuth(username, password, isRegister);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "System fault. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const displayError = externalError || error;

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,#1e1b4b_0%,#020617_60%)]"></div>
      
      <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-8 sm:py-12 relative z-10">
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="glass p-12 rounded-[3.5rem] border-white/10 w-full max-w-md space-y-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-4xl text-blue-400 mx-auto mb-2 shadow-2xl shadow-blue-500/10">
            <i className={`bi ${isRegister ? 'bi-shield-plus' : 'bi-shield-lock-fill'}`}></i>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">
            {isRegister ? 'Create Account' : 'Sign In'}
          </h2>
          <p className="text-slate-500 text-sm font-medium">Welcome to Quizly</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }} className="space-y-4">
          <div className="relative group">
            <i className="bi bi-person absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"></i>
            <input 
              type="text" 
              name="username"
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              maxLength={30}
              className="w-full bg-white/5 border border-white/5 p-5 pl-14 rounded-2xl text-white font-bold text-lg focus:outline-none focus:border-blue-500/50 transition-all"
              autoFocus
            />
          </div>
          <div className="relative group">
            <i className="bi bi-key absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"></i>
            <input 
              type="password" 
              name="password"
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              maxLength={100}
              className="w-full bg-white/5 border border-white/5 p-5 pl-14 rounded-2xl text-white font-bold text-lg focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
          
          {displayError && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-black uppercase text-center">{displayError}</div>}

          <button 
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl text-xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-30"
          >
            {loading ? "Loading..." : (isRegister ? "Create Account" : "Sign In")}
          </button>
        </form>

        <div className="text-center space-y-4">
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-slate-500 font-black hover:text-white transition-colors text-xs uppercase tracking-widest"
          >
            {isRegister ? "Already have an account? Sign In" : "Don't have an account? Create One"}
          </button>
          <div className="w-full h-px bg-white/5"></div>
          <button onClick={onBack} className="text-slate-700 font-bold hover:text-slate-500 text-[10px] uppercase tracking-[0.5em]">
            Back
          </button>
        </div>
      </div>
    </div>
      </div>
    </div>
  );
};

export default Auth;
