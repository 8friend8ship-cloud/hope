
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { UserInput, ScenarioTemplate, ScenarioDB } from "./types";
import { detectCountry, GLOBAL_100 } from "./constants";

// Helper to check if API Key exists (Env or LocalStorage)
export const hasApiKey = (): boolean => {
    // [Changed] Prioritize Environment Key for seamless development
    if (process.env.API_KEY) return true;
    
    const localKey = localStorage.getItem('user_gemini_key');
    return !!(localKey && localKey.trim().length > 0);
};

// Helper to get Client with dynamic key
const getGenAI = (): GoogleGenAI | null => {
  // [Changed] Use Process Env Key FIRST if available
  const apiKey = process.env.API_KEY || localStorage.getItem('user_gemini_key');

  if (!apiKey) {
    console.warn("No API Key found in LocalStorage or Env");
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

// --- TIMEOUT HELPER ---
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("AI Request Timed Out")), ms);
        promise
            .then(res => { clearTimeout(timer); resolve(res); })
            .catch(err => { clearTimeout(timer); reject(err); });
    });
};

export const saveApiKey = (key: string) => {
    localStorage.setItem('user_gemini_key', key.trim());
};

export const validateApiKey = async (key: string): Promise<boolean> => {
    try {
        const cleanKey = key.trim();
        if (!cleanKey) return false;

        const client = new GoogleGenAI({ apiKey: cleanKey });
        // Use gemini-3-flash-preview for validation as it is the standard for basic tasks
        await withTimeout<GenerateContentResponse>(client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: 'ping',
        }), 10000);
        return true;
    } catch (e) {
        console.error("API Key Validation Failed:", e);
        return false;
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

    const response = await withTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this user prompt for a life simulation: "${rawText}". Extract key details. Determine strictly if it is a domestic move or international move.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1, 
      }
    }), 10000);

    let text = response.text || "{}";
    // Clean markdown if present
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (e) {
    console.error("Input Parsing Failed", e);
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
        temperature: 0.8,
      }
    }), 15000);
    
    let text = response.text || "[]";
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Batch Sample Generation Failed", e);
    throw e; // Re-throw to handle in UI
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
        temperature: 0.7,
      }
    }), 15000);

    let text = response.text || "[]";
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Topic Suggestion Failed", e);
    throw e;
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
    }), 10000);
    
    let text = response.text || "[]";
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    return JSON.parse(text);
  } catch (e) {
    return ["⚠️ Validation process failed due to API error."];
  }
}

export const generateNewScenarioTemplate = async (input: UserInput): Promise<ScenarioTemplate | null> => {
  try {
    const ai = getGenAI();
    if (!ai) throw new Error("API Key Missing");

    const countryKey = input.country || detectCountry(input.goal);
    const config = GLOBAL_100[countryKey] || GLOBAL_100['default'];
    
    // Determine context nuances based on Domestic vs International
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

    // Define the schema for the AI response to strictly match ScenarioTemplate
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
              description: "EXACTLY 4 stages of the simulation (Day 1, Early Fail, Mid Crisis, Final Result)",
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
                    }
                  }
                }
              }
            }
          }
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
            }
          }
        },
        essay: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            intro: { type: Type.STRING },
            body: { type: Type.STRING }
          }
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
                }
            }
        }
      },
      required: ["id", "type", "tags", "story", "essay"]
    };

    const prompt = `
      Create a "Dry Author" style life simulation template.
      
      ${contextDescription}
      
      ${input.isDomestic ? domesticInstruction : internationalInstruction}

      CRITICAL INSTRUCTIONS:
      1. **Tone**: Cynical, Analytical, Hyper-Realistic. Highlight "Hidden Costs" (Mental & Financial).
      2. **Variables**: The output MUST be a generic template using placeholders: {age}, {job}, {start}, {goal}, {months}, {currency}, {family}.
         - Even if the user input specific values, replace them with placeholders in the template text where appropriate so it can be reused.
         - However, keep specific local facts hardcoded (e.g. "Gangnam traffic", "Jeju wind", "Vancouver rain").
      
      3. **Structure Requirement (EXACTLY 4 STAGES)**:
         - Stage 1 Label: "Day 1" (The Honeymoon/Investment)
         - Stage 2 Label: "Month 6" (The First Failure/Reality Check)
         - Stage 3 Label: "Month 12~18" (The Deep Crisis/Infrastructure Gap)
         - Stage 4 Label: "Month ${input.months}" (Final Result/Adaptation or Return)
         
      4. **Result Table**: 4 Key metrics comparing Start vs Goal (e.g., Cost of Living, Assets, Quality of Life).
      5. **Essay**: A sharp, 3-paragraph critique of the user's desire to move to ${input.goal}.
      6. **Downloads**: 2 specific tools (PDF/Excel) relevant to the move type.
      
      RETURN PURE JSON ONLY. NO MARKDOWN.
    `;

    const response = await withTimeout<GenerateContentResponse>(ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7, 
      }
    }), 25000); // 25s timeout for full generation

    let jsonText = response.text || "";
    // FORCE CLEAN MARKDOWN (Fixes "not writing" issue)
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    
    if (!jsonText) return null;
    
    const generatedTemplate = JSON.parse(jsonText) as ScenarioTemplate;
    
    // Post-processing: Ensure tags and ID are robust
    const additionalTags = [
        input.goal.toLowerCase(), 
        input.moveType?.toLowerCase() || 'general', 
        input.isDomestic ? 'domestic' : 'international',
        input.family?.includes('kid') || input.family?.includes('child') ? 'family' : 'single'
    ];
    
    generatedTemplate.tags = [...new Set([...generatedTemplate.tags, ...additionalTags])];
    
    // Ensure unique ID for persistence
    const typePrefix = input.isDomestic ? 'domestic' : 'global';
    generatedTemplate.id = `ai_${typePrefix}_${Date.now()}_${input.goal.replace(/\s/g, '').toLowerCase()}`;

    return generatedTemplate;

  } catch (error) {
    console.error("Gemini AI Generation Failed:", error);
    throw error;
  }
};
