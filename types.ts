
export interface ComparisonRow {
  item: string;
  before: string;
  after: string;
  diff: string;
}

export interface SimulationStage {
  label: string;
  title: string;
  situation?: string;
  thought?: string;
  action?: string;
  experiment?: string;
  failure?: string;
  question?: string;
  solution?: string;
  result?: string;
  reality?: string;
}

export interface EssayData {
  title: string;
  intro: string;
  body: string;
}

export interface DownloadableResource {
  title: string;
  description: string;
  type: 'pdf' | 'excel' | 'doc';
  triggerType: 'ad' | 'link'; // 'ad': Watch Video, 'link': Coupang/Affiliate
  triggerUrl?: string; // Required if triggerType is 'link'
  fileUrl?: string; // The actual file link (can be dummy for now)
}

export interface ScenarioData {
  success: number;
  salary: string;
  visa: string;
  living: number;
  story: {
    header: string;
    subHeader: string;
    stages: [SimulationStage, SimulationStage, SimulationStage, SimulationStage];
  };
  resultTable: ComparisonRow[];
  additionalInfo: {
    obstacles: string[];
    nextSteps: {
      label: string;
      value: string;
    }[];
  };
  essay: EssayData;
  downloads: DownloadableResource[];
  visaInfoUrl: string; // New field for official visa link
}

export interface ScenarioTemplate {
  id: string;
  type: 'report' | 'essay'; 
  tags: string[]; 
  story: {
    titleTemplate: string;
    subTemplate: string;
    stages: [
      { label: string; title: string; content: Partial<SimulationStage> },
      { label: string; title: string; content: Partial<SimulationStage> },
      { label: string; title: string; content: Partial<SimulationStage> },
      { label: string; title: string; content: Partial<SimulationStage> }
    ];
  };
  resultTable?: {
    item: string;
    before: string; 
    after: string;  
    diff: string;   
  }[];
  essay?: {
    title: string;
    intro: string;
    body: string;
  };
  downloads?: { // Template for downloads
    title: string;
    description: string;
    type: 'pdf' | 'excel' | 'doc';
    triggerType: 'ad' | 'link';
    triggerUrl?: string;
  }[];
}

export interface StandaloneEssay {
  id: string;
  title: string;
  content: string;
  tags: string[];
  date: string;
}

export interface ScenarioDB {
  rates: { [key: string]: number };
  scenarios: { [key: string]: ScenarioData };
  lastVerified: string;
  changes: Array<{
    type: string;
    details: string;
    timestamp: string;
  }>;
  randomSamples: Partial<UserInput>[];
  essays: StandaloneEssay[]; // New field for managing independent columns
}

export interface UserInput {
  age: string;
  job: string;
  start: string;
  goal: string;
  months: number;
  country?: string;
  forcedTemplateId?: string; // 특정 템플릿 강제 지정
  // AI Deep Analysis Fields
  family?: string; // e.g., "Single", "Married with 2 kids"
  moveType?: string; // e.g., "Immigration", "Study", "1 Month Stay", "Work"
  assets?: string; // e.g., "1억", "Low budget"
  isDomestic?: boolean; // True if start and goal are in the same country
  useAI?: boolean; // Explicit flag: If true, ignore templates and generate new one
}

export interface StoryResult {
  title: string;
  scenarioData: ScenarioData;
  progress: number;
  userInput: UserInput;
  timestamp: string;
  isDefault?: boolean;
}

export interface CountryConfig {
  code: string;
  currency: string;
  bank: string;
  prop: string;
  cities: string[];
  visaName: string;
  avgSalary: string;
  visaInfoUrl: string; // New field for official visa link
}
