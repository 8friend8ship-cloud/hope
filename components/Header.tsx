
import React from 'react';
import { GlassCard } from './GlassCard';

interface HeaderProps {
  scenarioCount: number; 
  lastVerified: string;
  onAdminClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lastVerified,
  onAdminClick
}) => {
  return (
    <div className="relative">
      <GlassCard className="p-6 text-center border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl">
        <div className="flex justify-between items-start">
            <div className="w-8"></div> {/* Spacer for balance */}
            <div>
                <h1 className="text-2xl md:text-3xl font-black mb-1 tracking-tight text-white drop-shadow-sm">
                희망구매플랫폼
                </h1>
                <p className="text-xs text-emerald-400 font-medium tracking-widest uppercase opacity-80">
                Future Simulation v4.0
                </p>
            </div>
            <button 
                onClick={onAdminClick}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/20 hover:text-white/60"
            >
                ⚙️
            </button>
        </div>
        
        <div className="mt-6 flex justify-center gap-4 text-[10px] md:text-xs font-mono text-gray-400">
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 rounded-full border border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Live Data: {lastVerified.split(' ')[0]}</span>
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 rounded-full border border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>100 Countries</span>
             </div>
        </div>
      </GlassCard>
    </div>
  );
};
