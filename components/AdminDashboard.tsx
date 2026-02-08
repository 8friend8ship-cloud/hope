
import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { ScenarioDB, ScenarioTemplate, DownloadableResource, UserInput, StandaloneEssay } from '../types';
import { DEFAULT_TEMPLATES } from '../constants';
import { generateBatchRandomSamples, generateNewScenarioTemplate, suggestNewScenarioTopics, validateSystemData } from '../aiService';
import { ApiKeyModal } from './ApiKeyModal';

interface AdminDashboardProps {
  db: ScenarioDB;
  onUpdateDb: React.Dispatch<React.SetStateAction<ScenarioDB>>;
  templates: ScenarioTemplate[];
  onUpdateTemplates: React.Dispatch<React.SetStateAction<ScenarioTemplate[]>>;
  onClose: () => void;
}

// --- Data Export Modal (Fixing GitHub Save Issue) ---
const DataExportModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    db: ScenarioDB; 
    templates: ScenarioTemplate[] 
}> = ({ isOpen, onClose, db, templates }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    // Convert current state into a format ready to be pasted into constants.ts
    const exportCode = `
// --- PASTE THIS INTO constants.ts TO SAVE PERMANENTLY ---

import { ScenarioDB, ScenarioTemplate } from './types';

export const DEFAULT_TEMPLATES: ScenarioTemplate[] = ${JSON.stringify(templates, null, 2)};

export const INITIAL_DB: ScenarioDB = ${JSON.stringify(db, null, 2)};
    `;

    const handleCopy = () => {
        navigator.clipboard.writeText(exportCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-fade-in">
            <GlassCard className="w-full max-w-4xl h-[80vh] flex flex-col p-8 border-l-4 border-l-blue-500 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white">✕</button>
                
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        💾 데이터 영구 저장 (GitHub용 코드 변환)
                    </h2>
                    <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                        브라우저 보안상 GitHub에 직접 저장할 수 없습니다.<br/>
                        아래 코드를 복사하여 프로젝트의 <code>src/constants.ts</code> 파일에 붙여넣으면, <strong>지금 보이는 데이터(템플릿, 예시)가 영구적으로 저장</strong>됩니다.
                    </p>
                </div>

                <div className="flex-1 bg-black/50 rounded-xl border border-white/10 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center p-2 bg-white/5 border-b border-white/10">
                        <span className="text-xs font-mono text-gray-500 ml-2">constants.ts export</span>
                        <button 
                            onClick={handleCopy}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                        >
                            {copied ? "✅ 복사 완료!" : "📋 코드 전체 복사"}
                        </button>
                    </div>
                    <textarea 
                        readOnly
                        value={exportCode}
                        className="flex-1 bg-transparent p-4 text-xs font-mono text-blue-200 resize-none focus:outline-none"
                    />
                </div>
                
                <div className="mt-4 text-center">
                    <button onClick={onClose} className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-white">
                        닫기
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};

const RandomSampleEditor: React.FC<{db: ScenarioDB, onUpdateDb: React.Dispatch<React.SetStateAction<ScenarioDB>>, templates: ScenarioTemplate[]}> = ({ db, onUpdateDb, templates }) => {
    // Safety check: ensure db.randomSamples is an array
    const [samples, setSamples] = useState<Partial<UserInput>[]>(Array.isArray(db.randomSamples) ? db.randomSamples : []);

    useEffect(() => {
        if(Array.isArray(db.randomSamples)) {
            setSamples(db.randomSamples);
        }
    }, [db.randomSamples]);

    const handleUpdate = (index: number, field: keyof UserInput, value: string | number | boolean) => {
        const newSamples = [...samples];
        if (newSamples[index]) {
            newSamples[index] = { ...newSamples[index], [field]: value };
             if (field === 'useAI' && value === true) {
                newSamples[index].forcedTemplateId = '';
            }
            setSamples(newSamples);
        }
    };

    const handleSave = () => {
        onUpdateDb(prev => ({ ...prev, randomSamples: samples }));
        alert("✅ 저장되었습니다.");
    };
    
    const handleAdd = () => {
        setSamples([...samples, { age: '30', job: '직장인', start: '서울', goal: '미국', months: 24, forcedTemplateId: '', isDomestic: false, useAI: false }]);
    };
    
    const handleRemove = (index: number) => {
        if (confirm('이 예시를 삭제하시겠습니까?')) {
            const newSamples = [...samples];
            newSamples.splice(index, 1);
            setSamples(newSamples);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-6 md:p-8 space-y-6 pb-20">
            <GlassCard className="p-6 border-l-4 border-l-purple-500">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                           🔀 랜덤 예시 설정
                           <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">{samples.length}개</span>
                        </h3>
                    </div>
                    <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-white text-sm">
                        저장
                    </button>
                 </div>

                 <div className="grid gap-4">
                    {samples.map((sample, index) => (
                         <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4 relative">
                            <button onClick={() => handleRemove(index)} className="absolute top-2 right-2 text-red-500 font-bold hover:text-white">✕</button>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                <input value={sample.age || ''} onChange={(e) => handleUpdate(index, 'age', e.target.value)} className="bg-black/30 p-2 rounded text-sm text-white" placeholder="나이" />
                                <input value={sample.job || ''} onChange={(e) => handleUpdate(index, 'job', e.target.value)} className="bg-black/30 p-2 rounded text-sm text-white" placeholder="직업" />
                                <input value={sample.start || ''} onChange={(e) => handleUpdate(index, 'start', e.target.value)} className="bg-black/30 p-2 rounded text-sm text-white" placeholder="출발" />
                                <input value={sample.goal || ''} onChange={(e) => handleUpdate(index, 'goal', e.target.value)} className="bg-black/30 p-2 rounded text-sm text-white" placeholder="도착" />
                                <select value={sample.isDomestic ? 'domestic' : 'intl'} onChange={(e) => handleUpdate(index, 'isDomestic', e.target.value === 'domestic')} className="bg-black/30 p-2 rounded text-sm text-white">
                                    <option value="intl">해외</option>
                                    <option value="domestic">국내</option>
                                </select>
                                <div className="flex items-center gap-2">
                                     <input type="checkbox" checked={!!sample.useAI} onChange={(e) => handleUpdate(index, 'useAI', e.target.checked)} className="w-4 h-4" />
                                     <span className={`text-xs ${sample.useAI ? 'text-emerald-400 font-bold' : 'text-gray-400'}`}>AI 생성</span>
                                </div>
                            </div>
                         </div>
                    ))}
                    <button onClick={handleAdd} className="w-full py-3 bg-white/5 rounded-xl text-gray-400 hover:text-white border border-dashed border-white/20">+ 추가</button>
                 </div>
            </GlassCard>
        </div>
    );
};

const EssayEditor: React.FC<{ db: ScenarioDB; onUpdateDb: React.Dispatch<React.SetStateAction<ScenarioDB>> }> = ({ db, onUpdateDb }) => {
    // Safety check: ensure db.essays is an array
    const [essays, setEssays] = useState<StandaloneEssay[]>(Array.isArray(db.essays) ? db.essays : []);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<StandaloneEssay>({ id: '', title: '', content: '', tags: [], date: '' });

    useEffect(() => {
        if(Array.isArray(db.essays)) {
            setEssays(db.essays);
        }
    }, [db.essays]);

    const handleCreate = () => {
        setEditingId('new');
        setFormData({ id: `essay_${Date.now()}`, title: '', content: '', tags: [], date: new Date().toLocaleDateString() });
    };

    const handleSave = () => {
        onUpdateDb(prev => {
            const current = Array.isArray(prev.essays) ? prev.essays : [];
            const updated = editingId === 'new' 
                ? [formData, ...current] 
                : current.map(e => e.id === formData.id ? formData : e);
            return { ...prev, essays: updated };
        });
        setEditingId(null);
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 p-6">
            <div className="w-full md:w-1/3 space-y-4">
                <button onClick={handleCreate} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white">+ 새 칼럼 작성</button>
                <div className="space-y-2 h-[400px] overflow-y-auto">
                    {essays.map(essay => (
                        <div key={essay.id} className="p-4 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer" onClick={() => { setEditingId(essay.id); setFormData(essay); }}>
                            <h4 className="font-bold text-sm text-white truncate">{essay.title}</h4>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-full md:w-2/3 bg-black/20 rounded-xl p-6">
                {editingId ? (
                    <div className="flex flex-col h-full space-y-4">
                        <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-transparent text-xl font-bold text-white border-b border-white/10 pb-2" placeholder="제목" />
                        <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="flex-1 bg-transparent text-sm text-gray-300 resize-none p-4 border border-white/5 rounded-lg h-[300px]" placeholder="내용" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs font-bold text-gray-400">취소</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg">저장</button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">글을 선택하거나 작성하세요.</div>
                )}
            </div>
        </div>
    );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  db, 
  onUpdateDb, 
  templates, 
  onUpdateTemplates, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'control' | 'templates' | 'samples' | 'essays'>('control');
  const [logs, setLogs] = useState<string[]>([]);
  const [aiMaintenance, setAiMaintenance] = useState({ updateTemplates: false, updateSamples: false, validate: false });
  const [batchSize, setBatchSize] = useState<number>(3); 
  const [aiRunning, setAiRunning] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev]);
  };

  const runAIMaintenance = async () => {
    setAiRunning(true);
    addLog(`🚀 AI 자동 유지보수 시작 (Batch Size: ${batchSize})...`);
    
    try {
        const generatedTemplates: ScenarioTemplate[] = [];
        const generatedSamples: Partial<UserInput>[] = [];

        if (aiMaintenance.validate) {
            addLog("🔍 데이터 정합성 검사 중...");
            const report = await validateSystemData(db, templates);
            if (Array.isArray(report)) {
                report.forEach(r => addLog(`📋 [리포트] ${r}`));
            } else {
                addLog("⚠️ 검증 결과 형식이 올바르지 않습니다.");
            }
        }

        if (aiMaintenance.updateSamples) {
            addLog(`🎲 ${batchSize}개의 새로운 랜덤 예시 생성 중...`);
            const newSamples = await generateBatchRandomSamples(batchSize); 
            if (newSamples.length > 0) {
                generatedSamples.push(...newSamples);
                addLog(`✅ 랜덤 예시 ${newSamples.length}개 생성 성공`);
            }
        }

        if (aiMaintenance.updateTemplates) {
            addLog(`🧠 부족한 시나리오 주제 분석 중...`);
            const allTags = templates.flatMap(t => t.tags);
            const topicIdeas = await suggestNewScenarioTopics(allTags, batchSize);
            
            for (let i = 0; i < topicIdeas.length; i++) {
                const idea = topicIdeas[i];
                addLog(`[${i + 1}/${topicIdeas.length}] ✍️ 템플릿 작성 중: ${idea.goal}...`);
                const newTemplate = await generateNewScenarioTemplate(idea as UserInput);
                if (newTemplate) generatedTemplates.push(newTemplate);
            }
        }

        // Safe State Updates
        if (generatedSamples.length > 0) {
            onUpdateDb(prev => ({
                 ...prev, 
                 randomSamples: [...generatedSamples, ...(prev.randomSamples || [])].slice(0, 50) 
            }));
            addLog(`💾 시스템 DB에 랜덤 예시 업데이트 완료.`);
        }

        if (generatedTemplates.length > 0) {
            onUpdateTemplates(prev => [...generatedTemplates, ...prev]);
            addLog(`💾 시스템 DB에 템플릿 업데이트 완료.`);
        }

        addLog("🏁 모든 작업 완료.");
        
    } catch (e: any) {
        console.error(e);
        addLog(`❌ 오류 발생: ${e.message}`);
    } finally {
        setAiRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <GlassCard className="w-full max-w-6xl h-[90vh] flex flex-col bg-[#111827] border-white/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
          <div>
             <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <span className="text-3xl">⚙️</span> SYSTEM ADMIN
             </h2>
             <p className="text-xs text-emerald-400 font-mono mt-1">
                Connected: {new Date().toLocaleDateString()}
             </p>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/50 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-colors flex items-center gap-2"
            >
                💾 GitHub 저장용 코드 변환
            </button>
            <button 
                onClick={() => setShowKeyModal(true)}
                className="px-4 py-2 bg-yellow-600/20 text-yellow-500 border border-yellow-600/50 rounded-lg text-xs font-bold hover:bg-yellow-600/30 transition-colors flex items-center gap-2"
            >
                🔑 API 키 설정
            </button>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-black/10">
           {['control', 'templates', 'samples', 'essays'].map(tab => (
               <button 
                 key={tab}
                 onClick={() => setActiveTab(tab as any)}
                 className={`px-8 py-4 text-sm font-bold uppercase transition-colors ${activeTab === tab ? 'bg-emerald-600/20 text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
               >
                 {tab}
               </button>
           ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-[#0f172a]">
           {activeTab === 'control' && (
             <div className="p-8 h-full overflow-y-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6 border-l-4 border-l-emerald-500">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">AI Auto-Maintenance</h3>
                        <div className="space-y-4 mb-6">
                            <label className="flex items-center gap-3"><input type="checkbox" checked={aiMaintenance.updateTemplates} onChange={e => setAiMaintenance({...aiMaintenance, updateTemplates: e.target.checked})} className="w-4 h-4" /> 템플릿 생성</label>
                            <label className="flex items-center gap-3"><input type="checkbox" checked={aiMaintenance.updateSamples} onChange={e => setAiMaintenance({...aiMaintenance, updateSamples: e.target.checked})} className="w-4 h-4" /> 예시 업데이트</label>
                            <label className="flex items-center gap-3"><input type="checkbox" checked={aiMaintenance.validate} onChange={e => setAiMaintenance({...aiMaintenance, validate: e.target.checked})} className="w-4 h-4" /> 데이터 검증</label>
                            <div className="pt-2">
                                <span className="text-xs text-gray-400">Batch Size: {batchSize}</span>
                                <input type="range" min="1" max="5" value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} className="w-full" />
                            </div>
                        </div>
                        <button onClick={runAIMaintenance} disabled={aiRunning} className="w-full py-3 bg-emerald-600 rounded-xl font-bold text-white shadow-lg">
                            {aiRunning ? 'AI 작업 중...' : '작업 실행'}
                        </button>
                    </GlassCard>

                    <GlassCard className="p-6 flex flex-col">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Logs</h3>
                        <div className="flex-1 bg-black/40 rounded-xl p-4 font-mono text-xs text-green-400 overflow-y-auto">
                            {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
                        </div>
                    </GlassCard>
                </div>
             </div>
           )}

           {activeTab === 'templates' && (
             <div className="p-8 text-center text-gray-400">
                 템플릿 편집 기능은 현재 점검 중입니다. (DB 업데이트 우선)
             </div>
           )}

           {activeTab === 'samples' && (
               <RandomSampleEditor db={db} onUpdateDb={onUpdateDb} templates={templates} />
           )}

           {activeTab === 'essays' && (
               <EssayEditor db={db} onUpdateDb={onUpdateDb} />
           )}
        </div>
      </GlassCard>

      <ApiKeyModal isOpen={showKeyModal} onClose={() => setShowKeyModal(false)} />
      <DataExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} db={db} templates={templates} />
    </div>
  );
};
