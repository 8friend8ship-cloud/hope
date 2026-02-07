
import React from 'react';

interface AdBannerProps {
    onReward?: () => void;
}

export const AdBanner: React.FC<AdBannerProps> = () => {
  return (
    <div className="space-y-4 my-6">
      {/* Banner 1 */}
      <div className="w-full h-[60px] bg-black/20 border border-white/5 rounded-xl flex flex-col items-center justify-center text-[10px] text-white/20 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite]"></div>
        <span>AD SPACE 320x50</span>
      </div>
      
      {/* Banner 2 (Formerly Reward) */}
      <div className="w-full h-[60px] bg-black/20 border border-white/5 rounded-xl flex flex-col items-center justify-center text-[10px] text-white/20 overflow-hidden relative">
         <span>AD SPACE 320x50</span>
      </div>
    </div>
  );
};
