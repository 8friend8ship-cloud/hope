import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { UserInput, ScenarioTemplate, ScenarioDB, Language, StandaloneEssay } from "./types";
import { detectCountry, GLOBAL_100 } from "./constants";

// --- ERROR HANDLING HELPER ---
const getFriendlyErrorMessage = (error: any): string => {
    const msg = error?.message || String(error);
    
    if (msg.includes("429") || msg.includes("Resource has been exhausted")) {
        return "⚠️ [429 Quota Exceeded] 하루 무료 할당량을 모두 사용했습니다. 내일 다시 시도하거나 다른 API 키를 사용하세요.";
    }
    if (msg.includes("401") || msg.includes("API key not valid")) {
        return "❌ [401 Invalid Key] API 키가 올바르지 않습니다. 키를 잘못 복사했거나 삭제된 키입니다.";
    }
    if (msg.includes("403")) {
        return "🚫 [403 Forbidden] 권한이 없습니다. (해당 API 키로 gemini-3-flash 모델 접근 불가 또는 지역 제한)";
    }
    if (msg.includes("404")) {
        return "❓ [404 Not Found] 모델을 찾을 수 없습니다. (모델명 오류 또는 지원 종료)";
    }
    if (msg.includes("503") || msg.includes("Overloaded")) {
        return "🐢 [503 Overloaded] Google 서버 과부하 상태입니다. 잠시 후 다시 시도해주세요.";
    }
    if (msg.includes("Timed Out") || msg.includes("Timeout")) {
        return "⏱️ [Timeout] 요청 시간이 초과되었습니다. 네트워크 상태를 확인하세요. (분석 시간이 길어지고 있습니다)";
    }
    if (msg.includes("fetch failed") || msg.includes("NetworkError")) {
        return "🌐 네트워크 오류: 인터넷 연결을 확인해주세요.";
    }
    
    return `⚠️ 시스템 오류: ${msg.substring(0, 100)}...`;
};

// Helper to safely get Env Key without crashing in browser
const getEnvApiKey = (): string | null => {
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            // @ts-ignore
            return process.env.API_KEY;
        }
    } catch (e) {
        return null;
    }
    return null;
};

// Helper to check if API Key exists (Env or LocalStorage)
export const hasApiKey = (): boolean => {
    const envKey = getEnvApiKey();
    if (envKey) return true;
    
    const localKey = localStorage.getItem('user_gemini_key');
    return !!(localKey && localKey.trim().length > 0);
};

// Helper to get Client with dynamic key
const getGenAI = (): GoogleGenAI | null => {
  const apiKey = getEnvApiKey() || localStorage.getItem('user_gemini_key');

  if (!apiKey) {
    console.warn("No API Key found in LocalStorage or Env");
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

// --- TIMEOUT HELPER ---
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Request Timed Out after ${ms}ms`)), ms);
        promise
            .then(res => { clearTimeout(timer); resolve(res); })
            .catch(err => { clearTimeout(timer); reject(err); });
    });
};

export const saveApiKey = (key: string) => {
    localStorage.setItem('user_gemini_key', key.trim());
};

export const validateApiKey = async (key: string): Promise<{ isValid: boolean; error?: string }> => {
    try {
        const cleanKey = key.trim();
        if (!cleanKey) return { isValid: false, error: "키가 입력되지 않았습니다." };

        const client = new GoogleGenAI({ apiKey: cleanKey });
        // Increase timeout to 30s for validation to be safe
        await withTimeout<GenerateContentResponse>(client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: 'ping',
        }), 30000);
        return { isValid: true };
    } catch (e) {
        console.error("API Key Validation Failed:", e);
        return { isValid: false, error: getFriendlyErrorMessage(e) };
    }
};

/**
 * AI Input Parser: Analyzes raw natural language to extract structured data
 */
export const parseUserPrompt = async (rawText: string): Promise<Partial<UserInput>> => {
  try {
    const ai = getGenAI();
    if (!ai) return {};

    const schema = {
      type: Type.OBJECT,
      properties: {
        age: { type: Type.STRING, description: "Numeric age string, default '30'" },
        job: { type: Type.STRING, description: "Current job or 'Unemployed'" },
        start: { type: Type.STRING, description: "Starting location (City/Country), default 'Korea'" },
        goal: { type: Type.STRING, description: "Target location (City/Country)" },
        months: { type: Type.INTEGER, description: "Duration in months. If permanent/immigration, use 36." },
        family: { type: Type.STRING, description: "Family status (e.g., 'Single', 'Couple', 'Family of 4', 'With pet')" },
        moveType: { type: Type.STRING, description: "Type of move (e.g., 'Immigration', 'Work', 'Study', 'Month-long Stay', 'Retirement')" },
        assets: { type: Type.STRING, description: "Mentioned assets or budget (e.g., '1억', 'Tight budget')" },
        isDomestic: { type: Type.BOOLEAN, description: "True if the move is within the same country (e.g. Seoul to Jeju, Busan to Seoul). False if crossing borders." }
      },
      required: ["age", "start", "goal", "moveType", "isDomestic"]
    };

    // Increase timeout to 60s (1 minute) for deep analysis
    const response = await withTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this user prompt for a life simulation: "${rawText}". Extract key details. Determine strictly if it is a domestic move or international move. Translate start/goal to English for consistency if needed, but keep original if it helps.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1, 
      }
    }), 60000);

    let text = response.text || "{}";
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (e) {
    console.warn("Input Parsing Failed (Soft Fail):", getFriendlyErrorMessage(e));
    return {};
  }
};

/**
 * AI Data Generator: Creates diverse random user samples based on trends
 */
export const generateBatchRandomSamples = async (count: number): Promise<Partial<UserInput>[]> => {
  try {
    const ai = getGenAI();
    if (!ai) throw new Error("API Key Missing");

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          age: { type: Type.STRING },
          job: { type: Type.STRING },
          start: { type: Type.STRING },
          goal: { type: Type.STRING },
          months: { type: Type.INTEGER },
          isDomestic: { type: Type.BOOLEAN },
          useAI: { type: Type.BOOLEAN, description: "MUST be strictly set to true" }
        },
        required: ["age", "job", "start", "goal", "months", "isDomestic", "useAI"]
      }
    };

    // Increase timeout to 90s
    const response = await withTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate exactly ${count} diverse and realistic user personas for a migration simulation app.
      CRITICAL: Return a JSON Array with ${count} items.
      Include a mix of:
      1. Young professionals seeking jobs abroad.
      2. Retirees looking for cheaper countries.
      3. Families moving for education.
      4. Domestic moves for lifestyle.
      5. Digital nomads.
      Set 'useAI' to true for all.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.6, // Lowered for stability
      }
    }), 90000);
    
    let text = response.text || "[]";
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    throw new Error(getFriendlyErrorMessage(e));
  }
};

/**
 * AI Topic Suggester: Suggests new scenario topics that are missing from current templates
 */
export const suggestNewScenarioTopics = async (existingTags: string[], count: number): Promise<UserInput[]> => {
  try {
    const ai = getGenAI();
    if (!ai) throw new Error("API Key Missing");

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          age: { type: Type.STRING },
          job: { type: Type.STRING },
          start: { type: Type.STRING },
          goal: { type: Type.STRING },
          months: { type: Type.INTEGER },
          family: { type: Type.STRING },
          moveType: { type: Type.STRING },
          isDomestic: { type: Type.BOOLEAN },
          useAI: { type: Type.BOOLEAN }
        },
        required: ["goal", "moveType"]
      }
    };

    // Increase timeout to 90s
    const response = await withTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Current scenario tags in DB: [${existingTags.join(', ')}].
      Identify exactly ${count} trending or missing migration/lifestyle scenarios that are NOT in the list.
      (e.g., "Early retirement (FIRE)", "Working Holiday in Australia", "Rural farming in Korea", "Education migration to Malaysia").
      Return them as UserInput objects so I can generate templates for them.
      CRITICAL: Return a JSON Array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.5, // Lowered for stability
      }
    }), 90000);

    let text = response.text || "[]";
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    throw new Error(getFriendlyErrorMessage(e));
  }
};

/**
 * AI Essay Suggester: Suggests new column topics
 */
export const suggestNewEssayTopics = async (existingTitles: string[], count: number): Promise<{ topic: string, context: string }[]> => {
  try {
    const ai = getGenAI();
    if (!ai) throw new Error("API Key Missing");

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING, description: "Catchy, cynical title" },
          context: { type: Type.STRING, description: "Brief description of what the essay is about" }
        },
        required: ["topic", "context"]
      }
    };

    const response = await withTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `We have a blog about the "Harsh Reality of Immigration/Life Changes".
      Existing titles: [${existingTitles.join(', ')}].
      
      Suggest exactly ${count} NEW, provocative, and cynical essay topics that cover different aspects (e.g., relationships, mental health, reverse culture shock, career suicide).
      The tone should be "Dry, Realist, Anti-Fantasy".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      }
    }), 60000);

    let text = response.text || "[]";
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    throw new Error(getFriendlyErrorMessage(e));
  }
};

/**
 * AI Essay Generator: Writes the full essay content
 */
export const generateNewEssay = async (topic: string, context: string, language: Language = 'ko'): Promise<Partial<StandaloneEssay>> => {
  try {
    const ai = getGenAI();
    if (!ai) throw new Error("API Key Missing");

    const langName = { 
        ko: 'Korean', en: 'English', jp: 'Japanese', cn: 'Chinese (Simplified)',
        es: 'Spanish', fr: 'French', de: 'German', ru: 'Russian', 
        vn: 'Vietnamese', th: 'Thai', id: 'Indonesian'
    }[language] || 'Korean';

    const prompt = `
      Write a short, powerful column (essay) for a platform called "Hope Purchase".
      Topic: "${topic}"
      Context: ${context}
      
      Persona: A cynical, data-driven, "Dry Author" who hates blind optimism.
      Structure:
      - Title: Provocative.
      - Tags: 3-4 keywords.
      - Content: 3 paragraphs. 
        1. Shatter the illusion.
        2. Present the uncomfortable reality (financial/mental).
        3. A cold conclusion.
      
      Language: **${langName}** (${language})
      **CRITICAL**: Output MUST be in ${langName} ONLY.
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        content: { type: Type.STRING }
      },
      required: ["title", "tags", "content"]
    };

    const response = await withTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.6, // Lowered
      }
    }), 90000); // 90s timeout for creative writing

    let text = response.text || "{}";
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    throw new Error(getFriendlyErrorMessage(e));
  }
};

/**
 * AI Validator: Checks database integrity
 */
export const validateSystemData = async (db: ScenarioDB, templates: ScenarioTemplate[]): Promise<string[]> => {
  try {
    const ai = getGenAI();
    if (!ai) return ["⚠️ API Key is missing. Validation skipped."];

    const dataSummary = {
      sampleCount: db.randomSamples.length,
      samples: db.randomSamples.slice(0, 5), // Only check a few
      templateCount: templates.length,
      templateIds: templates.map(t => t.id),
      sampleTemplateTags: templates[0]?.tags
    };

    // Increase timeout to 90s
    const response = await withTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a Database Administrator AI. Audit this JSON summary of a simulation app:
      ${JSON.stringify(dataSummary)}
      
      Check for:
      1. Logical inconsistencies in samples (e.g. Age 10 retiring).
      2. Missing critical tags in templates.
      3. Data format issues.
      
      Return a list of short string logs/warnings. If all good, return ["✅ Data Integrity Verified", "No critical logical errors found"].`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    }), 90000);
    
    let text = response.text || "[]";
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    return JSON.parse(text);
  } catch (e) {
    return [`❌ 검증 실패: ${getFriendlyErrorMessage(e)}`];
  }
}

// ... existing imports ...

/**
 * AI Translator: Translates key context words (Start, Goal, Job) to target language
 */
export const translateKeywords = async (keywords: { start: string, goal: string, job: string }, targetLang: Language): Promise<{ start: string, goal: string, job: string }> => {
    try {
        const ai = getGenAI();
        if (!ai) return keywords; // Return original if no key

        const langName = { 
            ko: 'Korean', en: 'English', jp: 'Japanese', cn: 'Chinese (Simplified)',
            es: 'Spanish', fr: 'French', de: 'German', ru: 'Russian', 
            vn: 'Vietnamese', th: 'Thai', id: 'Indonesian'
        }[targetLang] || 'English';

        const prompt = `
          Translate the following 3 terms into ${langName}.
          1. "${keywords.start}" (Location)
          2. "${keywords.goal}" (Location)
          3. "${keywords.job}" (Job Title)
          
          Return JSON: { "start": "...", "goal": "...", "job": "..." }
          Only return the translated terms.
        `;

        const response = await withTimeout<GenerateContentResponse>(ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        start: { type: Type.STRING },
                        goal: { type: Type.STRING },
                        job: { type: Type.STRING }
                    }
                }
            }
        }), 10000); // Fast timeout

        let text = response.text || "{}";
        text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(text);
        
        return {
            start: result.start || keywords.start,
            goal: result.goal || keywords.goal,
            job: result.job || keywords.job
        };
    } catch (e) {
        console.warn("Translation failed, using original:", e);
        return keywords;
    }
};

export const generateNewScenarioTemplate = async (input: UserInput, language: Language = 'ko'): Promise<ScenarioTemplate | null> => {
// ... existing code ...
  try {
    const ai = getGenAI();
    if (!ai) throw new Error("API Key Missing");

    const countryKey = input.country || detectCountry(input.goal);
    const config = GLOBAL_100[countryKey] || GLOBAL_100['default'];
    
    const domesticInstruction = `
      This is a **DOMESTIC MOVE** (Within the same country).
      - **DO NOT** mention Visas, Immigration checkpoints, or Currency Exchange.
      - **FOCUS ON**: Real estate prices (Jeonse/Monthly), School districts (8-hakgun), Regional prejudice, Commuting hell, City vs Countryside lifestyle gaps.
      - Comparison Table: Compare Rent vs Rent, Commute Time vs Commute Time, Private Academy Costs.
    `;

    const internationalInstruction = `
      This is an **INTERNATIONAL MOVE** (Crossing borders).
      - **FOCUS ON**: Visas (${config.visaName}), Language barriers, Cultural racism, Tax residency, Healthcare access (Insurance vs Private).
      - Comparison Table: Cost of Living, Tax Rates, Safety, Medical Costs.
    `;

    const contextDescription = `
      User Profile:
      - Age: ${input.age}
      - Job: ${input.job}
      - From: ${input.start} -> To: ${input.goal}
      - Family: ${input.family || 'Single'}
      - Move Type: ${input.moveType || 'General Move'}
      - Assets: ${input.assets || 'Unknown'}
      - **Is Domestic Move?**: ${input.isDomestic ? 'YES (Domestic)' : 'NO (International)'}
    `;

    const langName = { 
        ko: 'Korean', en: 'English', jp: 'Japanese', cn: 'Chinese (Simplified)',
        es: 'Spanish', fr: 'French', de: 'German', ru: 'Russian', 
        vn: 'Vietnamese', th: 'Thai', id: 'Indonesian'
    }[language] || 'Korean';

    const prompt = `
      Create a "Dry Author" style life simulation template.
      
      ${contextDescription}
      
      ${input.isDomestic ? domesticInstruction : internationalInstruction}

      CRITICAL INSTRUCTIONS:
      1. **Tone**: Cynical, Analytical, Hyper-Realistic. Highlight "Hidden Costs" (Mental & Financial).
      2. **Variables**: The output MUST be a generic template using placeholders: {age}, {job}, {start}, {goal}, {months}, {currency}, {family}.
         - Use placeholders naturally in the text.
         - Do NOT use specific numbers (like $4000) unless it's a fixed fact about the city. Use generic terms or placeholders.
      
      3. **Structure Requirement (EXACTLY 4 STAGES)**:
         - Stage 1 Label: "Day 1" (The Honeymoon/Investment)
         - Stage 2 Label: "Month 6" (The First Failure/Reality Check)
         - Stage 3 Label: "Month 12~18" (The Deep Crisis/Infrastructure Gap)
         - Stage 4 Label: "Month ${input.months}" (Final Result/Adaptation or Return)
      
      4. **Content Rules**:
         - **NO REPETITION**: Do not repeat the same phrase over and over.
         - **CONCISE**: Each situation/thought/action must be under 3 sentences.
         - **REALISM**: No happy endings. Focus on the trade-offs.
         
      5. **Result Table**: 4 Key metrics comparing Start vs Goal.
      6. **Essay**: A sharp, 3-paragraph critique.
      7. **Downloads**: 2 specific tools (PDF/Excel).
      
      8. **LANGUAGE**: GENERATE ALL CONTENT IN **${langName}** (${language}).
         - Title, Stages, Essay, Table MUST BE in ${langName}.

      RETURN PURE JSON ONLY. NO MARKDOWN.
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Unique ID like 'template_seoul_jeju_domestic' or 'template_korea_canada_immig'" },
        type: { type: Type.STRING, enum: ["report", "essay"] },
        tags: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Keywords including location, job, move type, family status, domestic/international" 
        },
        story: {
          type: Type.OBJECT,
          properties: {
            titleTemplate: { type: Type.STRING, description: "Title with placeholders (e.g., '{age}세 {job}의 {goal} 리얼 생존기')" },
            subTemplate: { type: Type.STRING, description: "Subtitle (e.g., '{family}의 {months}개월 정착 시뮬레이션')" },
            stages: {
              type: Type.ARRAY,
              description: "EXACTLY 4 stages. Each stage MUST have content.",
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  title: { type: Type.STRING },
                  content: {
                    type: Type.OBJECT,
                    properties: {
                      situation: { type: Type.STRING, nullable: true },
                      thought: { type: Type.STRING, nullable: true },
                      action: { type: Type.STRING, nullable: true },
                      experiment: { type: Type.STRING, nullable: true },
                      failure: { type: Type.STRING, nullable: true },
                      question: { type: Type.STRING, nullable: true },
                      solution: { type: Type.STRING, nullable: true },
                      result: { type: Type.STRING, nullable: true },
                      reality: { type: Type.STRING, nullable: true },
                    },
                    required: [] // Allow flexible content but urge strict schema adherence
                  }
                },
                required: ["label", "title", "content"]
              }
            }
          },
          required: ["titleTemplate", "subTemplate", "stages"]
        },
        resultTable: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              item: { type: Type.STRING },
              before: { type: Type.STRING },
              after: { type: Type.STRING },
              diff: { type: Type.STRING }
            },
            required: ["item", "before", "after", "diff"]
          }
        },
        essay: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            intro: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ["title", "intro", "body"]
        },
        downloads: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["pdf", "excel", "doc"] },
                    triggerType: { type: Type.STRING, enum: ["ad", "link"] },
                    triggerUrl: { type: Type.STRING, nullable: true }
                },
                required: ["title", "description", "type", "triggerType"]
            }
        }
      },
      required: ["id", "type", "tags", "story", "essay"]
    };

    // Increase timeout to 120s (2 minutes) for full template generation
    const response = await withTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3, // DRASTICALLY LOWERED for stability (prevent loops)
      }
    }), 120000);

    let jsonText = response.text || "";
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    
    if (!jsonText) return null;
    
    const generatedTemplate = JSON.parse(jsonText) as ScenarioTemplate;
    
    const additionalTags = [
        input.goal.toLowerCase(), 
        input.moveType?.toLowerCase() || 'general', 
        input.isDomestic ? 'domestic' : 'international',
        input.family?.includes('kid') || input.family?.includes('child') ? 'family' : 'single'
    ];
    
    generatedTemplate.tags = [...new Set([...generatedTemplate.tags, ...additionalTags])];
    
    const typePrefix = input.isDomestic ? 'domestic' : 'global';
    generatedTemplate.id = `ai_${typePrefix}_${Date.now()}_${input.goal.replace(/\s/g, '').toLowerCase()}`;

    return generatedTemplate;

  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};