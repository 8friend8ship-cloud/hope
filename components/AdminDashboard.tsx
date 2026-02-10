
import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { ScenarioDB, ScenarioTemplate, UserInput, StandaloneEssay } from '../types';
import { DEFAULT_TEMPLATES, INITIAL_DB } from '../constants';
import { generateBatchRandomSamples, suggestNewScenarioTopics, generateNewScenarioTemplate, validateSystemData, hasApiKey, validateApiKey, saveApiKey, suggestNewEssayTopics, generateNewEssay } from '../aiService';

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
    const [previewData, setPreviewData] = useState<{
        valid: boolean;
        counts: { templates: number; samples: number; essays: number };
        rawData: any;
    } | null>(null);
    const [restoreResult, setRestoreResult] = useState<string | null>(null);

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

    const handleFilePreview = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileInput = e.target;
        const file = fileInput.files?.[0];
        setRestoreResult(null);

        if (file) {
            const fileReader = new FileReader();
            fileReader.readAsText(file, "UTF-8");
            fileReader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target?.result as string);
                    if (!json.db || !json.templates) {
                        alert("❌ 올바르지 않은 파일 형식입니다.");
                        setPreviewData(null);
                        return;
                    }
                    setPreviewData({
                        valid: true,
                        counts: {
                            templates: json.templates.length,
                            samples: json.db.randomSamples?.length || 0,
                            essays: json.db.essays?.length || 0
                        },
                        rawData: json
                    });
                } catch (err) {
                    alert("❌ JSON 파싱 실패");
                } finally {
                    fileInput.value = '';
                }
            };
        }
    };

    const executeRestore = (mode: 'merge' | 'overwrite') => {
        if (!previewData || !previewData.valid) return;
        const json = previewData.rawData;

        try {
            if (mode === 'overwrite') {
                if (confirm(`⚠️ [주의] 덮어쓰기 모드\n\n현재 시스템의 모든 데이터가 삭제되고, 파일 내용(${previewData.counts.templates}개 템플릿 등)으로 교체됩니다.\n진행하시겠습니까?`)) {
                        const newDb = { ...json.db, lastVerified: new Date().toISOString() };
                        onRestore({ db: newDb, templates: [...json.templates] });
                        setRestoreResult(`✅ 덮어쓰기 완료!\n- 템플릿: ${previewData.counts.templates}개\n- 예시: ${previewData.counts.samples}개\n- 에세이: ${previewData.counts.essays}개 로 교체됨.`);
                        setPreviewData(null);
                }
                return;
            }

            // Smart Merge
            let addedTemplates = 0;
            let updatedTemplates = 0;

            const templateMap = new Map(templates.map(t => [t.id, t]));
            (json.templates as ScenarioTemplate[]).forEach(t => {
                if (templateMap.has(t.id)) updatedTemplates++;
                else addedTemplates++;
                templateMap.set(t.id, t);
            });
            const newTemplates = Array.from(templateMap.values());

            const currentSamples = [...(db.randomSamples || [])];
            let addedSamples = 0;
            (json.db.randomSamples as Partial<UserInput>[] || []).forEach(s => {
                const exists = currentSamples.some(curr => curr.age === s.age && curr.job === s.job && curr.goal === s.goal);
                if (!exists) {
                    currentSamples.push(s);
                    addedSamples++;
                }
            });

            const essayMap = new Map((db.essays || []).map(e => [e.id, e]));
            let addedEssays = 0;
            (json.db.essays as StandaloneEssay[] || []).forEach(e => {
                if (!essayMap.has(e.id)) addedEssays++;
                essayMap.set(e.id, e);
            });
            const newEssays = Array.from(essayMap.values());
            
            const mergedDb: ScenarioDB = {
                ...db,
                ...json.db,
                randomSamples: currentSamples,
                essays: newEssays,
                lastVerified: new Date().toISOString()
            };

            onRestore({ db: mergedDb, templates: newTemplates });
            setRestoreResult(
                `✅ 스마트 병합 완료!\n` +
                `----------------------------\n` +
                `📄 템플릿: +${addedTemplates} 추가 / ↻${updatedTemplates} 업데이트\n` +
                `👥 예시: +${addedSamples} 추가\n` +
                `✒️ 에세이: +${addedEssays} 추가`
            );
            setPreviewData(null);

        } catch (err) {
            setRestoreResult("❌ 처리 중 오류 발생");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <GlassCard className="w-full max-w-4xl h-[85vh] flex flex-col p-6 border-l-4 border-l-blue-500 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white p-2">✕</button>
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">💾 데이터 백업 & 복구</h2>
                    <div className="flex gap-4 mt-4 border-b border-white/10">
                        <button onClick={() => setActiveTab('backup')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'backup' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>파일 관리 (JSON)</button>
                        <button onClick={() => setActiveTab('code')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'code' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>개발자용 코드</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                {activeTab === 'backup' ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                        {/* Download Column */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10 flex flex-col items-center text-center space-y-4">
                            <div className="text-4xl">⬇️</div>
                            <h3 className="text-lg font-bold text-white">데이터 내보내기</h3>
                            <button onClick={handleDownloadJson} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-white text-sm shadow-lg">파일 다운로드 (.json)</button>
                            <p className="text-[10px] text-gray-500">현재 시스템의 모든 설정을 PC에 저장합니다.</p>
                        </div>

                        {/* Upload Column */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10 flex flex-col items-center text-center space-y-4 relative">
                            <div className="text-4xl">⬆️</div>
                            <h3 className="text-lg font-bold text-white">데이터 불러오기</h3>
                            
                            {/* State A: Result Message */}
                            {restoreResult && (
                                <div className="w-full bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-3 mb-2 animate-fade-in text-left">
                                    <pre className="text-xs text-emerald-100 whitespace-pre-wrap font-mono">{restoreResult}</pre>
                                    <button onClick={() => setRestoreResult(null)} className="mt-2 w-full py-1 bg-emerald-600/50 hover:bg-emerald-600 rounded text-[10px] font-bold">확인</button>
                                </div>
                            )}

                            {/* State B: File Preview & Action */}
                            {previewData ? (
                                <div className="w-full bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 animate-fade-in">
                                    <h4 className="text-sm font-bold text-blue-300 mb-2">📂 파일 분석 결과</h4>
                                    <ul className="text-xs text-gray-300 space-y-1 mb-4 text-left list-disc list-inside">
                                        <li>템플릿: <span className="text-white font-bold">{previewData.counts.templates}</span> 개</li>
                                        <li>예시 샘플: <span className="text-white font-bold">{previewData.counts.samples}</span> 개</li>
                                        <li>에세이: <span className="text-white font-bold">{previewData.counts.essays}</span> 개</li>
                                    </ul>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => executeRestore('merge')}
                                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors"
                                        >
                                            🔄 병합 (Upsert)
                                        </button>
                                        <button 
                                            onClick={() => executeRestore('overwrite')}
                                            className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-bold text-white transition-colors"
                                        >
                                            ⚠️ 덮어쓰기
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setPreviewData(null)}
                                        className="mt-2 text-[10px] text-gray-500 hover:text-gray-300 underline"
                                    >
                                        취소하고 다른 파일 선택
                                    </button>
                                </div>
                            ) : (
                                /* State C: Initial Upload Button */
                                <label className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-xl font-bold text-blue-300 text-sm cursor-pointer text-center block transition-all">
                                    파일 선택 (.json)
                                    <input type="file" accept=".json" onChange={handleFilePreview} className="hidden" />
                                </label>
                            )}
                            
                            {!previewData && !restoreResult && (
                                <p className="text-[10px] text-gray-500">
                                    파일을 선택하면 내용을 미리 확인한 후<br/>병합 또는 덮어쓰기를 선택할 수 있습니다.
                                </p>
                            )}
                        </div>
                     </div>
                ) : (
                    <div className="bg-black/50 rounded-xl border border-white/10 h-full flex flex-col p-2">
                        <button onClick={handleCopy} className="mb-2 self-end px-3 py-1 bg-blue-600 text-white text-xs rounded">{copied ? "복사됨" : "코드 복사"}</button>
                        <textarea readOnly value={exportCode} className="flex-1 bg-transparent p-4 text-xs font-mono text-blue-200 resize-none focus:outline-none" />
                    </div>
                )}
                </div>
            </GlassCard>
        </div>
    );
};

// --- 2. RESTORED COMPONENT: RandomSampleEditor ---
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

// --- 3. RESTORED COMPONENT: TemplateManager ---
const TemplateManager: React.FC<{ templates: ScenarioTemplate[], onUpdateTemplates: React.Dispatch<React.SetStateAction<ScenarioTemplate[]>> }> = ({ templates, onUpdateTemplates }) => {
    const [editingTemplate, setEditingTemplate] = useState<{
        meta: { id: string; tags: string; type: 'report' | 'essay' };
        jsonBody: string;
    } | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const getEmptyTemplate = (): ScenarioTemplate => ({
        id: `template_new_${Date.now()}`,
        type: 'report',
        tags: ['new', 'draft'],
        story: {
            titleTemplate: "{age}세 {goal} 이주 시나리오",
            subTemplate: "({months}개월 후 예상)",
            stages: [
                { label: "Day 1", title: "시작", content: { situation: "상황 설명", action: "행동" } },
                { label: "Month 6", title: "위기", content: { failure: "문제 발생", solution: "해결책" } },
                { label: "Month 12", title: "적응", content: { result: "중간 결과" } },
                { label: "Final", title: "결말", content: { reality: "현실적 조언" } }
            ]
        },
        resultTable: [
            { item: "생활비", before: "200만원", after: "300만원", diff: "+50%" }
        ],
        essay: {
            title: "냉정한 현실",
            intro: "도피성 이민은 실패합니다.",
            body: "준비된 자만이 살아남습니다."
        },
        downloads: []
    });

    const handleCreate = () => {
        const empty = getEmptyTemplate();
        const { id, tags, type, ...rest } = empty;
        setEditingTemplate({
            meta: { id, tags: tags.join(', '), type },
            jsonBody: JSON.stringify(rest, null, 2)
        });
    };

    const handleEdit = (t: ScenarioTemplate, e: React.MouseEvent) => {
        e.stopPropagation();
        const { id, tags, type, ...rest } = t;
        setEditingTemplate({
            meta: { id, tags: tags.join(', '), type },
            jsonBody: JSON.stringify(rest, null, 2)
        });
    };

    const handleSave = () => {
        if (!editingTemplate) return;
        try {
            const body = JSON.parse(editingTemplate.jsonBody);
            const newTemplate: ScenarioTemplate = {
                id: editingTemplate.meta.id,
                type: editingTemplate.meta.type,
                tags: editingTemplate.meta.tags.split(',').map(s => s.trim()).filter(Boolean),
                ...body
            };

            onUpdateTemplates(prev => {
                const idx = prev.findIndex(t => t.id === newTemplate.id);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = newTemplate;
                    return updated;
                }
                return [newTemplate, ...prev];
            });
            setEditingTemplate(null);
            alert("✅ 템플릿이 저장되었습니다.");
        } catch (e) {
            alert("❌ JSON 형식이 올바르지 않습니다.\n" + (e as Error).message);
        }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); 
        if (confirm("정말 이 템플릿을 삭제하시겠습니까?")) {
            onUpdateTemplates(prev => prev.filter(t => t.id !== id));
        }
    };

    if (editingTemplate) {
        return (
            <div className="h-full overflow-y-auto p-6 space-y-4">
                <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold text-white">✏️ 템플릿 에디터</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300">취소</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white shadow-lg">저장</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">ID</label>
                        <input value={editingTemplate.meta.id} onChange={(e) => setEditingTemplate({...editingTemplate, meta: {...editingTemplate.meta, id: e.target.value}})} className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm text-white"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Tags</label>
                        <input value={editingTemplate.meta.tags} onChange={(e) => setEditingTemplate({...editingTemplate, meta: {...editingTemplate.meta, tags: e.target.value}})} className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm text-white"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Type</label>
                        <select value={editingTemplate.meta.type} onChange={(e) => setEditingTemplate({...editingTemplate, meta: {...editingTemplate.meta, type: e.target.value as any}})} className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm text-white">
                            <option value="report">Report</option>
                            <option value="essay">Essay</option>
                        </select>
                    </div>
                </div>
                <textarea value={editingTemplate.jsonBody} onChange={(e) => setEditingTemplate({...editingTemplate, jsonBody: e.target.value})} className="flex-1 w-full bg-[#1e1e1e] text-blue-200 font-mono text-xs p-4 rounded-xl border border-white/10 focus:outline-none min-h-[400px]" spellCheck={false}/>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">📄 템플릿 리스트 ({templates.length})</h3>
                <button onClick={handleCreate} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white shadow-lg">+ 새 템플릿</button>
            </div>
            <div className="space-y-3">
                {templates.map((t) => (
                    <div key={t.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-colors">
                        <div className="p-4 flex justify-between items-center cursor-pointer group" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                            <div className="min-w-0 flex-1 mr-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-emerald-500 font-bold">{t.type.toUpperCase()}</span>
                                    <div className="font-bold text-white text-sm truncate">{t.id}</div>
                                </div>
                                <div className="text-xs text-gray-500 truncate mt-1">{t.tags.join(', ')}</div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => handleEdit(t, e)} className="shrink-0 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded text-xs font-bold">수정</button>
                                <button onClick={(e) => handleDelete(t.id, e)} className="shrink-0 px-3 py-1.5 bg-red-500/10 text-red-400 rounded text-xs font-bold">삭제</button>
                            </div>
                        </div>
                        {expandedId === t.id && (
                            <div className="border-t border-white/10 bg-black/20 p-4">
                                <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap break-all">{JSON.stringify(t, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 4. RESTORED COMPONENT: EssayEditor ---
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
                            <input value={essay.title} onChange={(e) => handleUpdate(essay.id, 'title', e.target.value)} className="bg-transparent text-lg font-bold text-white w-full focus:outline-none placeholder-gray-600" placeholder="제목 입력"/>
                            <button onClick={() => handleDelete(essay.id)} className="text-red-400 text-xs ml-2 whitespace-nowrap">삭제</button>
                        </div>
                        <input value={essay.tags.join(', ')} onChange={(e) => handleTagsUpdate(essay.id, e.target.value)} className="bg-black/20 text-xs text-blue-300 w-full p-2 rounded border border-white/5 focus:outline-none" placeholder="태그 (쉼표 구분)"/>
                        <textarea value={essay.content} onChange={(e) => handleUpdate(essay.id, 'content', e.target.value)} className="bg-black/20 text-sm text-gray-300 w-full p-3 rounded border border-white/5 h-32 focus:outline-none resize-y"/>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 5. AI DASHBOARD (Existing) ---
const AIDashboardHome: React.FC<{ 
    db: ScenarioDB, 
    onUpdateDb: React.Dispatch<React.SetStateAction<ScenarioDB>>,
    templates: ScenarioTemplate[], 
    onUpdateTemplates: React.Dispatch<React.SetStateAction<ScenarioTemplate[]>> 
}> = ({ db, onUpdateDb, templates, onUpdateTemplates }) => {
    // --- STATE ---
    const [sampleCount, setSampleCount] = useState(5);
    const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);
    const [isAnalyzingTopics, setIsAnalyzingTopics] = useState(false);
    const [suggestedTopics, setSuggestedTopics] = useState<UserInput[]>([]);
    const [processingTopicIndex, setProcessingTopicIndex] = useState<number | null>(null);
    const [isAnalyzingEssays, setIsAnalyzingEssays] = useState(false);
    const [suggestedEssayTopics, setSuggestedEssayTopics] = useState<{topic: string, context: string}[]>([]);
    const [processingEssayIndex, setProcessingEssayIndex] = useState<number | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [keyStatus, setKeyStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
    const [hasSavedKey, setHasSavedKey] = useState(false);

    useEffect(() => { setHasSavedKey(hasApiKey()); }, []);
    const addLog = (msg: string) => setLogs(prev => [msg, ...prev]);

    const handleGenerateSamples = async () => {
        setIsGeneratingSamples(true);
        try {
            const newSamples = await generateBatchRandomSamples(sampleCount);
            onUpdateDb(prev => ({...prev, randomSamples: [...(prev.randomSamples || []), ...newSamples]}));
            addLog(`✅ 페르소나 ${newSamples.length}명 추가 완료.`);
        } catch (e) { addLog(`❌ 생성 실패: ${(e as Error).message}`); } finally { setIsGeneratingSamples(false); }
    };

    const handleSuggestTopics = async () => {
        setIsAnalyzingTopics(true);
        try {
            const currentTags = templates.flatMap(t => t.tags);
            const suggestions = await suggestNewScenarioTopics(currentTags, 3);
            setSuggestedTopics(suggestions);
            addLog(`💡 새로운 주제 ${suggestions.length}개 발견!`);
        } catch (e) { addLog(`❌ 분석 실패: ${(e as Error).message}`); } finally { setIsAnalyzingTopics(false); }
    };

    const handleCreateTemplate = async (topic: UserInput, index: number) => {
        setProcessingTopicIndex(index);
        addLog(`🔄 '${topic.goal}' 템플릿 생성 중...`);
        try {
            const newTemplate = await generateNewScenarioTemplate(topic);
            if (newTemplate) {
                onUpdateTemplates(prev => [newTemplate, ...prev]);
                setSuggestedTopics(prev => prev.filter((_, i) => i !== index));
                addLog(`✅ 템플릿 생성 완료: ${newTemplate.id}`);
            }
        } catch (e) { addLog(`❌ 생성 실패: ${(e as Error).message}`); } finally { setProcessingTopicIndex(null); }
    };

    const handleSuggestEssays = async () => {
        setIsAnalyzingEssays(true);
        try {
            const currentTitles = (db.essays || []).map(e => e.title);
            const suggestions = await suggestNewEssayTopics(currentTitles, 3);
            setSuggestedEssayTopics(suggestions);
            addLog(`💡 새로운 칼럼 주제 ${suggestions.length}개 발견!`);
        } catch (e) { addLog(`❌ 분석 실패: ${(e as Error).message}`); } finally { setIsAnalyzingEssays(false); }
    };

    const handleCreateEssay = async (item: {topic: string, context: string}, index: number) => {
        setProcessingEssayIndex(index);
        addLog(`✒️ 칼럼 집필 중...`);
        try {
            const generated = await generateNewEssay(item.topic, item.context);
            if (generated.title && generated.content) {
                const newEssay: StandaloneEssay = {
                    id: `essay_ai_${Date.now()}`,
                    title: generated.title,
                    content: generated.content,
                    tags: generated.tags || ['AI'],
                    date: new Date().toISOString().slice(0, 10)
                };
                onUpdateDb(prev => ({...prev, essays: [newEssay, ...(prev.essays || [])]}));
                setSuggestedEssayTopics(prev => prev.filter((_, i) => i !== index));
                addLog(`✅ 칼럼 집필 완료: ${newEssay.title}`);
            }
        } catch (e) { addLog(`❌ 집필 실패: ${(e as Error).message}`); } finally { setProcessingEssayIndex(null); }
    };

    const handleSaveKey = async () => {
        const trimmed = apiKeyInput.trim();
        if (!trimmed) return;
        setKeyStatus('validating');
        const result = await validateApiKey(trimmed);
        if (result.isValid) {
            saveApiKey(trimmed);
            setKeyStatus('success');
            setHasSavedKey(true);
            setApiKeyInput('');
            alert('API 키가 저장되었습니다.');
        } else {
            setKeyStatus('error');
            alert(`키 검증 실패: ${result.error}`);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-full overflow-y-auto">
            <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-yellow-500 mb-4">🔑 API Key 설정</h3>
                    <div className="flex gap-2">
                        <input type="password" value={apiKeyInput} onChange={(e) => {setApiKeyInput(e.target.value); setKeyStatus('idle');}} placeholder={hasSavedKey ? "✅ 저장됨 (변경하려면 입력)" : "Gemini API Key"} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none"/>
                        <button onClick={handleSaveKey} disabled={keyStatus === 'validating'} className="px-4 py-2 bg-yellow-600 rounded-lg font-bold text-sm text-white">{keyStatus === 'validating' ? '...' : '저장'}</button>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-emerald-400 mb-4">👥 AI 페르소나 생성</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm text-gray-300">
                            <span>개수: {sampleCount}</span>
                            <input type="range" min="1" max="10" value={sampleCount} onChange={(e) => setSampleCount(parseInt(e.target.value))} className="w-32 accent-emerald-500"/>
                        </div>
                        <button onClick={handleGenerateSamples} disabled={isGeneratingSamples} className="w-full py-3 bg-emerald-600 rounded-lg font-bold text-white text-sm">{isGeneratingSamples ? '생성 중...' : '🎲 랜덤 예시 추가'}</button>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-blue-400 mb-4">🌐 시나리오 확장</h3>
                    <div className="space-y-4">
                        {suggestedTopics.length === 0 ? (
                            <button onClick={handleSuggestTopics} disabled={isAnalyzingTopics} className="w-full py-3 bg-blue-600/20 text-blue-300 font-bold rounded-lg text-sm">{isAnalyzingTopics ? '분석 중...' : '🔍 누락된 주제 찾기'}</button>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {suggestedTopics.map((topic, idx) => (
                                    <div key={idx} className="bg-black/30 p-3 rounded-lg flex justify-between items-center">
                                        <span className="text-xs text-blue-300 font-bold">{topic.goal} ({topic.moveType})</span>
                                        <button onClick={() => handleCreateTemplate(topic, idx)} disabled={processingTopicIndex !== null} className="px-3 py-1 bg-blue-600 text-white text-[10px] rounded font-bold">{processingTopicIndex === idx ? '...' : '추가'}</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-purple-400 mb-4">✒️ 칼럼/에세이 확장</h3>
                    <div className="space-y-4">
                        {suggestedEssayTopics.length === 0 ? (
                            <button onClick={handleSuggestEssays} disabled={isAnalyzingEssays} className="w-full py-3 bg-purple-600/20 text-purple-300 font-bold rounded-lg text-sm">{isAnalyzingEssays ? '분석 중...' : '🔍 주제 찾기'}</button>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {suggestedEssayTopics.map((item, idx) => (
                                    <div key={idx} className="bg-black/30 p-3 rounded-lg flex justify-between items-center">
                                        <span className="text-xs text-purple-300 font-bold truncate w-2/3">{item.topic}</span>
                                        <button onClick={() => handleCreateEssay(item, idx)} disabled={processingEssayIndex !== null} className="px-3 py-1 bg-purple-600 text-white text-[10px] rounded font-bold">{processingEssayIndex === idx ? '...' : '집필'}</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-5 flex flex-col h-full">
                <h3 className="text-sm font-bold text-gray-400 mb-4">System Console</h3>
                <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs p-2">
                    {logs.map((log, i) => <div key={i} className="border-b border-white/5 pb-1">{log}</div>)}
                </div>
            </div>
        </div>
    );
};

// --- 6. EXPORTED ADMIN DASHBOARD WRAPPER ---
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ db, onUpdateDb, templates, onUpdateTemplates, onClose }) => {
  const [tab, setTab] = useState<'dashboard' | 'samples' | 'templates' | 'essays'>('dashboard');
  const [showBackupModal, setShowBackupModal] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <GlassCard className="w-full max-w-6xl h-[90vh] flex flex-col relative border-t-4 border-t-emerald-500 shadow-2xl bg-[#1e293b]">
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">ADMIN</h2>
            <div className="flex bg-black/40 rounded-lg p-1">
                <button onClick={() => setTab('dashboard')} className={`px-4 py-2 rounded-md text-xs font-bold ${tab === 'dashboard' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>대시보드</button>
                <button onClick={() => setTab('samples')} className={`px-4 py-2 rounded-md text-xs font-bold ${tab === 'samples' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>랜덤 예시</button>
                <button onClick={() => setTab('templates')} className={`px-4 py-2 rounded-md text-xs font-bold ${tab === 'templates' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>템플릿</button>
                <button onClick={() => setTab('essays')} className={`px-4 py-2 rounded-md text-xs font-bold ${tab === 'essays' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>칼럼/에세이</button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowBackupModal(true)} className="px-4 py-2 bg-blue-600/20 text-blue-300 text-xs font-bold rounded-lg border border-blue-500/30">백업/복구</button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-gray-300">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
           {tab === 'dashboard' && <AIDashboardHome db={db} onUpdateDb={onUpdateDb} templates={templates} onUpdateTemplates={onUpdateTemplates} />}
           {tab === 'samples' && <RandomSampleEditor db={db} onUpdateDb={onUpdateDb} />}
           {tab === 'templates' && <TemplateManager templates={templates} onUpdateTemplates={onUpdateTemplates} />}
           {tab === 'essays' && <EssayEditor db={db} onUpdateDb={onUpdateDb} />}
        </div>
      </GlassCard>

      <DataExportModal 
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        db={db}
        templates={templates}
        onRestore={({ db: newDb, templates: newTemplates }) => {
            onUpdateDb(newDb);
            onUpdateTemplates(newTemplates);
            setShowBackupModal(false);
            alert("✅ 복구되었습니다.");
        }}
      />
    </div>
  );
};
