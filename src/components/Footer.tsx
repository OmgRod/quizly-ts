import React from 'react';
import { Link } from 'react-router-dom';
import { FaGithub, FaYoutube, FaXTwitter, FaDiscord, FaHeart } from 'react-icons/fa6';

const Footer: React.FC = () => {
  const socialLinks = [
    {
      name: 'GitHub',
      url: 'https://github.com/OmgRod/quizly-ts',
      icon: FaGithub,
      color: 'hover:text-gray-300'
    },
    {
      name: 'YouTube',
      url: 'https://youtube.com/@OmgRodYT',
      icon: FaYoutube,
      color: 'hover:text-red-500'
    },
    {
      name: 'X (Twitter)',
      url: 'https://twitter.com/0mgRod',
      icon: FaXTwitter,
      color: 'hover:text-slate-300'
    },
    // {
    //   name: 'Discord',
    //   url: 'https://discord.gg',
    //   icon: FaDiscord,
    //   color: 'hover:text-indigo-400'
    // }
  ];

  return (
    <footer className="bg-slate-950/50 border-t border-white/5 py-8 mt-auto">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-6">
          {/* Left - Branding */}
          <div className="text-center md:text-left">
            <h3 className="text-white font-black text-lg mb-1">Quizly</h3>
            <p className="text-slate-400 text-xs max-w-xs">
              Create, share, and play interactive quizzes. Compete globally.
            </p>
          </div>

          {/* Center - Quick Links */}
          <div className="flex gap-6">
            <Link 
              to="/terms" 
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              Terms
            </Link>
            <Link 
              to="/privacy" 
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              Privacy
            </Link>
          </div>

          {/* Right - Social Links */}
          <div className="flex gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.url}
                  title={social.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-slate-400 transition text-xl ${social.color}`}
                  aria-label={social.name}
                >
                  <Icon />
                </a>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 pt-6 text-center">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} Quizly. All rights reserved. Made with <FaHeart className="inline mx-1 text-red-500" /> by OmgRod
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
