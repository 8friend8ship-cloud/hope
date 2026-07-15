
import React from 'react';
import { UI_TEXT } from '../translations';
import { Language } from '../types';

interface ActionButtonsProps {
  onGoogleSearch: () => void;
  onYoutubeSearch: () => void;
  onRandom: () => void;
  onRefresh: () => void;
  onReward: () => void;
  language?: Language;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onGoogleSearch,
  onYoutubeSearch,
  onRandom,
  onRefresh,
  language = 'ko'
}) => {
  const t = UI_TEXT[language] || UI_TEXT['en'];
  const btnClass = "flex flex-col items-center justify-center h-20 bg-[#1e293b]/50 border border-white/5 rounded-2xl hover:bg-[#1e293b] active:scale-95 transition-all text-xs md:text-sm font-medium shadow-lg backdrop-blur-sm text-gray-300 hover:text-white hover:border-white/20";

  return (
    <div className="grid grid-cols-4 gap-3 pb-8">
      <button onClick={onGoogleSearch} className={btnClass}>
        <span className="text-xl md:text-2xl mb-1 opacity-80">🔎</span>
        {t.btnSearch}
      </button>
      <button onClick={onYoutubeSearch} className={btnClass}>
        <span className="text-xl md:text-2xl mb-1 opacity-80">▶️</span>
        {t.btnVlog}
      </button>
      <button onClick={onRandom} className={btnClass}>
        <span className="text-xl md:text-2xl mb-1 opacity-80">🎲</span>
        {t.btnRandom}
      </button>
      <button onClick={onRefresh} className={`${btnClass} text-emerald-400 hover:text-emerald-300`}>
        <span className="text-xl md:text-2xl mb-1 opacity-80">🔄</span>
        {t.btnReset}
      </button>
    </div>
  );
};
