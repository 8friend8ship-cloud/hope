
import React, { useRef, useState } from 'react';
import { GlassCard } from './GlassCard';
import { StoryResult, SimulationStage, DownloadableResource, StandaloneEssay } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ResultSectionProps {
  result: StoryResult | null;
  loading: boolean;
  extraEssays?: StandaloneEssay[]; // Add support for DB essays
}

export const downloadPDFElement = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#1e293b',
      useCORS: true,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Failed to download PDF:', error);
  }
};

const ReportCard: React.FC<{ stage: SimulationStage }> = ({ stage }) => (
  <div className="mb-8 last:mb-0 relative group">
    <div className="absolute left-[-29px] top-0 bottom-0 w-0.5 bg-white/10 group-hover:bg-emerald-500/30 transition-colors"></div>
    <div className="absolute left-[-33px] top-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-[#1e293b] group-hover:scale-110 transition-transform"></div>
    
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-900/10">
      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
        <span className="text-emerald-400 font-mono text-sm font-bold tracking-wider uppercase">{stage.label}</span>
        <h3 className="text-xl font-bold text-white">{stage.title}</h3>
      </div>
      
      <div className="space-y-4 text-gray-300 font-light leading-relaxed">
        {/* Situation/Thinking/Action Group */}
        {(stage.situation || stage.thought || stage.action) && (
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 bg-black/20 p-4 rounded-xl border-l-2 border-emerald-500/50">
             {stage.situation && <p><strong className="text-gray-400 block text-xs mb-1 uppercase tracking-wider">상황 (Situation)</strong>{stage.situation}</p>}
             {stage.thought && <p><strong className="text-gray-400 block text-xs mb-1 uppercase tracking-wider">생각 (Thought)</strong><span className="italic text-emerald-200">"{stage.thought}"</span></p>}
             {stage.action && <p><strong className="text-gray-400 block text-xs mb-1 uppercase tracking-wider">행동 (Action)</strong>{stage.action}</p>}
          </div>
        )}

        {/* Experiment/Failure Group */}
        {(stage.experiment || stage.failure) && (
          <div className="bg-red-500/10 p-4 rounded-xl space-y-2 border-l-2 border-red-500/50 text-red-100">
             {stage.experiment && <p><strong className="text-red-300 block text-xs mb-1 uppercase tracking-wider">실험 (Experiment)</strong>{stage.experiment}</p>}
             {stage.failure && <p><strong className="text-red-300 block text-xs mb-1 uppercase tracking-wider">위기 (Critical Failure)</strong>{stage.failure}</p>}
          </div>
        )}

        {/* Question/Solution Group */}
        {(stage.question || stage.solution) && (
          <div className="space-y-3 pt-2">
             {stage.question && <p className="text-lg font-serif italic text-white/90 border-l-4 border-white/20 pl-4 py-1">Q. {stage.question}</p>}
             {stage.solution && (
                <div className="p-4 bg-emerald-900/10 rounded-xl border border-emerald-500/10">
                    <strong className="text-emerald-400 block text-xs mb-2 uppercase tracking-wider">💡 Solution</strong>
                    <div className="whitespace-pre-line">{stage.solution}</div>
                </div>
             )}
          </div>
        )}

        {/* Result/Reality Group */}
        {(stage.result || stage.reality) && (
          <div className="bg-gradient-to-r from-emerald-500/10 to-transparent p-5 rounded-xl space-y-3 border border-emerald-500/20 mt-2">
             {stage.result && <p className="font-bold text-emerald-100 text-lg">{stage.result}</p>}
             {stage.reality && (
                 <div className="pt-2 border-t border-emerald-500/20">
                    <strong className="text-emerald-400/70 block text-xs mb-2 uppercase tracking-wider">Reality Check</strong>
                    <div className="whitespace-pre-line text-sm opacity-90">{stage.reality}</div>
                 </div>
             )}
          </div>
        )}
      </div>
    </div>
  </div>
);

const ResourceCard: React.FC<{ resource: DownloadableResource }> = ({ resource }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTrigger = () => {
    if (resource.triggerType === 'ad') {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setUnlocked(true);
      }, 3000); // Simulate 3s Ad
    } else if (resource.triggerType === 'link' && resource.triggerUrl) {
      window.open(resource.triggerUrl, '_blank');
      setUnlocked(true);
    }
  };

  const handleDownload = () => {
    // In a real app, this would be the file URL.
    // For demo, we create a dummy text file.
    const element = document.createElement("a");
    const file = new Blob([`[HOPE PLATFORM] ${resource.title}\n\n${resource.description}\n\nThis is a sample file content for demonstration.`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${resource.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full relative overflow-hidden group">
      {/* Icon & Type */}
      <div className="flex justify-between items-start mb-3">
         <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-white ${resource.type === 'excel' ? 'bg-green-600' : 'bg-red-500'}`}>
            {resource.type === 'excel' ? 'X' : 'P'}
         </div>
         <div className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
            {resource.triggerType === 'ad' ? 'AD Free' : 'Affiliate'}
         </div>
      </div>

      <h4 className="font-bold text-gray-900 leading-tight mb-2 text-sm">{resource.title}</h4>
      <p className="text-xs text-gray-500 mb-4 flex-1">{resource.description}</p>

      {/* Lock Overlay */}
      {!unlocked ? (
        <button 
          onClick={handleTrigger}
          disabled={loading}
          className="w-full mt-auto py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
             <>
               <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
               광고 로딩중...
             </>
          ) : resource.triggerType === 'ad' ? (
             <><span>📺</span> 광고 보고 받기</>
          ) : (
             <><span>🔗</span> 최저가 확인 후 받기</>
          )}
        </button>
      ) : (
        <button 
          onClick={handleDownload}
          className="w-full mt-auto py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors animate-pulse"
        >
          ⬇️ 지금 다운로드
        </button>
      )}
    </div>
  );
};

export const ResultSection: React.FC<ResultSectionProps> = ({ result, loading, extraEssays }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isEssayUnlocked, setIsEssayUnlocked] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [expandedEssayId, setExpandedEssayId] = useState<string | null>(null);

  if (loading) {
    return (
      <GlassCard className="p-8 md:p-12 text-center min-h-[600px] flex flex-col items-center justify-center space-y-6 animate-pulse border-white/5 h-full">
        <div className="relative w-24 h-24">
             <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="space-y-2">
            <div className="text-2xl font-bold text-white">시뮬레이션 가동중...</div>
            <div className="text-base text-gray-400">
                100개국 정책 DB 분석<br/>
                현지 물가/세금/비자 데이터 매핑<br/>
                실패 시나리오 검증 중
            </div>
        </div>
      </GlassCard>
    );
  }

  if (!result) return null;

  const { scenarioData, userInput, timestamp, isDefault } = result;
  const { story, essay, downloads, visa, visaInfoUrl } = scenarioData;
  const { goal } = userInput;

  const handleUnlockEssay = () => {
    setIsAdPlaying(true);
    // Simulate Video Ad Duration (3 seconds)
    setTimeout(() => {
      setIsAdPlaying(false);
      setIsEssayUnlocked(true);
    }, 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in-up h-full">
      <div id="pdf-content" ref={contentRef} className="glass p-6 md:p-10 rounded-3xl font-sans text-gray-100 shadow-2xl border-t border-white/10 bg-[#1e293b] relative overflow-hidden h-full">
        
        {/* Background Texture for PDF */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none -mr-32 -mt-32"></div>

        {/* Header */}
        <div className="border-b border-white/10 pb-6 mb-8 relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="inline-block px-3 py-1 bg-white/5 rounded-full text-xs font-mono text-emerald-400 tracking-widest uppercase border border-white/5">
                    SIMULATION REPORT v4.0
                </div>
                <div className="text-right text-xs text-gray-500 font-mono">
                    Generated: {timestamp}
                </div>
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-white leading-tight mb-2 font-serif">
                {story.header}
            </h2>
            <div className="text-lg md:text-xl text-gray-400 font-light italic">
                {story.subHeader}
            </div>
            {isDefault && userInput.goal && userInput.goal !== '미지정' && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm">
                  <span className="font-bold">⚠️ 주의:</span> '{userInput.goal}'에 대한 상세 데이터가 없어, 가장 유사한 일반 시나리오로 대체하여 생성되었습니다. 비자, 물가 등은 참고용으로만 확인해주세요.
              </div>
            )}
        </div>

        {/* Stages Timeline */}
        <div className="pl-8 border-l border-white/5 space-y-2 relative z-10">
            {story.stages.map((stage, idx) => (
                <ReportCard key={idx} stage={stage} />
            ))}
        </div>

        {/* Stats Summary Table */}
        <div className="mt-12 bg-black/20 rounded-2xl p-6 border border-white/5">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="text-2xl">💰</span> 
                {userInput.age}세 {userInput.start} → {userInput.goal} 예상 결과 ({userInput.months}개월 후)
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-white/5">
                        <tr>
                            <th className="px-6 py-4 rounded-l-lg">항목</th>
                            <th className="px-6 py-4">현재 ({userInput.start})</th>
                            <th className="px-6 py-4">{userInput.goal}</th>
                            <th className="px-6 py-4 rounded-r-lg">차이</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scenarioData.resultTable.map((row, idx) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-bold text-emerald-400">{row.item}</td>
                                <td className="px-6 py-4">{row.before}</td>
                                <td className="px-6 py-4">{row.after}</td>
                                <td className={`px-6 py-4 font-bold ${row.diff.includes('-') ? 'text-emerald-400' : 'text-blue-400'}`}>
                                    {row.diff}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Footer Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
                <div className="text-sm text-gray-400 mb-1 uppercase tracking-wider">예측 성공 확률</div>
                <div className="text-4xl font-black text-white mb-2">
                    {scenarioData.success}%
                </div>
                <div className="text-xs text-gray-500">
                    실패 요인: {scenarioData.additionalInfo.obstacles.join(' + ')}
                </div>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">추천 액션 플랜</h4>
                <div className="space-y-3">
                    {scenarioData.additionalInfo.nextSteps.map((step, idx) => (
                        <div key={idx} className="p-3 bg-black/20 rounded-lg text-sm text-gray-300 flex items-center gap-3 hover:bg-black/30 cursor-pointer transition-colors border border-white/5 hover:border-emerald-500/30">
                            <span className="font-bold text-emerald-500 min-w-[80px]">[{step.label}]</span>
                            <span className="truncate">{step.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        {/* Official Visa Info Section */}
        {visaInfoUrl && (
          <div className="mt-12 pt-8 border-t border-white/10">
            <GlassCard className="p-6 flex flex-col md:flex-row items-center gap-6 bg-gradient-to-r from-blue-500/10 to-transparent border-blue-500/20">
              <div className="text-5xl">🏢</div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold text-white mb-1">공식 비자 정보 확인</h3>
                <p className="text-sm text-gray-300">
                  가장 정확한 최신 정보는 <span className="font-bold text-blue-300">{goal}</span> 정부 공식 사이트에서 확인해야 합니다.
                  <br/>
                  예상 비자 타입: <span className="font-semibold text-white">{visa}</span>
                </p>
              </div>
              <a 
                href={visaInfoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-900/50 flex items-center gap-2 whitespace-nowrap"
              >
                공식 사이트 바로가기 ↗
              </a>
            </GlassCard>
          </div>
        )}

        {/* Dry Author's Essay Section */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="bg-[#fffcf0] text-gray-800 p-8 rounded-xl shadow-2xl relative overflow-hidden font-serif">
             {/* Paper Texture Overlay */}
             <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
             
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-black text-xl">✒️</div>
                   <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">Dry Columnist</h4>
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{essay.title}</h3>
                   </div>
                </div>

                <div className="space-y-4 text-lg leading-relaxed text-gray-700">
                   <p className="font-medium">{essay.intro}</p>
                   
                   {isEssayUnlocked ? (
                      <div className="animate-fade-in space-y-4">
                         {essay.body.split('\n\n').map((paragraph, i) => (
                           <p key={i}>{paragraph}</p>
                         ))}
                         <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                            <p className="text-sm text-gray-500 italic">"준비되지 않은 희망은, 절망보다 잔인하다."</p>
                         </div>
                         
                         {/* Recommended Columns - Integrated Inside Essay Unlocked View */}
                         {extraEssays && extraEssays.length > 0 && (
                            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-5 text-left">
                                <h5 className="font-bold text-sm text-gray-500 uppercase mb-3 flex items-center gap-2">
                                    <span>📚</span> 건조한 작가의 다른 글 (Recommended Columns)
                                </h5>
                                <div className="space-y-3">
                                    {extraEssays.map((essayItem) => (
                                        <div key={essayItem.id} className="border-b border-gray-200 last:border-0 pb-3 last:pb-0">
                                            <button 
                                                onClick={() => setExpandedEssayId(expandedEssayId === essayItem.id ? null : essayItem.id)}
                                                className="w-full text-left flex justify-between items-start hover:bg-gray-100 p-2 rounded transition-colors group"
                                            >
                                                <div>
                                                    <div className="font-bold text-gray-800 group-hover:text-gray-900">{essayItem.title}</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {essayItem.date} · {essayItem.tags.map(t => `#${t} `)}
                                                    </div>
                                                </div>
                                                <span className="text-gray-400 text-xs mt-1">{expandedEssayId === essayItem.id ? '▲' : '▼'}</span>
                                            </button>
                                            
                                            {expandedEssayId === essayItem.id && (
                                                <div className="mt-2 p-3 bg-white border border-gray-100 rounded text-sm text-gray-700 whitespace-pre-line animate-fade-in">
                                                    {essayItem.content}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                         )}

                      </div>
                   ) : (
                      <div className="relative mt-4 p-6 bg-gray-100 rounded-xl text-center border border-gray-200">
                         {isAdPlaying ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-gray-600">스폰서 광고 재생 중 (3초)...</p>
                            </div>
                         ) : (
                            <div className="space-y-3">
                               <p className="text-sm text-gray-600">이후 내용은 현실적인 조언과 비판을 포함하고 있습니다.</p>
                               <button 
                                 onClick={handleUnlockEssay}
                                 className="px-6 py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors shadow-lg flex items-center justify-center gap-2 mx-auto w-full md:w-auto"
                               >
                                  <span>📺</span> 동영상 광고 보고 계속 읽기
                               </button>
                            </div>
                         )}
                      </div>
                   )}
                </div>

                {/* Premium Downloads Grid */}
                {downloads && downloads.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-200/50">
                    <p className="text-[10px] text-gray-400 font-sans uppercase tracking-widest mb-4">
                       Premium Resources (준비물)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                        {downloads.map((resource, idx) => (
                           <ResourceCard key={idx} resource={resource} />
                        ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
