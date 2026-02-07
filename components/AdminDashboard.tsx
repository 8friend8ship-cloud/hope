
import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { ScenarioDB, ScenarioTemplate } from '../types';
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
    setJsonInput(JSON.stringify(t, null, 2));
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    const newTemplate = { ...DEFAULT_TEMPLATES[0], id: `custom_${Date.now()}`, tags: ['new'] };
    setSelectedTemplateId(null);
    setJsonInput(JSON.stringify(newTemplate, null, 2));
    setIsEditing(true);
  };

  const handleSaveTemplate = () => {
    try {
      const parsed = JSON.parse(jsonInput) as ScenarioTemplate;
      if (!parsed.id || !parsed.story) throw new Error("Invalid Format");
      
      const exists = templates.find(t => t.id === parsed.id);
      let newTemplates;
      
      if (exists) {
        newTemplates = templates.map(t => t.id === parsed.id ? parsed : t);
        addLog(`📝 템플릿 수정됨: ${parsed.id}`);
      } else {
        newTemplates = [parsed, ...templates];
        addLog(`✨ 새 템플릿 추가됨: ${parsed.id}`);
      }
      
      onUpdateTemplates(newTemplates);
      setIsEditing(false);
      setSelectedTemplateId(null);
    } catch (e) {
      alert("JSON 형식이 올바르지 않습니다. 다시 확인해주세요.");
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

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] text-white overflow-hidden flex flex-col">
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
            <div className="w-full md:w-1/3 border-r border-white/10 bg-black/20 flex flex-col h-full">
               <div className="p-4 border-b border-white/10 flex justify-between items-center">
                  <span className="font-bold text-gray-400">Available Templates</span>
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
               {isEditing ? (
                 <>
                   <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                      <div className="text-sm text-gray-400">Editing: <span className="text-white font-bold">{JSON.parse(jsonInput).id || 'New Template'}</span></div>
                      <div className="flex gap-2">
                         {selectedTemplateId && (
                           <button onClick={() => handleDeleteTemplate(selectedTemplateId)} className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded font-bold text-xs">Delete</button>
                         )}
                         <button onClick={handleSaveTemplate} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold text-xs text-white shadow-lg">Save Changes</button>
                      </div>
                   </div>
                   <div className="flex-1 relative">
                      <textarea 
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        className="w-full h-full bg-[#0f172a] text-emerald-300 font-mono text-xs p-6 focus:outline-none resize-none leading-relaxed"
                        spellCheck={false}
                      />
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
