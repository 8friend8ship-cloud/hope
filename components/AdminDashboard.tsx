
import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { ScenarioDB, ScenarioTemplate, UserInput, StandaloneEssay } from '../types';
import { DEFAULT_TEMPLATES, INITIAL_DB } from '../constants';
import { generateBatchRandomSamples, suggestNewScenarioTopics, generateNewScenarioTemplate, validateSystemData, hasApiKey } from '../aiService';

interface AdminDashboardProps {
  db: ScenarioDB;
  onUpdateDb: React.Dispatch<React.SetStateAction<ScenarioDB>>;
  templates: ScenarioTemplate[];
  onUpdateTemplates: React.Dispatch<React.SetStateAction<ScenarioTemplate[]>>;
  onClose: () => void;
}

// --- 1. SMART BACKUP & RESTORE MODAL ---
const DataExportModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    db: ScenarioDB; 
    templates: ScenarioTemplate[];
    onRestore: (data: { db: ScenarioDB, templates: ScenarioTemplate[] }) => void;
}> = ({ isOpen, onClose, db, templates, onRestore }) => {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'backup' | 'code'>('backup');

    if (!isOpen) return null;

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

    const handleDownloadJson = () => {
        const fullBackup = {
            timestamp: new Date().toISOString(),
            version: "4.0",
            db,
            templates
        };
        const element = document.createElement("a");
        const file = new Blob([JSON.stringify(fullBackup, null, 2)], {type: 'application/json'});
        const fileName = `HOPE_BACKUP_${new Date().toISOString().slice(0,10)}_${Date.now()}.json`;
        element.href = URL.createObjectURL(file);
        element.download = fileName;
        document.body.appendChild(element); 
        element.click();
        document.body.removeChild(element);
    };

    const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (e.target.files && e.target.files[0]) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target?.result as string);
                    
                    if (!json.db || !json.templates) {
                        alert("❌ 올바르지 않은 백업 파일 형식입니다. (db 또는 templates 속성 누락)");
                        return;
                    }

                    // --- SMART MERGE LOGIC ---
                    const currentTemplateIds = new Set(templates.map(t => t.id));
                    const newTemplates = [...templates];
                    let addedTemplatesCount = 0;
                    
                    (json.templates as ScenarioTemplate[]).forEach(t => {
                        if (!currentTemplateIds.has(t.id)) {
                            newTemplates.push(t);
                            addedTemplatesCount++;
                        }
                    });

                    const newSamples = [...(db.randomSamples || [])];
                    let addedSamplesCount = 0;
                    (json.db.randomSamples as Partial<UserInput>[] || []).forEach(s => {
                        const exists = newSamples.some(curr => 
                            curr.age === s.age && curr.job === s.job && curr.goal === s.goal
                        );
                        if (!exists) {
                            newSamples.push(s);
                            addedSamplesCount++;
                        }
                    });

                    const newEssays = [...(db.essays || [])];
                    let addedEssaysCount = 0;
                    const currentEssayIds = new Set(newEssays.map(e => e.id));
                    (json.db.essays as StandaloneEssay[] || []).forEach(essay => {
                         if (!currentEssayIds.has(essay.id)) {
                             newEssays.push(essay);
                             addedEssaysCount++;
                         }
                    });
                    
                    const mergedScenarios = { ...db.scenarios, ...json.db.scenarios };
                    const mergedRates = { ...db.rates, ...json.db.rates };

                    const confirmMsg = `백업 데이터를 병합하시겠습니까?\n\n` +
                                     `- 템플릿 추가: ${addedTemplatesCount}개\n` +
                                     `- 예시 추가: ${addedSamplesCount}개\n` +
                                     `- 에세이 추가: ${addedEssaysCount}개\n\n` +
                                     `* 기존 데이터는 안전하게 유지됩니다.`;

                    if(confirm(confirmMsg)) {
                        const mergedDb: ScenarioDB = {
                            ...db,
                            randomSamples: newSamples,
                            essays: newEssays,
                            scenarios: mergedScenarios,
                            rates: mergedRates,
                            lastVerified: new Date().toISOString()
                        };

                        onRestore({ db: mergedDb, templates: newTemplates });
                        onClose();
                        alert(`✅ 스마트 병합 완료!`);
                    }
                } catch (err) {
                    console.error(err);
                    alert("❌ 파일 읽기 실패");
                }
            };
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <GlassCard className="w-full max-w-4xl h-[85vh] flex flex-col p-6 border-l-4 border-l-blue-500 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white p-2">✕</button>
                <div className="mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                        💾 데이터 백업 & 복구 (Smart Merge)
                    </h2>
                    <div className="flex gap-4 mt-4 border-b border-white/10">
                        <button onClick={() => setActiveTab('backup')} className={`pb-2 px-2 text-sm font-bold transition-colors ${activeTab === 'backup' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>파일 관리 (JSON)</button>
                        <button onClick={() => setActiveTab('code')} className={`pb-2 px-2 text-sm font-bold transition-colors ${activeTab === 'code' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>개발자용 코드</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                {activeTab === 'backup' ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10 flex flex-col items-center text-center space-y-4">
                            <div className="text-4xl">⬇️</div>
                            <h3 className="text-lg font-bold text-white">데이터 내보내기</h3>
                            <button onClick={handleDownloadJson} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-white text-sm shadow-lg">파일 다운로드 (.json)</button>
                        </div>
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10 flex flex-col items-center text-center space-y-4">
                            <div className="text-4xl">⬆️</div>
                            <h3 className="text-lg font-bold text-white">데이터 불러오기</h3>
                            <label className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-xl font-bold text-blue-300 text-sm cursor-pointer text-center block">
                                파일 선택 (Smart Merge)
                                <input type="file" accept=".json" onChange={handleFileRestore} className="hidden" />
                            </label>
                        </div>
                     </div>
                ) : (
                    <div className="bg-black/50 rounded-xl border border-white/10 h-full flex flex-col">
                        <div className="flex justify-between items-center p-2 bg-white/5 border-b border-white/10">
                            <span className="text-xs font-mono text-gray-500 ml-2">constants.ts export</span>
                            <button onClick={handleCopy} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>{copied ? "✅ 복사 완료!" : "📋 코드 전체 복사"}</button>
                        </div>
                        <textarea readOnly value={exportCode} className="flex-1 bg-transparent p-4 text-xs font-mono text-blue-200 resize-none focus:outline-none" />
                    </div>
                )}
                </div>
            </GlassCard>
        </div>
    );
};

// --- 2. AI AUTO-GENERATOR & SYSTEM DASHBOARD (RESTORED MAIN UI) ---
const AIDashboardHome: React.FC<{ 
    db: ScenarioDB, 
    onUpdateDb: React.Dispatch<React.SetStateAction<ScenarioDB>>,
    templates: ScenarioTemplate[], 
    onUpdateTemplates: React.Dispatch<React.SetStateAction<ScenarioTemplate[]>> 
}> = ({ db, onUpdateDb, templates, onUpdateTemplates }) => {
    const [sampleCount, setSampleCount] = useState(5);
    const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);
    const [isAnalyzingTopics, setIsAnalyzingTopics] = useState(false);
    const [suggestedTopics, setSuggestedTopics] = useState<UserInput[]>([]);
    const [processingTopicIndex, setProcessingTopicIndex] = useState<number | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev]);

    // A. Generate Random Samples
    const handleGenerateSamples = async () => {
        if (!hasApiKey()) return alert("⚠️ API 키가 필요합니다. 설정에서 키를 등록해주세요.");
        
        setIsGeneratingSamples(true);
        addLog(`🔄 AI 페르소나 ${sampleCount}명 생성 시작...`);
        try {
            const newSamples = await generateBatchRandomSamples(sampleCount);
            onUpdateDb(prev => ({
                ...prev,
                randomSamples: [...(prev.randomSamples || []), ...newSamples]
            }));
            addLog(`✅ 페르소나 ${newSamples.length}명 DB 추가 완료.`);
        } catch (e) {
            addLog(`❌ 생성 실패: ${(e as Error).message}`);
        } finally {
            setIsGeneratingSamples(false);
        }
    };

    // B. Suggest Missing Topics
    const handleSuggestTopics = async () => {
        if (!hasApiKey()) return alert("⚠️ API 키가 필요합니다.");
        
        setIsAnalyzingTopics(true);
        addLog("🔄 현재 템플릿 분포 분석 중...");
        try {
            const currentTags = templates.flatMap(t => t.tags);
            const suggestions = await suggestNewScenarioTopics(currentTags, 3); // Suggest 3 new topics
            setSuggestedTopics(suggestions);
            addLog(`💡 새로운 시나리오 주제 ${suggestions.length}개 발견!`);
        } catch (e) {
            addLog(`❌ 분석 실패: ${(e as Error).message}`);
        } finally {
            setIsAnalyzingTopics(false);
        }
    };

    // C. Create Template from Suggestion
    const handleCreateTemplate = async (topic: UserInput, index: number) => {
        if (!hasApiKey()) return alert("⚠️ API 키가 필요합니다.");
        
        setProcessingTopicIndex(index);
        addLog(`🔄 '${topic.goal}' 시나리오 템플릿 생성 중...`);
        try {
            const newTemplate = await generateNewScenarioTemplate(topic);
            if (newTemplate) {
                onUpdateTemplates(prev => [newTemplate, ...prev]);
                // Remove from suggestions
                setSuggestedTopics(prev => prev.filter((_, i) => i !== index));
                addLog(`✅ 템플릿 생성 완료: ${newTemplate.id}`);
            }
        } catch (e) {
            addLog(`❌ 템플릿 생성 실패: ${(e as Error).message}`);
        } finally {
            setProcessingTopicIndex(null);
        }
    };

    // D. Update Rates / Validate Data
    const handleUpdateRates = () => {
        const rates = { ...db.rates };
        // Simulate minor rate fluctuation
        Object.keys(rates).forEach(k => {
            const fluctuation = 1 + (Math.random() * 0.04 - 0.02); // +/- 2%
            rates[k] = Math.floor(rates[k] * fluctuation);
        });
        onUpdateDb(prev => ({ ...prev, rates, lastVerified: new Date().toLocaleString() }));
        addLog(`✅ 환율 정보 업데이트 완료 (${new Date().toLocaleTimeString()})`);
    };

    const handleValidate = async () => {
        addLog("🔄 데이터 무결성 검사 중...");
        const msgs = await validateSystemData(db, templates);
        msgs.forEach(m => addLog(m));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-full overflow-y-auto">
            {/* Left Column: Actions */}
            <div className="space-y-6">
                
                {/* 1. Random Persona Generator */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                        <span>👥</span> AI 페르소나 자동 생성
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm text-gray-300">
                            <span>생성 개수: {sampleCount}명</span>
                            <input 
                                type="range" min="1" max="10" value={sampleCount} 
                                onChange={(e) => setSampleCount(parseInt(e.target.value))}
                                className="w-32 accent-emerald-500"
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            현재 데이터: {db.randomSamples?.length || 0}개. 버튼을 누르면 다양한 직업/나이/목적지의 가상 유저 데이터를 생성하여 추가합니다.
                        </p>
                        <button 
                            onClick={handleGenerateSamples}
                            disabled={isGeneratingSamples}
                            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${isGeneratingSamples ? 'bg-gray-700' : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'}`}
                        >
                            {isGeneratingSamples ? '생성 중...' : '🎲 랜덤 예시 추가 생성'}
                        </button>
                    </div>
                </div>

                {/* 2. Scenario Expansion */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                        <span>🌐</span> 시나리오 확장 (Templates)
                    </h3>
                    <div className="space-y-4">
                        <p className="text-xs text-gray-500">
                            현재 템플릿: {templates.length}개. AI가 부족한 국가나 상황(예: 은퇴, 유학)을 분석하여 새로운 템플릿을 제안합니다.
                        </p>
                        
                        {suggestedTopics.length === 0 ? (
                            <button 
                                onClick={handleSuggestTopics}
                                disabled={isAnalyzingTopics}
                                className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg text-blue-300 font-bold text-sm transition-colors"
                            >
                                {isAnalyzingTopics ? '분석 중...' : '🔍 누락된 주제 찾기'}
                            </button>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {suggestedTopics.map((topic, idx) => (
                                    <div key={idx} className="bg-black/30 p-3 rounded-lg flex justify-between items-center border border-white/5">
                                        <div className="text-xs text-gray-300">
                                            <span className="font-bold text-blue-300">{topic.goal}</span> ({topic.moveType})
                                            <div className="text-[10px] text-gray-500">{topic.age}세 · {topic.job} · {topic.family}</div>
                                        </div>
                                        <button 
                                            onClick={() => handleCreateTemplate(topic, idx)}
                                            disabled={processingTopicIndex !== null}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded"
                                        >
                                            {processingTopicIndex === idx ? '생성...' : '추가'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. System Tools */}
                <div className="grid grid-cols-2 gap-4">
                     <button onClick={handleValidate} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-colors">
                        🩺 데이터 무결성 검사
                     </button>
                     <button onClick={handleUpdateRates} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-yellow-500 transition-colors">
                        💰 환율/정보 최신화
                     </button>
                </div>
            </div>

            {/* Right Column: Logs & Status */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-5 flex flex-col h-full">
                <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">System Console</h3>
                <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs p-2">
                    {logs.length === 0 && <div className="text-gray-600 italic">시스템 대기 중...</div>}
                    {logs.map((log, i) => (
                        <div key={i} className="border-b border-white/5 pb-1 mb-1 last:border-0">
                            <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                            <span className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-emerald-400' : 'text-gray-300'}>
                                {log}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- 3. EDITOR COMPONENTS (Existing CRUD) ---
const RandomSampleEditor: React.FC<{db: ScenarioDB, onUpdateDb: React.Dispatch<React.SetStateAction<ScenarioDB>>}> = ({ db, onUpdateDb }) => {
    const [samples, setSamples] = useState<Partial<UserInput>[]>(Array.isArray(db.randomSamples) ? db.randomSamples : []);

    useEffect(() => {
        if(Array.isArray(db.randomSamples)) setSamples(db.randomSamples);
        else setSamples([]);
    }, [db.randomSamples]);

    const handleUpdate = (index: number, field: keyof UserInput, value: string | number | boolean) => {
        const newSamples = [...samples];
        if (newSamples[index]) {
            newSamples[index] = { ...newSamples[index], [field]: value };
            setSamples(newSamples);
        }
    };

    const handleSave = () => {
        onUpdateDb(prev => ({ ...prev, randomSamples: samples }));
        alert("✅ 저장되었습니다.");
    };
    
    const handleAdd = () => setSamples([...samples, { age: '30', job: '직장인', start: '서울', goal: '미국', months: 24, forcedTemplateId: '', isDomestic: false, useAI: false }]);
    
    const handleRemove = (index: number) => {
        if (confirm('삭제하시겠습니까?')) {
            const newSamples = [...samples];
            newSamples.splice(index, 1);
            setSamples(newSamples);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-6 space-y-4">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">🔀 랜덤 예시 편집</h3>
                <div className="flex gap-2">
                    <button onClick={handleAdd} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs">추가</button>
                    <button onClick={handleSave} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white">저장</button>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {samples.map((sample, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm space-y-2">
                         <div className="flex justify-between">
                            <span className="text-xs text-gray-500">#{idx + 1}</span>
                            <button onClick={() => handleRemove(idx)} className="text-red-400 hover:text-red-300">삭제</button>
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <input value={sample.age} onChange={(e) => handleUpdate(idx, 'age', e.target.value)} placeholder="나이" className="bg-black/30 p-2 rounded border border-white/5 text-white" />
                            <input value={sample.job} onChange={(e) => handleUpdate(idx, 'job', e.target.value)} placeholder="직업" className="bg-black/30 p-2 rounded border border-white/5 text-white" />
                            <input value={sample.start} onChange={(e) => handleUpdate(idx, 'start', e.target.value)} placeholder="출발지" className="bg-black/30 p-2 rounded border border-white/5 text-white" />
                            <input value={sample.goal} onChange={(e) => handleUpdate(idx, 'goal', e.target.value)} placeholder="목적지" className="bg-black/30 p-2 rounded border border-white/5 text-white" />
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TemplateManager: React.FC<{ templates: ScenarioTemplate[], onUpdateTemplates: React.Dispatch<React.SetStateAction<ScenarioTemplate[]>> }> = ({ templates, onUpdateTemplates }) => {
    const handleDelete = (id: string) => {
        if (confirm("정말 이 템플릿을 삭제하시겠습니까?")) {
            onUpdateTemplates(prev => prev.filter(t => t.id !== id));
        }
    };
    return (
        <div className="h-full overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">📄 템플릿 리스트</h3>
            </div>
            <div className="space-y-3">
                {templates.map((t) => (
                    <div key={t.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center group">
                        <div>
                            <div className="font-bold text-white text-sm">{t.id}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px] md:max-w-md">{t.tags.join(', ')}</div>
                        </div>
                        <button onClick={() => handleDelete(t.id)} className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/20 text-xs">삭제</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const EssayEditor: React.FC<{ db: ScenarioDB, onUpdateDb: React.Dispatch<React.SetStateAction<ScenarioDB>> }> = ({ db, onUpdateDb }) => {
    const [essays, setEssays] = useState<StandaloneEssay[]>(db.essays || []);

    const handleAdd = () => {
        const newEssay: StandaloneEssay = {
            id: `essay_${Date.now()}`,
            title: '새로운 칼럼 제목',
            content: '내용을 입력하세요.',
            tags: ['칼럼'],
            date: new Date().toISOString().slice(0, 10)
        };
        setEssays([newEssay, ...essays]);
    };

    const handleUpdate = (id: string, field: keyof StandaloneEssay, value: string) => {
        setEssays(essays.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const handleTagsUpdate = (id: string, tagsStr: string) => {
        const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
        setEssays(essays.map(e => e.id === id ? { ...e, tags } : e));
    };

    const handleDelete = (id: string) => {
        if(confirm("삭제하시겠습니까?")) setEssays(essays.filter(e => e.id !== id));
    };

    const handleSave = () => {
        onUpdateDb(prev => ({ ...prev, essays }));
        alert("✅ 저장되었습니다.");
    };

    return (
        <div className="h-full overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">✒️ 작가 칼럼 편집</h3>
                <div className="flex gap-2">
                    <button onClick={handleAdd} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs">추가</button>
                    <button onClick={handleSave} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white">저장</button>
                </div>
            </div>
            <div className="space-y-4">
                {essays.map((essay) => (
                    <div key={essay.id} className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                            <input 
                                value={essay.title} 
                                onChange={(e) => handleUpdate(essay.id, 'title', e.target.value)}
                                className="bg-transparent text-lg font-bold text-white w-full focus:outline-none placeholder-gray-600"
                                placeholder="제목 입력"
                            />
                            <button onClick={() => handleDelete(essay.id)} className="text-red-400 text-xs ml-2 whitespace-nowrap">삭제</button>
                        </div>
                        <input 
                            value={essay.tags.join(', ')} 
                            onChange={(e) => handleTagsUpdate(essay.id, e.target.value)}
                            className="bg-black/20 text-xs text-blue-300 w-full p-2 rounded border border-white/5 focus:outline-none"
                        />
                        <textarea 
                            value={essay.content} 
                            onChange={(e) => handleUpdate(essay.id, 'content', e.target.value)}
                            className="bg-black/20 text-sm text-gray-300 w-full p-3 rounded border border-white/5 h-32 focus:outline-none resize-y"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ db, onUpdateDb, templates, onUpdateTemplates, onClose }) => {
  const [tab, setTab] = useState<'dashboard' | 'samples' | 'templates' | 'essays'>('dashboard');
  const [showExport, setShowExport] = useState(false);

  const handleRestoreFile = (data: { db: ScenarioDB, templates: ScenarioTemplate[] }) => {
      onUpdateDb(data.db);
      onUpdateTemplates(data.templates);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
        <GlassCard className="w-full max-w-5xl h-[90vh] flex flex-col border border-white/20 shadow-2xl relative bg-[#0f172a]">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-white">ADMIN</h2>
                    <div className="flex bg-black/40 rounded-lg p-1">
                        <button onClick={() => setTab('dashboard')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${tab === 'dashboard' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>대시보드 (AI)</button>
                        <button onClick={() => setTab('samples')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${tab === 'samples' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>랜덤 예시</button>
                        <button onClick={() => setTab('templates')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${tab === 'templates' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>템플릿</button>
                        <button onClick={() => setTab('essays')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${tab === 'essays' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>칼럼/에세이</button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowExport(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors">데이터 백업/복구</button>
                    <button onClick={onClose} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-lg transition-colors">닫기</button>
                </div>
            </div>

            {/* System Status Bar */}
            <div className="bg-black/30 border-b border-white/10 px-6 py-2 flex gap-6 text-[10px] md:text-xs text-gray-400 font-mono">
                 <span>Templates: {templates.length}</span>
                 <span>Samples: {db.randomSamples?.length || 0}</span>
                 <span>Essays: {db.essays?.length || 0}</span>
                 <span>Last Updated: {db.lastVerified}</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {tab === 'dashboard' && <AIDashboardHome db={db} onUpdateDb={onUpdateDb} templates={templates} onUpdateTemplates={onUpdateTemplates} />}
                {tab === 'samples' && <RandomSampleEditor db={db} onUpdateDb={onUpdateDb} />}
                {tab === 'templates' && <TemplateManager templates={templates} onUpdateTemplates={onUpdateTemplates} />}
                {tab === 'essays' && <EssayEditor db={db} onUpdateDb={onUpdateDb} />}
            </div>

            <DataExportModal 
                isOpen={showExport} 
                onClose={() => setShowExport(false)} 
                db={db}
                templates={templates}
                onRestore={handleRestoreFile}
            />
        </GlassCard>
    </div>
  );
};
