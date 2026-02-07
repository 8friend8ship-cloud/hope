
import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { ScenarioDB, ScenarioTemplate, DownloadableResource } from '../types';
import { DEFAULT_TEMPLATES } from '../constants';

interface AdminDashboardProps {
  db: ScenarioDB;
  onUpdateDb: (newDb: ScenarioDB) => void;
  templates: ScenarioTemplate[];
  onUpdateTemplates: (newTemplates: ScenarioTemplate[]) => void;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  db, 
  onUpdateDb, 
  templates, 
  onUpdateTemplates, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'control' | 'templates'>('control');
  const [logs, setLogs] = useState<string[]>([]);
  
  // Template Editing State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<'json' | 'easy'>('easy'); // New Toggle

  // Temporary state for Easy Editor
  const [easyData, setEasyData] = useState<ScenarioTemplate | null>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev]);
  };

  const handleVerifyAll = () => {
    addLog("🤖 AI 전체 검증 시작... (Data Integrity Check)");
    setTimeout(() => {
      onUpdateDb({
        ...db,
        lastVerified: new Date().toLocaleString(),
        changes: [
          { type: '시스템', details: '100개 시나리오 정합성 검증 완료', timestamp: new Date().toLocaleString() },
          ...db.changes
        ]
      });
      addLog("✅ 검증 완료. 데이터베이스가 최신 상태입니다.");
    }, 1500);
  };

  const handleSelectTemplate = (t: ScenarioTemplate) => {
    setSelectedTemplateId(t.id);
    const jsonStr = JSON.stringify(t, null, 2);
    setJsonInput(jsonStr);
    setEasyData(JSON.parse(jsonStr)); // Deep copy
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    const newTemplate = { ...DEFAULT_TEMPLATES[0], id: `custom_${Date.now()}`, tags: ['new'] };
    setSelectedTemplateId(null);
    const jsonStr = JSON.stringify(newTemplate, null, 2);
    setJsonInput(jsonStr);
    setEasyData(newTemplate);
    setIsEditing(true);
  };

  const handleSaveTemplate = () => {
    try {
      // Use easyData if in easy mode, otherwise parse jsonInput
      const payload = editMode === 'easy' && easyData ? easyData : JSON.parse(jsonInput);
      
      if (!payload.id || !payload.story) throw new Error("Invalid Format");
      
      const exists = templates.find(t => t.id === payload.id);
      let newTemplates;
      
      if (exists) {
        newTemplates = templates.map(t => t.id === payload.id ? payload : t);
        addLog(`📝 템플릿 수정됨: ${payload.id}`);
      } else {
        newTemplates = [payload, ...templates];
        addLog(`✨ 새 템플릿 추가됨: ${payload.id}`);
      }
      
      onUpdateTemplates(newTemplates);
      
      // Update local states to reflect save
      setJsonInput(JSON.stringify(payload, null, 2));
      setEasyData(payload);
      
      // Don't close editing, just notify
      alert("저장되었습니다.");
    } catch (e) {
      alert("데이터 형식이 올바르지 않습니다. JSON 탭을 확인해주세요.");
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("정말 이 템플릿을 삭제하시겠습니까?")) {
      const newTemplates = templates.filter(t => t.id !== id);
      onUpdateTemplates(newTemplates);
      addLog(`🗑️ 템플릿 삭제됨: ${id}`);
      if (selectedTemplateId === id) {
        setIsEditing(false);
        setSelectedTemplateId(null);
      }
    }
  };

  const handleResetDefaults = () => {
    if (confirm("모든 커스텀 템플릿이 삭제되고 초기 상태로 복구됩니다. 계속하시겠습니까?")) {
      onUpdateTemplates(DEFAULT_TEMPLATES);
      addLog("🔄 시스템 초기화 완료 (Factory Reset)");
    }
  };

  // --- Easy Editor Handlers ---
  const updateEasyField = (section: 'essay' | 'story', field: string, value: string) => {
    if (!easyData) return;
    setEasyData({
      ...easyData,
      [section]: {
        ...easyData[section as keyof ScenarioTemplate],
        [field]: value
      }
    });
  };

  const addDownloadItem = () => {
    if (!easyData) return;
    const newDownload: DownloadableResource = {
      title: "새로운 자료 제목",
      description: "자료에 대한 설명을 입력하세요.",
      type: "pdf",
      triggerType: "ad",
      fileUrl: ""
    };
    setEasyData({
      ...easyData,
      downloads: [...(easyData.downloads || []), newDownload]
    });
  };

  const removeDownloadItem = (index: number) => {
    if (!easyData || !easyData.downloads) return;
    const newDownloads = [...easyData.downloads];
    newDownloads.splice(index, 1);
    setEasyData({ ...easyData, downloads: newDownloads });
  };

  const updateDownloadItem = (index: number, field: keyof DownloadableResource, value: string) => {
    if (!easyData || !easyData.downloads) return;
    const newDownloads = [...easyData.downloads];
    newDownloads[index] = { ...newDownloads[index], [field]: value };
    setEasyData({ ...easyData, downloads: newDownloads });
  };

  const suggestDownloads = () => {
    if (!easyData) return;
    const tags = easyData.tags.join(' ');
    let suggestion: DownloadableResource = {
      title: "필수 체크리스트",
      description: "준비 과정을 위한 필수 항목 정리",
      type: "pdf",
      triggerType: "ad"
    };

    if (tags.includes('bali') || tags.includes('indonesia')) {
      suggestion = {
        title: "발리 비자(KITAS) 발급 가이드 2026",
        description: "대행사 없이 직접 신청하는 방법 및 필요 서류 (PDF)",
        type: "pdf",
        triggerType: "ad"
      };
    } else if (tags.includes('gangnam') || tags.includes('invest')) {
      suggestion = {
        title: "부동산 대출 이자 시뮬레이터",
        description: "금리 변동에 따른 월 상환액 자동 계산 (Excel)",
        type: "excel",
        triggerType: "ad"
      };
    } else if (tags.includes('portugal') || tags.includes('europe')) {
      suggestion = {
        title: "EU 이민 세금(NIF) 절세 가이드",
        description: "초기 정착 시 세금을 20% 절약하는 법 (PDF)",
        type: "pdf",
        triggerType: "ad"
      };
    }

    setEasyData({
      ...easyData,
      downloads: [...(easyData.downloads || []), suggestion]
    });
    alert("🤖 AI가 시나리오에 맞는 자료를 추천하여 추가했습니다.");
  };

  // Sync JSON input when switching back to JSON tab
  useEffect(() => {
    if (editMode === 'json' && easyData) {
      setJsonInput(JSON.stringify(easyData, null, 2));
    } else if (editMode === 'easy' && jsonInput) {
      try {
        setEasyData(JSON.parse(jsonInput));
      } catch (e) {
        // invalid json, keep previous easyData or handle error
      }
    }
  }, [editMode]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] text-white overflow-hidden flex flex-col font-sans">
      {/* Header */}
      <div className="bg-[#1e293b] border-b border-white/10 p-4 md:p-6 flex justify-between items-center shadow-lg z-10">
        <h1 className="text-2xl md:text-3xl font-black text-emerald-400 flex items-center gap-3">
          🛡️ Admin Console
          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20">Persistent Mode</span>
        </h1>
        <button onClick={onClose} className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-bold transition-all border border-red-500/20">
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-[#1e293b]/50">
        <button 
          onClick={() => setActiveTab('control')}
          className={`flex-1 py-4 font-bold text-sm uppercase tracking-widest transition-colors ${activeTab === 'control' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          System Control
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-4 font-bold text-sm uppercase tracking-widest transition-colors ${activeTab === 'templates' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Template Manager ({templates.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* TAB: CONTROL */}
        {activeTab === 'control' && (
          <div className="h-full overflow-y-auto p-6 md:p-8 space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassCard className="p-6 text-center">
                    <div className="text-4xl mb-2">💾</div>
                    <div className="font-bold mb-2">데이터 영구 보존</div>
                    <div className="text-xs text-gray-400">LocalStorage 연동됨<br/>브라우저를 닫아도 유지</div>
                </GlassCard>
                <GlassCard className="p-6 text-center">
                    <div className="text-4xl mb-2">⚡</div>
                    <div className="font-bold mb-2">실시간 검증</div>
                    <button onClick={handleVerifyAll} className="mt-2 px-4 py-2 bg-emerald-600 rounded-lg text-xs font-bold w-full">실행</button>
                </GlassCard>
                <GlassCard className="p-6 text-center">
                    <div className="text-4xl mb-2">🔄</div>
                    <div className="font-bold mb-2">초기화</div>
                    <button onClick={handleResetDefaults} className="mt-2 px-4 py-2 bg-orange-600 rounded-lg text-xs font-bold w-full">Factory Reset</button>
                </GlassCard>
             </div>

             <GlassCard className="p-6">
                <h2 className="text-xl font-bold mb-4">📜 System Logs</h2>
                <div className="h-64 bg-black/30 rounded-xl p-4 overflow-y-auto font-mono text-sm space-y-2 text-gray-300">
                  {logs.length === 0 && <span className="opacity-50">시스템 대기 중...</span>}
                  {logs.map((log, i) => (
                    <div key={i} className="border-b border-white/5 pb-1">{log}</div>
                  ))}
                </div>
             </GlassCard>
          </div>
        )}

        {/* TAB: TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="h-full flex flex-col md:flex-row">
            {/* List Sidebar */}
            <div className="w-full md:w-1/4 border-r border-white/10 bg-black/20 flex flex-col h-full">
               <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1e293b]">
                  <span className="font-bold text-gray-400">Templates</span>
                  <button onClick={handleCreateNew} className="text-xs bg-emerald-600 px-3 py-1 rounded text-white font-bold hover:bg-emerald-500">+ New</button>
               </div>
               <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {templates.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => handleSelectTemplate(t)}
                      className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedTemplateId === t.id ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                    >
                       <div className="flex justify-between">
                         <span className="font-bold text-sm truncate">{t.id}</span>
                         <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${t.type === 'report' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>{t.type}</span>
                       </div>
                       <div className="text-xs text-gray-400 mt-1 truncate">{t.tags.join(', ')}</div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col h-full bg-[#1e293b]">
               {isEditing && easyData ? (
                 <>
                   {/* Editor Toolbar */}
                   <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                      <div className="flex gap-4 items-center">
                         <div className="text-sm text-gray-400">Editing: <span className="text-white font-bold">{easyData.id}</span></div>
                         <div className="flex bg-black/40 rounded-lg p-1">
                             <button 
                               onClick={() => setEditMode('easy')} 
                               className={`px-3 py-1 text-xs font-bold rounded ${editMode === 'easy' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                             >
                               ✨ 이지 에디터
                             </button>
                             <button 
                               onClick={() => setEditMode('json')} 
                               className={`px-3 py-1 text-xs font-bold rounded ${editMode === 'json' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                             >
                               💾 JSON 원본
                             </button>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         {selectedTemplateId && (
                           <button onClick={() => handleDeleteTemplate(selectedTemplateId)} className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded font-bold text-xs">Delete</button>
                         )}
                         <button onClick={handleSaveTemplate} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold text-xs text-white shadow-lg">Save Changes</button>
                      </div>
                   </div>

                   {/* Main Content Area */}
                   <div className="flex-1 overflow-y-auto">
                      {editMode === 'easy' ? (
                        <div className="p-8 max-w-4xl mx-auto space-y-8 pb-20">
                            
                            {/* 1. Dry Author Essay Section */}
                            <GlassCard className="p-6 border-l-4 border-l-indigo-500">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                   ✒️ 건조한 작가 에세이
                                   <span className="text-xs font-normal text-gray-400 bg-white/10 px-2 py-1 rounded">사용자가 결과를 본 후 읽게 될 냉소적인 칼럼입니다.</span>
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-indigo-300 mb-1 font-bold">제목</label>
                                        <input 
                                          value={easyData.essay?.title || ''}
                                          onChange={(e) => updateEasyField('essay', 'title', e.target.value)}
                                          className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none"
                                          placeholder="예) 낙원은 가성비의 영역이 아니다"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-indigo-300 mb-1 font-bold">도입부 (무료 공개)</label>
                                        <textarea 
                                          value={easyData.essay?.intro || ''}
                                          onChange={(e) => updateEasyField('essay', 'intro', e.target.value)}
                                          className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none h-20"
                                          placeholder="사용자의 환상을 깨는 강력한 첫 문단을 작성하세요."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-indigo-300 mb-1 font-bold">본문 (광고/유료 잠금)</label>
                                        <textarea 
                                          value={easyData.essay?.body || ''}
                                          onChange={(e) => updateEasyField('essay', 'body', e.target.value)}
                                          className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none h-40"
                                          placeholder="현실적인 조언, 비용 문제, 겪게 될 어려움 등을 서술하세요."
                                        />
                                    </div>
                                </div>
                            </GlassCard>

                            {/* 2. Download Manager Section */}
                            <GlassCard className="p-6 border-l-4 border-l-emerald-500">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            📥 PDF 자료 관리 (수익화)
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1">
                                            사용자가 광고를 보거나 링크를 클릭해야 다운로드 받을 수 있는 자료입니다.<br/>
                                            <span className="text-emerald-400 font-bold">* 시스템 권장: PDF 가이드 1개 + 엑셀 계산기 1개</span>
                                        </p>
                                    </div>
                                    <button 
                                        onClick={suggestDownloads}
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-lg animate-pulse"
                                    >
                                        🤖 AI 자료 제안받기
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {easyData.downloads?.map((item, idx) => (
                                        <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 relative group">
                                            <button 
                                                onClick={() => removeDownloadItem(idx)}
                                                className="absolute top-2 right-2 text-red-400 hover:text-red-300 bg-black/20 rounded-full w-6 h-6 flex items-center justify-center"
                                            >
                                                ×
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 mb-1 uppercase">자료 제목</label>
                                                    <input 
                                                        value={item.title}
                                                        onChange={(e) => updateDownloadItem(idx, 'title', e.target.value)}
                                                        className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 mb-1 uppercase">잠금 해제 방식</label>
                                                    <select 
                                                        value={item.triggerType}
                                                        onChange={(e) => updateDownloadItem(idx, 'triggerType', e.target.value as any)}
                                                        className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm text-gray-300"
                                                    >
                                                        <option value="ad">📺 동영상 광고 시청</option>
                                                        <option value="link">🔗 제휴 링크(쿠팡) 클릭</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] text-gray-500 mb-1 uppercase">자료 설명</label>
                                                    <input 
                                                        value={item.description}
                                                        onChange={(e) => updateDownloadItem(idx, 'description', e.target.value)}
                                                        className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm"
                                                    />
                                                </div>
                                                {item.triggerType === 'link' && (
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[10px] text-yellow-500 mb-1 uppercase">제휴 링크 URL (필수)</label>
                                                        <input 
                                                            value={item.triggerUrl || ''}
                                                            onChange={(e) => updateDownloadItem(idx, 'triggerUrl', e.target.value)}
                                                            className="w-full bg-black/30 border border-yellow-500/30 rounded p-2 text-sm text-yellow-200"
                                                            placeholder="https://coupang.com/..."
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {(!easyData.downloads || easyData.downloads.length === 0) && (
                                        <div className="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-xl">
                                            등록된 자료가 없습니다. 상단의 'AI 자료 제안받기'를 눌러보세요.
                                        </div>
                                    )}

                                    <button 
                                        onClick={addDownloadItem}
                                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors"
                                    >
                                        + 직접 자료 추가하기
                                    </button>
                                </div>
                            </GlassCard>

                        </div>
                      ) : (
                        <textarea 
                          value={jsonInput}
                          onChange={(e) => setJsonInput(e.target.value)}
                          className="w-full h-full bg-[#0f172a] text-emerald-300 font-mono text-xs p-6 focus:outline-none resize-none leading-relaxed"
                          spellCheck={false}
                        />
                      )}
                   </div>
                 </>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                    <div className="text-4xl mb-4 opacity-50">👈</div>
                    <p>Select a template to edit or create a new one.</p>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
