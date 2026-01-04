import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  ...props
}) => {
  const baseStyles = 'font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20',
    secondary: 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20',
    ghost: 'text-slate-500 hover:text-white hover:bg-white/5',
    glass: 'glass border-white/5 hover:border-indigo-500/50 text-white'
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-[10px] rounded-xl',
    md: 'px-6 py-3 text-xs rounded-2xl',
    lg: 'px-10 py-4 text-sm rounded-[2rem]'
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
