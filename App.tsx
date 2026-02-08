
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { ResultSection, downloadPDFElement } from './components/ResultSection';
import { AdBanner } from './components/AdBanner';
import { ActionButtons } from './components/ActionButtons';
import { Toast } from './components/Toast';
import { AdminDashboard } from './components/AdminDashboard';
import { INITIAL_DB, GLOBAL_100, detectCountry, DEFAULT_TEMPLATES } from './constants';
import { UserInput, StoryResult, ScenarioDB, ScenarioData, ScenarioTemplate, ComparisonRow, EssayData, DownloadableResource } from './types';
import { GlassCard } from './components/GlassCard';
import { generateNewScenarioTemplate, parseUserPrompt } from './aiService';

function App() {
  // --- [CRITICAL FIX] Safe DB Hydration ---
  // 로컬스토리지 데이터가 깨졌거나 구버전일 경우를 대비해 초기화 로직 강화
  const [db, setDb] = useState<ScenarioDB>(() => {
    try {
      const saved = localStorage.getItem('app_db');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 병합 로직: 기존 데이터 + 새 필드(essays 등) + 누락된 기본값 복구
        return {
          ...INITIAL_DB, // 최신 구조 기반
          ...parsed,     // 사용자 데이터 덮어쓰기
          // 배열 필드가 null/undefined/숫자 등으로 깨져있을 경우 빈 배열로 강제 복구
          randomSamples: Array.isArray(parsed.randomSamples) ? parsed.randomSamples : INITIAL_DB.randomSamples,
          essays: Array.isArray(parsed.essays) ? parsed.essays : [],
          scenarios: parsed.scenarios || {}
        };
      }
    } catch (e) {
      console.error("DB Load Error, resetting to default:", e);
    }
    return INITIAL_DB;
  });

  const [templates, setTemplates] = useState<ScenarioTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('app_templates');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : DEFAULT_TEMPLATES;
      }
    } catch (e) {
      console.error("Templates Load Error, resetting:", e);
    }
    return DEFAULT_TEMPLATES;
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const [input, setInput] = useState<UserInput>({
    age: '',
    job: '',
    start: '',
    goal: '',
    months: 24,
    country: '',
    forcedTemplateId: '',
    family: '',
    moveType: '',
    assets: '',
    useAI: false
  });
  const [result, setResult] = useState<StoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash === '#admin') setShowAdminLogin(true);
  }, []);

  // Persist DB and Templates to LocalStorage
  useEffect(() => {
    localStorage.setItem('app_db', JSON.stringify(db));
  }, [db]);
  useEffect(() => {
    localStorage.setItem('app_templates', JSON.stringify(templates));
  }, [templates]);

  const handleAdminLogin = () => {
    if (adminPassword === '1234') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setToastMessage("🔓 관리자 모드로 접속했습니다.");
    } else {
      alert("비밀번호가 올바르지 않습니다.");
    }
  };

  const handleInputChange = (field: keyof UserInput, value: string | number) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  const generateStory = useCallback(async (generationInput: UserInput) => {
    setLoading(true);
    setResult(null); 
    setAiGenerating(false);
    
    // 1. Prepare Variables
    const age = generationInput.age || '미지정';
    const job = generationInput.job || '미지정';
    const start = generationInput.start || '미지정';
    const goal = generationInput.goal || '미지정';
    const months = generationInput.months || 24;
    const countryKey = generationInput.country || detectCountry(goal);
    const config = GLOBAL_100[countryKey] || GLOBAL_100['default'];
    const isDefaultScenario = countryKey === 'default' && !generationInput.forcedTemplateId && !generationInput.useAI;

    // 2. Select Template Logic
    let selectedTemplate: ScenarioTemplate | null = null;
    let usedAI = false;
    
    // CASE A: Explicit AI Generation Mode (from Admin or specific trigger)
    if (generationInput.useAI && process.env.API_KEY) {
        setAiGenerating(true);
        try {
           const aiTemplate = await generateNewScenarioTemplate(generationInput);
           if (aiTemplate) {
              selectedTemplate = aiTemplate;
              // Save the new template for permanent storage
              setTemplates(prev => [aiTemplate, ...prev]);
              setToastMessage("🤖 AI가 생성한 새 템플릿이 영구 저장되었습니다.");
              usedAI = true;
           }
        } catch (e) {
           console.error("Forced AI Generation failed", e);
           setToastMessage("❌ AI 생성 실패. 기존 템플릿을 사용합니다.");
        }
        setAiGenerating(false);
    }

    // CASE B: Forced Template ID (Pre-linked in Admin)
    if (!selectedTemplate && generationInput.forcedTemplateId) {
      selectedTemplate = templates.find(t => t.id === generationInput.forcedTemplateId) || null;
    }

    // CASE C: Intelligent Matching (Fallback)
    if (!selectedTemplate) {
        const jobLower = job.toLowerCase();
        const goalLower = goal.toLowerCase();
        
        // Find by tags
        selectedTemplate = templates.find(t => {
             const hasGoal = t.tags.some(tag => goalLower.includes(tag));
             const hasFamily = generationInput.family ? t.tags.some(tag => generationInput.family?.toLowerCase().includes(tag)) : true;
             return hasGoal && hasFamily;
        }) || null;

        // Fallback: Just goal matching
        if (!selectedTemplate) {
            selectedTemplate = templates.find(t => t.tags.some(tag => goalLower.includes(tag))) || null;
        }
        
        // Final Fallback: AI (if not explicitly disabled and API key exists and goal is valid)
        if (!selectedTemplate && process.env.API_KEY && goal !== '미지정') {
           setAiGenerating(true);
           try {
              const aiTemplate = await generateNewScenarioTemplate(generationInput);
              if (aiTemplate) {
                 selectedTemplate = aiTemplate;
                 setTemplates(prev => [aiTemplate, ...prev]);
                 setToastMessage("🤖 새로운 패턴 발견! AI가 분석하여 저장했습니다.");
                 usedAI = true;
              }
           } catch (e) { console.error(e); }
           setAiGenerating(false);
        }
    }
    
    // Final Safe Fallback
    if (!selectedTemplate) {
      selectedTemplate = templates.find(t => t.id === 'template_default') || templates[0];
    }

    // 3. Inject Variables
    const inject = (text?: string) => {
      if (!text) return "";
      return text
        .replace(/{age}/g, age)
        .replace(/{job}/g, job)
        .replace(/{start}/g, start)
        .replace(/{goal}/g, goal)
        .replace(/{months}/g, months.toString())
        .replace(/{currency}/g, config.currency)
        .replace(/{prop}/g, config.prop)
        .replace(/{bank}/g, config.bank)
        .replace(/{visa}/g, config.visaName)
        .replace(/{family}/g, generationInput.family || '가족')
        .replace(/{moveType}/g, generationInput.moveType || '이동');
    };

    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    // 4. Generate Result Table
    let resultTable: ComparisonRow[] = [];
    
    if (selectedTemplate.resultTable) {
      resultTable = selectedTemplate.resultTable.map(row => ({
        item: inject(row.item),
        before: inject(row.before),
        after: inject(row.after),
        diff: inject(row.diff)
      }));
    } else {
      resultTable = [
          { item: '월 생활비', before: `${config.currency} 4,500`, after: `${config.currency} 3,200`, diff: `-1,300` },
          { item: '자산', before: '유동성 부족', after: '환차익 발생', diff: `+${randInt(1, 15)}%` },
          { item: '의료비', before: '보험 적용', after: '사립 병원', diff: '+200%' },
          { item: '순 저축', before: '100', after: '350', diff: '+250' }
      ];
    }

    // 5. Generate Essay
    const defaultEssay: EssayData = {
      title: `${goal}의 현실: 숫자가 말해주지 않는 것들`,
      intro: `${start}를 떠나 ${goal}로 향하는 당신의 발걸음은 가볍겠지만, 현실의 무게는 결코 가볍지 않습니다.`,
      body: "우리는 종종 장소만 바뀌면 삶이 바뀔 것이라 착각합니다. 하지만 당신이 가져가는 것은 짐가방뿐만이 아닙니다. 당신의 불안과 습관도 국경을 넘습니다."
    };

    const essayData: EssayData = selectedTemplate.essay ? {
      title: inject(selectedTemplate.essay.title),
      intro: inject(selectedTemplate.essay.intro),
      body: inject(selectedTemplate.essay.body)
    } : defaultEssay;

    // 6. Generate Downloads
    const downloads: DownloadableResource[] = selectedTemplate.downloads ? selectedTemplate.downloads.map(d => ({
      ...d,
      title: inject(d.title),
      description: inject(d.description),
      triggerUrl: inject(d.triggerUrl)
    })) : [];

    const scenarioData: ScenarioData = {
        success: randInt(40, 95),
        salary: config.avgSalary,
        visa: config.visaName,
        living: randInt(100, 450), 
        story: {
            header: inject(selectedTemplate.story.titleTemplate),
            subHeader: inject(selectedTemplate.story.subTemplate),
            stages: selectedTemplate.story.stages.map(s => ({
              label: s.label,
              title: inject(s.title),
              situation: inject(s.content.situation),
              thought: inject(s.content.thought),
              action: inject(s.content.action),
              experiment: inject(s.content.experiment),
              failure: inject(s.content.failure),
              question: inject(s.content.question),
              solution: inject(s.content.solution),
              result: inject(s.content.result),
              reality: inject(s.content.reality),
            })) as [any, any, any, any]
        },
        resultTable: resultTable,
        additionalInfo: {
            obstacles: ['현지 규제', '환율 변동', '언어 장벽'],
            nextSteps: [
                { label: '구글 검색', value: `${start} 은퇴자 ${goal} 비자 후기` },
                { label: '유튜브', value: `${goal} 현지 물가 브이로그` },
                { label: 'PDF 다운로드', value: `${goal} 정착 가이드` }
            ]
        },
        essay: essayData,
        downloads: downloads,
        visaInfoUrl: config.visaInfoUrl,
    };

    const title = scenarioData.story.header;
    const progress = randInt(50, 92);

    const newResult: StoryResult = {
      title,
      scenarioData,
      progress,
      userInput: generationInput,
      timestamp: new Date().toLocaleTimeString(),
      isDefault: isDefaultScenario && !usedAI,
    };

    setResult(newResult);
    setLoading(false);
    
    localStorage.setItem('lastStory', JSON.stringify({ input: newResult.userInput }));
    
    if (window.innerWidth < 1024) {
        setTimeout(() => {
          const resultEl = document.getElementById('result-anchor');
          if (resultEl) resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
  }, [templates, db]);

  const handleGenerateFromPrompt = async (parsedData: Partial<UserInput>, rawText?: string) => {
    let finalInput: UserInput = {
      age: '', job: '', start: '', goal: '', months: 24, country: '', forcedTemplateId: '', family: '', moveType: '', assets: '', useAI: false,
      ...parsedData
    };

    if (rawText && rawText.length > 10 && process.env.API_KEY) {
        setAiAnalyzing(true);
        try {
            const deepAnalysis = await parseUserPrompt(rawText);
            finalInput = { ...finalInput, ...deepAnalysis };
        } catch (e) {
            console.error("Deep analysis failed, using regex fallback");
        }
        setAiAnalyzing(false);
    }

    setInput(finalInput);
    generateStory(finalInput);
  };

  const handleRandom = () => {
    const samples = db.randomSamples || [];
    if (samples.length === 0) {
      setToastMessage("🎲 관리자 페이지에서 랜덤 예시를 추가해주세요.");
      return;
    }
    const random = samples[Math.floor(Math.random() * samples.length)];
    const baseInput: UserInput = {
      age: '', job: '', start: '', goal: '', months: 24, country: '', forcedTemplateId: '', family: '', moveType: '', assets: '', useAI: false
    };
    const finalInput = { ...baseInput, ...random };
    
    setInput(finalInput);
    setToastMessage("🎲 랜덤 시나리오를 구성했습니다.");
    setTimeout(() => generateStory(finalInput), 500);
  };

  const handleDownload = () => {
    if (result) {
      downloadPDFElement('pdf-content', `희망구매_${result.userInput.goal}_${Date.now()}`);
      setToastMessage("📄 리포트가 PDF로 저장되었습니다.");
    }
  };

  const handleSearch = (type: 'google' | 'youtube') => {
    const qGoal = input.goal || '이민';
    const qJob = input.job || '취업';
    const url = type === 'google' 
      ? `https://google.com/search?q=${input.age}세 ${qGoal} ${qJob} 현실 비용`
      : `https://youtube.com/results?search_query=${qGoal} ${qJob} 브이로그`;
    window.open(url);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-emerald-500 selection:text-white">
       <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px]"></div>
       </div>

      <div className="relative w-full max-w-[1400px] mx-auto min-h-screen flex flex-col pb-safe px-4 md:px-6 lg:px-8">
        
        <div className="pt-4 md:pt-8 pb-6">
           <Header 
             scenarioCount={templates.length} 
             lastVerified={db.lastVerified}
             onAdminClick={() => setShowAdminLogin(true)}
           />
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            <div className="lg:col-span-4 space-y-6 sticky top-8">
                <InputForm 
                  input={input}
                  onChange={handleInputChange}
                  onGenerate={handleGenerateFromPrompt}
                  onRandom={handleRandom}
                  onDownload={handleDownload}
                  canDownload={!!result}
                  isGenerating={loading || aiAnalyzing}
                />
                
                <div className="hidden lg:block space-y-6">
                    <ActionButtons 
                      onGoogleSearch={() => handleSearch('google')}
                      onYoutubeSearch={() => handleSearch('youtube')}
                      onRandom={handleRandom}
                      onRefresh={() => window.location.reload()}
                      onReward={() => {}} 
                    />
                    <AdBanner />
                </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
                <div id="result-anchor"></div>
                
                {!result && !loading && !aiAnalyzing && (
                    <div className="hidden lg:flex h-full min-h-[400px] items-center justify-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5 text-gray-400">
                        <div className="text-center p-8">
                            <div className="text-4xl mb-4">👈</div>
                            <h3 className="text-xl font-bold mb-2">시뮬레이션을 시작하세요</h3>
                            <p className="text-sm">구체적으로 입력할수록 AI가<br/>더 정밀한 미래를 예측합니다.</p>
                        </div>
                    </div>
                )}

                <ResultSection 
                    result={result} 
                    loading={loading} 
                    extraEssays={db.essays} 
                />
                
                {aiAnalyzing && (
                    <div className="absolute inset-0 z-20 bg-[#0f172a]/90 backdrop-blur-md flex items-center justify-center rounded-3xl">
                        <div className="text-center space-y-4 p-8">
                             <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                             <div>
                                 <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 animate-pulse">
                                     Deep Prompt Analysis...
                                 </h3>
                                 <p className="text-sm text-gray-400 mt-2">
                                     입력하신 내용의 의도를 파악하고 있습니다.<br/>(가족 구성원, 이사 목적, 예산 규모 등)
                                 </p>
                             </div>
                        </div>
                    </div>
                )}

                {loading && aiGenerating && (
                    <div className="absolute inset-0 z-20 bg-[#0f172a]/90 backdrop-blur-md flex items-center justify-center rounded-3xl">
                        <div className="text-center space-y-4 p-8">
                             <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                             <div>
                                 <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 animate-pulse">
                                     Creating New Scenario...
                                 </h3>
                                 <p className="text-sm text-gray-400 mt-2">
                                     '{input.goal}'에 대한 맞춤형 템플릿을 생성 중입니다.<br/>
                                     분석된 결과는 영구 보존됩니다.
                                 </p>
                             </div>
                        </div>
                    </div>
                )}

                <div className="lg:hidden space-y-6">
                    <AdBanner />
                    <ActionButtons 
                      onGoogleSearch={() => handleSearch('google')}
                      onYoutubeSearch={() => handleSearch('youtube')}
                      onRandom={handleRandom}
                      onRefresh={() => window.location.reload()}
                      onReward={() => {}} 
                    />
                </div>
            </div>
        </div>
        
        <div className="h-12"></div>
      </div>

      {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <GlassCard className="p-8 w-full max-w-sm text-center space-y-6 border border-white/20">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">System Access</h2>
              <input 
                type="password" 
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                className="w-full p-4 bg-white/5 rounded-xl text-center text-xl font-bold border border-white/10 focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="Passcode"
                autoFocus
              />
              <div className="flex gap-4">
                <button onClick={() => setShowAdminLogin(false)} className="flex-1 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition-colors font-medium">Cancel</button>
                <button onClick={handleAdminLogin} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors font-bold shadow-lg shadow-emerald-900/50">Enter</button>
              </div>
            </GlassCard>
          </div>
      )}

      {isAdmin && (
        <AdminDashboard 
          db={db} 
          onUpdateDb={setDb} 
          templates={templates} 
          onUpdateTemplates={setTemplates}
          onClose={() => setIsAdmin(false)} 
        />
      )}
      
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}

export default App;
