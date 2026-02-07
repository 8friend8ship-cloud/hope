
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
}

export interface ScenarioTemplate {
  id: string;
  type: 'report' | 'essay'; // Distinguished styles
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
}

export interface UserInput {
  age: string;
  job: string;
  start: string;
  goal: string;
  months: number;
  country?: string;
}

export interface StoryResult {
  title: string;
  scenarioData: ScenarioData;
  progress: number;
  userInput: UserInput;
  timestamp: string;
}

export interface CountryConfig {
  code: string;
  currency: string;
  bank: string;
  prop: string;
  cities: string[];
  visaName: string;
  avgSalary: string;
}
