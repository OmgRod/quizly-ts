import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'bordered';
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  hover = false
}) => {
  const variants = {
    default: 'bg-white/5 border border-white/5',
    glass: 'glass border-white/10',
    bordered: 'border-2 border-white/10'
  };

  const hoverStyles = hover ? 'hover:scale-[1.02] transition-transform' : '';

  return (
    <div className={cn('rounded-[2rem] p-6', variants[variant], hoverStyles, className)}>
      {children}
    </div>
  );
};
