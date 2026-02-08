
import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { UserInput } from '../types';
import { INITIAL_DB, GLOBAL_100 } from '../constants';

interface InputFormProps {
  input: UserInput;
  onChange: (field: keyof UserInput, value: string | number) => void;
  onGenerate: (parsedData: Partial<UserInput>, rawText?: string) => void;
  onRandom: () => void;
  onDownload: () => void;
  canDownload: boolean;
  isGenerating: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({
  input,
  onChange,
  onGenerate,
  onRandom,
  onDownload,
  canDownload,
  isGenerating
}) => {
  const [prompt, setPrompt] = useState('');
  
  // Basic Regex Parsing for immediate UI feedback (Client-side)
  // The heavy lifting will be done by AI in App.tsx if rawText is passed
  const analyzeAndGenerate = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      onRandom();
      return;
    }

    const parsedData: Partial<UserInput> = {};
    const text = trimmedPrompt;

    // 1. Age
    const ageMatch = text.match(/(\d+)(?:세|살)/);
    if (ageMatch) parsedData.age = ageMatch[1];

    // 2. Months/Years
    const yearMatch = text.match(/(\d+)(?:년)/);
    const monthMatch = text.match(/(\d+)(?:개월|달)/);
    if (yearMatch) parsedData.months = parseInt(yearMatch[1]) * 12;
    else if (monthMatch) parsedData.months = parseInt(monthMatch[1]);
    
    // 3. Start & Goal
    let newStart: string | undefined;
    let newGoal: string | undefined;

    const directionMatch = text.match(/([가-힣a-zA-Z\s]+?)(?:에서|부터| 떠나서)\s*([가-힣a-zA-Z\s]+?)(?:(?:으?로)|(?:에))/);
    if (directionMatch) {
      newStart = directionMatch[1].trim();
      newGoal = directionMatch[2].trim();
    } else {
      // Simple fallback logic
      newStart = '한국'; 
      for (const [key, config] of Object.entries(GLOBAL_100)) {
        const city = config.cities.find(c => text.includes(c));
        if (city) {
          newGoal = city;
          break;
        }
        if (text.includes(key)) {
          newGoal = config.cities[0] || key;
          break;
        }
      }
    }

    if (newStart) parsedData.start = newStart;
    if (newGoal) parsedData.goal = newGoal;

    // 4. Job
    const jobs = ['개발자', '디자이너', '용접공', '간호사', '요리사', '사업', '은퇴', '유학', '주재원', '인테리어', '자영업', '프리랜서', '가장', '업자'];
    const foundJob = jobs.find(j => text.includes(j));
    if (foundJob) parsedData.job = foundJob;

    // Pass both the regex-parsed data AND the raw text for AI analysis
    onGenerate(parsedData, trimmedPrompt);
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      analyzeAndGenerate();
    }
  };

  return (
    <GlassCard className="p-1">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-gray-900 ring-1 ring-white/10 rounded-2xl p-4 md:p-6 space-y-4">
          
          <div className="flex justify-between items-center mb-2">
            <label className="text-emerald-400 font-bold text-sm tracking-wider uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              AI Simulation Input
            </label>
            <div className="text-xs text-gray-400">100개국 데이터 연동됨</div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-white text-lg md:text-xl font-medium placeholder-gray-600 focus:outline-none resize-none h-24 leading-relaxed"
            placeholder="예) 40세, 아내랑 아이 둘 데리고 캐나다 밴쿠버 이민 가고 싶어. 자산은 3억 정도."
          />

          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <div className="flex gap-2">
               <button onClick={onRandom} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg text-gray-400 transition-colors flex items-center gap-1">
                 <span>🎲</span> 예시 랜덤 입력
               </button>
               {canDownload && (
                 <button onClick={onDownload} className="text-xs bg-purple-500/10 hover:bg-purple-500/20 px-3 py-2 rounded-lg text-purple-300 transition-colors flex items-center gap-1 border border-purple-500/20">
                   <span>📄</span> PDF 저장
                 </button>
               )}
            </div>
            
            <button 
              onClick={analyzeAndGenerate}
              disabled={isGenerating}
              className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 transition-all transform active:scale-95 ${
                isGenerating 
                  ? 'bg-gray-700 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/20'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  분석중...
                </>
              ) : (
                <>
                  <span>🚀</span> 시뮬레이션 시작
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
