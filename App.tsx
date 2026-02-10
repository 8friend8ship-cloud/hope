
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { ResultSection, downloadPDFElement } from './components/ResultSection';
import { AdBanner } from './components/AdBanner';
import { ActionButtons } from './components/ActionButtons';
import { Toast } from './components/Toast';
import { AdminDashboard } from './components/AdminDashboard';
import { INITIAL_DB, GLOBAL_100, detectCountry, DEFAULT_TEMPLATES } from './constants';
import { UserInput, StoryResult, ScenarioDB, ScenarioData, ScenarioTemplate, ComparisonRow, EssayData, DownloadableResource, Language } from './types';
import { GlassCard } from './components/GlassCard';
import { generateNewScenarioTemplate, parseUserPrompt, hasApiKey } from './aiService';
import { UI_TEXT } from './translations';

function App() {
  // --- [CRITICAL FIX] Data Persistence Safety Layer ---
  // 사용자 데이터(에세이, 커스텀 템플릿)가 코드 업데이트로 인해 날아가지 않도록
  // LocalStorage 데이터를 최우선으로 하고, 기본값(DEFAULT_TEMPLATES)을 병합(Merge)합니다.
  
  const [db, setDb] = useState<ScenarioDB>(() => {
    try {
      const saved = localStorage.getItem('app_db');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // 데이터 병합: 기존 필드 유지 + 새 필드 추가
        // 중요: 사용자가 작성한 essays가 있다면 절대 덮어쓰지 않음
        const existingEssays = Array.isArray(parsed.essays) ? parsed.essays : [];
        const defaultEssays = Array.isArray(INITIAL_DB.essays) ? INITIAL_DB.essays : [];
        
        // 사용자가 작성한 데이터가 있으면 그것을 사용, 없으면 기본값 사용
        const mergedEssays = existingEssays.length > 0 ? existingEssays : defaultEssays;
        
        const existingSamples = Array.isArray(parsed.randomSamples) ? parsed.randomSamples : [];
        const defaultSamples = INITIAL_DB.randomSamples;
        const mergedSamples = existingSamples.length > 0 ? existingSamples : defaultSamples;

        return {
          ...INITIAL_DB, // 최신 코드의 구조(Schema)를 기반으로 함
          ...parsed,     // 로컬 저장소의 값을 덮어씀 (사용자 설정 우선)
          essays: mergedEssays, // 안전하게 병합된 에세이 리스트
          randomSamples: mergedSamples,
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
        if (Array.isArray(parsed)) {
            // [FIX] 저장된 데이터가 있더라도, 내용이 0개거나 기본 템플릿들이 없으면 복구(Merge)
            const merged = [...parsed];
            
            // 만약 아예 비어있으면 기본값으로 대체
            if (merged.length === 0) return DEFAULT_TEMPLATES;

            DEFAULT_TEMPLATES.forEach(def => {
                // ID가 같은게 없으면 추가 (기본 템플릿 복구)
                if (!merged.find(t => t.id === def.id)) {
                    merged.push(def);
                }
            });
            return merged;
        }
      }
    } catch (e) {
      console.error("Templates Load Error, resetting:", e);
    }
    // 저장된 게 없으면 기본 4개 템플릿 사용
    return DEFAULT_TEMPLATES;
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [language, setLanguage] = useState<Language>('ko');

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

  const t = UI_TEXT[language];

  useEffect(() => {
    if (window.location.hash === '#admin') setShowAdminLogin(true);
  }, []);

  // Persist DB and Templates to LocalStorage
  useEffect(() => {
    localStorage.setItem('app_db', JSON.stringify(db));
  }, [db]);
  
  useEffect(() => {
    // 템플릿이 비어있으면 저장하지 않고, 오히려 복구 시도 (Safety)
    if (templates.length > 0) {
        localStorage.setItem('app_templates', JSON.stringify(templates));
    }
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

    try {
        // 1. Prepare Variables
        const age = generationInput.age || '미지정';
        const job = generationInput.job || '미지정';
        const start = generationInput.start || '미지정';
        const goal = generationInput.goal || '미지정';
        const months = generationInput.months || 24;
        const countryKey = generationInput.country || detectCountry(goal);
        const config = GLOBAL_100[countryKey] || GLOBAL_100['default'];
        
        // Force AI usage if language is not Korean (Since default templates are mostly KR)
        const forceAI = generationInput.useAI || (language !== 'ko' && hasApiKey());
        const isDefaultScenario = countryKey === 'default' && !generationInput.forcedTemplateId && !forceAI;

        // 2. Select Template Logic
        let selectedTemplate: ScenarioTemplate | null = null;
        let usedAI = false;
        
        // CASE A: Explicit AI Generation Mode or Non-Korean Language (if API Key exists)
        if (forceAI && hasApiKey()) {
            setAiGenerating(true);
            try {
            const aiTemplate = await generateNewScenarioTemplate(generationInput, language);
            if (aiTemplate) {
                selectedTemplate = aiTemplate;
                // Only save to templates if it's in default language (KO), otherwise just use it once
                if (language === 'ko') {
                    setTemplates(prev => [aiTemplate, ...prev]);
                }
                setToastMessage("🤖 AI generated a new scenario.");
                usedAI = true;
            }
            } catch (e) {
            console.error("Forced AI Generation failed", e);
            setToastMessage("❌ AI Generation Failed. Using default template.");
            } finally {
                setAiGenerating(false);
            }
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
            if (!selectedTemplate && hasApiKey() && goal !== '미지정') {
                setAiGenerating(true);
                try {
                    const aiTemplate = await generateNewScenarioTemplate(generationInput, language);
                    if (aiTemplate) {
                        selectedTemplate = aiTemplate;
                        if (language === 'ko') {
                            setTemplates(prev => [aiTemplate, ...prev]);
                        }
                        setToastMessage("🤖 AI generated a new scenario.");
                        usedAI = true;
                    }
                } catch (e) { console.error(e); }
                finally { setAiGenerating(false); }
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
            .replace(/{family}/g, generationInput.family || 'Family')
            .replace(/{moveType}/g, generationInput.moveType || 'Move');
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
            { item: 'Cost of Living', before: `${config.currency} 4,500`, after: `${config.currency} 3,200`, diff: `-1,300` },
            { item: 'Assets', before: 'Low Liquidity', after: 'Gain', diff: `+${randInt(1, 15)}%` },
            { item: 'Health Cost', before: 'Insured', after: 'Private', diff: '+200%' },
            { item: 'Savings', before: '100', after: '350', diff: '+250' }
        ];
        }

        // 5. Generate Essay
        const defaultEssay: EssayData = {
        title: `${goal}: Reality Check`,
        intro: `Moving from ${start} to ${goal} is not just changing coordinates.`,
        body: "Problems often follow you. It's not just about the location."
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
                stages: selectedTemplate.story.stages.map(s => {
                    // [LEGACY SUPPORT] Handle cases where 'content' wrapper is missing (old data)
                    // The schema requires 'content', but old saved templates might put situation directly on 's'
                    const content = s.content || (s as any);
                    
                    return {
                        label: s.label,
                        title: inject(s.title),
                        situation: inject(content.situation || ''),
                        thought: inject(content.thought || ''),
                        action: inject(content.action || ''),
                        experiment: inject(content.experiment || ''),
                        failure: inject(content.failure || ''),
                        question: inject(content.question || ''),
                        solution: inject(content.solution || ''),
                        result: inject(content.result || ''),
                        reality: inject(content.reality || ''),
                    };
                }) as [any, any, any, any]
            },
            resultTable: resultTable,
            additionalInfo: {
                obstacles: ['Regulation', 'Exchange Rate', 'Language'],
                nextSteps: [
                    { label: 'Google', value: `${start} expat in ${goal} visa` },
                    { label: 'YouTube', value: `${goal} cost of living vlog` },
                    { label: 'Guide', value: `${goal} settlement guide PDF` }
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
        localStorage.setItem('lastStory', JSON.stringify({ input: newResult.userInput }));
        
        if (window.innerWidth < 1024) {
            setTimeout(() => {
            const resultEl = document.getElementById('result-anchor');
            if (resultEl) resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    } catch (error) {
        console.error("Critical Error in Scenario Generation:", error);
        setToastMessage("⚠️ Error generating scenario.");
    } finally {
        setLoading(false);
        setAiGenerating(false);
    }
  }, [templates, db, language]);

  const handleGenerateFromPrompt = async (parsedData: Partial<UserInput>, rawText?: string) => {
    let finalInput: UserInput = {
      age: '', job: '', start: '', goal: '', months: 24, country: '', forcedTemplateId: '', family: '', moveType: '', assets: '', useAI: false,
      ...parsedData
    };

    // [FIX] Use hasApiKey() check
    if (rawText && rawText.length > 2 && hasApiKey()) {
        setAiAnalyzing(true);
        try {
            const deepAnalysis = await parseUserPrompt(rawText);
            finalInput = { ...finalInput, ...deepAnalysis };
        } catch (e) {
            console.error("Deep analysis failed, using regex fallback");
        } finally {
            setAiAnalyzing(false);
        }
    }

    setInput(finalInput);
    generateStory(finalInput);
  };

  const handleRandom = () => {
    // Safety check: ensure randomSamples is array
    const samples = Array.isArray(db.randomSamples) ? db.randomSamples : [];
    if (samples.length === 0) {
      setToastMessage("🎲 No examples found. Resetting...");
      setDb(prev => ({...prev, randomSamples: INITIAL_DB.randomSamples}));
      setTimeout(() => handleRandom(), 100);
      return;
    }
    const random = samples[Math.floor(Math.random() * samples.length)];
    const baseInput: UserInput = {
      age: '', job: '', start: '', goal: '', months: 24, country: '', forcedTemplateId: '', family: '', moveType: '', assets: '', useAI: false
    };
    const finalInput = { ...baseInput, ...random };
    
    setInput(finalInput);
    setToastMessage(t.randomBtn);
    setTimeout(() => generateStory(finalInput), 500);
  };

  const handleDownload = () => {
    if (result) {
      downloadPDFElement('pdf-content', `HOPE_${result.userInput.goal}_${Date.now()}`);
      setToastMessage("📄 Saved PDF.");
    }
  };

  const handleSearch = (type: 'google' | 'youtube') => {
    const qGoal = input.goal || 'Immigration';
    const qJob = input.job || 'Job';
    const url = type === 'google' 
      ? `https://google.com/search?q=${input.age} ${qGoal} ${qJob} cost of living`
      : `https://youtube.com/results?search_query=${qGoal} ${qJob} vlog`;
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
             language={language}
             setLanguage={setLanguage}
           />
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8 z-30">
                <InputForm 
                  input={input}
                  onChange={handleInputChange}
                  onGenerate={handleGenerateFromPrompt}
                  onRandom={handleRandom}
                  onDownload={handleDownload}
                  canDownload={!!result}
                  isGenerating={loading || aiAnalyzing}
                  language={language}
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
                            <h3 className="text-xl font-bold mb-2">{t.simStart}</h3>
                            <p className="text-sm">{t.simDesc}</p>
                        </div>
                    </div>
                )}

                <ResultSection 
                    result={result} 
                    loading={loading} 
                    extraEssays={db.essays}
                    language={language}
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
                                     {t.analyzing}
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
                                     Generative AI is writing a story for '{input.goal}' in {language.toUpperCase()}...
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
