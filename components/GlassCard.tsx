import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', id }) => {
  return (
    <div id={id} className={`glass rounded-3xl shadow-2xl ${className}`}>
      {children}
    </div>
  );
};
