
import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { saveApiKey, validateApiKey } from '../aiService';

interface ApiKeyModalProps {
  onClose: () => void;
  isOpen: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, isOpen }) => {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    // Load existing key if any
    const stored = localStorage.getItem('user_gemini_key');
    if (stored) setKey(stored);
  }, [isOpen]);

  const handleTestAndSave = async () => {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
        setMsg("API 키를 입력해주세요.");
        return;
    }

    setStatus('testing');
    setMsg("Google Gemini 서버 (gemini-3-flash) 연결 중...");

    const result = await validateApiKey(trimmedKey);
    
    if (result.isValid) {
        saveApiKey(trimmedKey);
        setStatus('success');
        setMsg("✅ 연결 성공! 키가 로컬에 안전하게 저장되었습니다.");
        setTimeout(() => {
            onClose();
            setStatus('idle');
            setMsg('');
        }, 1500);
    } else {
        setStatus('error');
        setMsg(result.error || "❌ 연결 실패: 알 수 없는 오류가 발생했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-fade-in">
      <GlassCard className="w-full max-w-md p-8 border-l-4 border-l-yellow-500 shadow-2xl">
        <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔑</div>
            <h2 className="text-xl font-bold text-white">External API Key Setup</h2>
            <p className="text-xs text-gray-400 mt-2">
                이 앱은 서버가 없는 클라이언트 전용 앱입니다.<br/>
                AI 기능을 사용하려면 본인의 Gemini API 키가 필요합니다.
            </p>
        </div>

        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">GEMINI API KEY</label>
                <input 
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white focus:border-yellow-500 focus:outline-none font-mono text-sm"
                    placeholder="AIzaSy..."
                />
            </div>

            {msg && (
                <div className={`text-xs p-3 rounded-lg text-center font-bold whitespace-pre-line ${status === 'error' ? 'bg-red-900/50 text-red-200' : status === 'success' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-white/5 text-gray-300'}`}>
                    {msg}
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button 
                    onClick={onClose}
                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-sm text-gray-300 transition-colors"
                >
                    취소
                </button>
                <button 
                    onClick={handleTestAndSave}
                    disabled={status === 'testing'}
                    className="flex-[2] py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    {status === 'testing' ? (
                        <>
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           연결 테스트 중...
                        </>
                    ) : (
                        "연결 테스트 및 저장"
                    )}
                </button>
            </div>
            
            <div className="text-[10px] text-gray-500 text-center mt-4">
                * 키는 서버로 전송되지 않으며, 브라우저(LocalStorage)에만 저장됩니다.<br/>
                * <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline hover:text-white">Google AI Studio</a>에서 키를 발급받으세요.
            </div>
        </div>
      </GlassCard>
    </div>
  );
};
