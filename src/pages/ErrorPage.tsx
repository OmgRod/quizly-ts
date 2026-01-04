import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ErrorPageProps {
  defaultCode?: string;
  defaultMessage?: string;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ defaultCode = '500', defaultMessage = 'Something went wrong' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const code = searchParams.get('code') || defaultCode;
  const message = searchParams.get('message') || defaultMessage;

  const errorDetails: Record<string, { title: string; description: string; icon: string }> = {
    '404': {
      title: 'Page Not Found',
      description: 'The page you\'re looking for doesn\'t exist or has been moved.',
      icon: 'bi-search'
    },
    '403': {
      title: 'Access Forbidden',
      description: 'You don\'t have permission to access this resource.',
      icon: 'bi-shield-lock'
    },
    '410': {
      title: 'Game Session Ended',
      description: 'This game room has ended or expired. Start a new game to play again.',
      icon: 'bi-hourglass-split'
    },
    '411': {
      title: 'Profile Unavailable',
      description: 'This user either doesn\'t exist or has chosen to keep their profile private.',
      icon: 'bi-person-slash'
    },
    '500': {
      title: 'Server Error',
      description: 'Something went wrong on our end. Please try again later.',
      icon: 'bi-exclamation-triangle'
    },
    '503': {
      title: 'Service Unavailable',
      description: 'The service is temporarily unavailable. Please try again later.',
      icon: 'bi-cloud-slash'
    }
  };

  const error = errorDetails[code] || errorDetails['500'];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-8 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center space-y-8">
          {/* Error Code */}
          <div className="space-y-4">
            <div className="text-[12rem] font-black leading-none">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                {code}
              </span>
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
              {error.title}
            </h1>
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full flex items-center justify-center">
              <i className={`bi ${error.icon} text-6xl text-purple-400`}></i>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <p className="text-slate-400 text-lg max-w-md mx-auto font-medium">
              {error.description}
            </p>
            {message && message !== 'undefined' && (
              <p className="text-slate-500 text-sm font-mono bg-white/5 px-6 py-3 rounded-2xl border border-white/10 inline-block">
                {message}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <button
              onClick={() => navigate(-1)}
              className="glass border-white/10 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
            >
              <i className="bi bi-arrow-left mr-2"></i> Go Back
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              <i className="bi bi-house-fill mr-2"></i> Home
            </button>
          </div>
        </div>

        {/* Decorative element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10">
          <div className="w-[40rem] h-[40rem] bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
