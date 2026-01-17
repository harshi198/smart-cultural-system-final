
export enum Region {
  Tamil = 'Tamil',
  Punjabi = 'Punjabi',
  Kerala = 'Kerala',
  Gujarati = 'Gujarati',
  Bengali = 'Bengali'
}

export enum Language {
  English = 'English',
  Tamil = 'Tamil',
  Telugu = 'Telugu',
  Malayalam = 'Malayalam',
  Kannada = 'Kannada',
  Punjabi = 'Punjabi',
  Hindi = 'Hindi',
  Gujarati = 'Gujarati',
  Bengali = 'Bengali'
}

export interface FolkStory {
  id: number | string;
  title: string;
  region: Region;
  type: string;
  era: string;
  theme: string[];
  summary: string;
}

export interface StoryAnalysis {
  fullNarration: string;
  emotion: string;
  intensity: number;
  culturalNuances: string[];
  historicalContext: string;
  significance: string;
  audioUri?: string;
}

export interface GenerationState {
  isAnalyzing: boolean;
  isGeneratingAudio: boolean;
  error?: string;
}

export type AppStep = 
  | 'welcome' 
  | 'region-select' 
  | 'theme-select' 
  | 'story-browse' 
  | 'processing' 
  | 'experience' 
  | 'insight';
