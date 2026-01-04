import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950/50 border-t border-white/5 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Quizly. All rights reserved.
          </div>
          
          <div className="flex gap-6">
            <Link 
              to="/terms" 
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              Terms of Service
            </Link>
            <Link 
              to="/privacy" 
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
