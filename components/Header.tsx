
import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { Language } from '../types';
import { UI_TEXT } from '../translations';
import { LANGUAGES } from '../constants';

interface HeaderProps {
  scenarioCount: number; 
  lastVerified: string;
  onAdminClick?: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({
  lastVerified,
  onAdminClick,
  language,
  setLanguage
}) => {
  const [showLangModal, setShowLangModal] = useState(false);
  const t = UI_TEXT[language];
  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div className="relative">
      <GlassCard className="p-6 text-center border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl">
        <div className="flex justify-between items-start">
            {/* Language Selector Button */}
            <div className="relative z-40">
                <button
                    onClick={() => setShowLangModal(!showLangModal)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/5 text-xs font-bold text-gray-200"
                >
                    <span className="text-base">{currentLang.flag}</span>
                    <span className="uppercase">{currentLang.code}</span>
                    <span className="text-[10px] opacity-60">▼</span>
                </button>

                {/* Scrollable Language Modal */}
                {showLangModal && (
                    <>
                        <div 
                            className="fixed inset-0 z-40 bg-transparent" 
                            onClick={() => setShowLangModal(false)}
                        />
                        <div className="absolute top-full left-0 mt-2 w-48 max-h-64 overflow-y-auto bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col py-2 animate-fade-in custom-scrollbar">
                            <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">
                                Select Language
                            </div>
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setShowLangModal(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-xs font-medium flex items-center gap-3 transition-colors ${
                                        language === lang.code 
                                            ? 'bg-emerald-500/10 text-emerald-400' 
                                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <span className="text-lg">{lang.flag}</span>
                                    <span>{lang.label}</span>
                                    {language === lang.code && <span className="ml-auto text-emerald-500">✓</span>}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="flex-1 px-4">
                <h1 className="text-2xl md:text-3xl font-black mb-1 tracking-tight text-white drop-shadow-sm">
                {t.title}
                </h1>
                <p className="text-xs text-emerald-400 font-medium tracking-widest uppercase opacity-80">
                {t.subtitle}
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
                <span>{t.connected}</span>
             </div>
        </div>
      </GlassCard>
    </div>
  );
};
