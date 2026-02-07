
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { ResultSection, downloadPDFElement } from './components/ResultSection';
import { AdBanner } from './components/AdBanner';
import { ActionButtons } from './components/ActionButtons';
import { Toast } from './components/Toast';
import { AdminDashboard } from './components/AdminDashboard';
import { INITIAL_DB, RANDOM_SCENARIOS, GLOBAL_100, detectCountry, DEFAULT_TEMPLATES } from './constants';
import { UserInput, StoryResult, ScenarioDB, ScenarioData, ScenarioTemplate, ComparisonRow, EssayData, DownloadableResource } from './types';
import { GlassCard } from './components/GlassCard';

function App() {
  const [db, setDb] = useState<ScenarioDB>(INITIAL_DB);
  // Persistent Templates State
  const [templates, setTemplates] = useState<ScenarioTemplate[]>(() => {
    const saved = localStorage.getItem('app_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
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
    country: ''
  });
  const [result, setResult] = useState<StoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash === '#admin') setShowAdminLogin(true);
  }, []);

  // Save templates to LocalStorage whenever they change
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

  const generateStory = useCallback(() => {
    setLoading(true);
    setResult(null); 
    
    setTimeout(() => {
      // 1. Prepare Variables
      const age = input.age || '35';
      const job = input.job || '자영업';
      const start = input.start || '서울';
      const goal = input.goal || '해외';
      const months = input.months || 24;
      const countryKey = input.country || detectCountry(goal);
      const config = GLOBAL_100[countryKey] || GLOBAL_100['default'];

      // 2. Select Template Logic (Exact Matching Priority)
      let selectedTemplate = templates[0]; // Default fallback
      
      const jobLower = job.toLowerCase();
      const goalLower = goal.toLowerCase();
      const startLower = start.toLowerCase();

      // Priority 1: Singapore -> Portugal (Specific)
      if ((startLower.includes('싱가포르') || startLower.includes('싱가폴')) && (goalLower.includes('포르투갈') || goalLower.includes('리스본'))) {
         const match = templates.find(t => t.id === 'template_sg_pt' || t.tags.includes('portugal'));
         if (match) selectedTemplate = match;
      }
      // Priority 2: Bali (Specific)
      else if (goalLower.includes('발리') || goalLower.includes('인도네시아')) {
         const match = templates.find(t => t.id === 'template_bali_report' || t.tags.includes('bali'));
         if (match) selectedTemplate = match;
      }
      // Priority 3: Gangnam/Seoul (Specific)
      else if (goalLower.includes('강남') || goalLower.includes('서울') || startLower.includes('의정부') || goalLower.includes('아파트')) {
         const match = templates.find(t => t.id === 'template_gangnam_report' || t.tags.includes('gangnam'));
         if (match) selectedTemplate = match;
      }

      // Fallback: Try to find a generic matching tag
      if (!selectedTemplate) {
          const genericMatch = templates.find(t => 
             t.tags.some(tag => goalLower.includes(tag) || jobLower.includes(tag) || startLower.includes(tag))
          );
          if (genericMatch) selectedTemplate = genericMatch;
      }

      // 3. Inject Variables into Template
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
          .replace(/{visa}/g, config.visaName);
      };

      const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
      
      // 4. Generate Result Table (Dynamic or from Template)
      let resultTable: ComparisonRow[] = [];
      
      if (selectedTemplate.resultTable) {
        // Use template-specific table if available
        resultTable = selectedTemplate.resultTable.map(row => ({
          item: inject(row.item),
          before: inject(row.before),
          after: inject(row.after),
          diff: inject(row.diff)
        }));
      } else {
        // Fallback Default Logic
        resultTable = [
            { item: '월 생활비', before: `${config.currency} 4,500`, after: `${config.currency} 3,200`, diff: `-1,300` },
            { item: '자산', before: '유동성 부족', after: '환차익 발생', diff: `+${randInt(1, 15)}%` },
            { item: '의료비', before: '보험 적용', after: '사립 병원', diff: '+200%' },
            { item: '순 저축', before: '100', after: '350', diff: '+250' }
        ];
      }

      // 5. Generate Essay (Dynamic)
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

      // 6. Generate Downloads (Dynamic)
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
              obstacles: ['EU 규제 강화', '환율 변동', '언어 장벽'],
              nextSteps: [
                  { label: '구글 검색', value: `${start} 은퇴자 ${goal} 비자 후기` },
                  { label: '유튜브', value: `${goal} 골든비자 폐지 후 대안` },
                  { label: 'PDF 다운로드', value: `${goal} NIF + 부동산세 가이드` }
              ]
          },
          essay: essayData,
          downloads: downloads
      };

      // Set Title dynamically
      const title = scenarioData.story.header;
      const progress = randInt(50, 92);

      const newResult: StoryResult = {
        title,
        scenarioData,
        progress,
        userInput: { ...input, age, job, start, goal, months },
        timestamp: new Date().toLocaleTimeString()
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

    }, 1500); 
  }, [input, templates]);

  const handleRandom = () => {
    const random = RANDOM_SCENARIOS[Math.floor(Math.random() * RANDOM_SCENARIOS.length)];
    if (random) {
        setInput(prev => ({ ...prev, ...random, country: '' }));
        setToastMessage("🎲 랜덤 시나리오를 구성했습니다.");
        setTimeout(generateStory, 500);
    }
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
                  onGenerate={generateStory}
                  onRandom={handleRandom}
                  onDownload={handleDownload}
                  canDownload={!!result}
                  isGenerating={loading}
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
                
                {!result && !loading && (
                    <div className="hidden lg:flex h-full min-h-[400px] items-center justify-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5 text-gray-400">
                        <div className="text-center p-8">
                            <div className="text-4xl mb-4">👈</div>
                            <h3 className="text-xl font-bold mb-2">시뮬레이션을 시작하세요</h3>
                            <p className="text-sm">왼쪽 패널에 정보를 입력하고<br/>미래를 확인해보세요.</p>
                        </div>
                    </div>
                )}

                <ResultSection result={result} loading={loading} />

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
