import React from 'react';

interface ProgressBarProps {
  progress: number;
  status: string;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
        <span className="text-blue-400">{status}</span>
        <span className="text-slate-500">{Math.floor(progress)}%</span>
      </div>
      <div className="w-full h-2 sm:h-3 bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
