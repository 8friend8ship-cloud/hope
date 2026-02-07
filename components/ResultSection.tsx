
import React, { useRef } from 'react';
import { GlassCard } from './GlassCard';
import { StoryResult, SimulationStage } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ResultSectionProps {
  result: StoryResult | null;
  loading: boolean;
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

export const ResultSection: React.FC<ResultSectionProps> = ({ result, loading }) => {
  const contentRef = useRef<HTMLDivElement>(null);

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

  const { scenarioData, userInput, timestamp } = result;
  const { story } = scenarioData;

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

      </div>
    </div>
  );
};
