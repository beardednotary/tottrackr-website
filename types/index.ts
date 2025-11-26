export type FeedingType = 'breast' | 'formula' | 'pumped';
export type DiaperType = 'wet' | 'dirty' | 'both';
export type HandPreference = 'left' | 'right';

export interface Entry {
  id: string;
  type: 'feeding' | 'diaper' | 'sleep';
  timestamp: number;
  feedingType?: FeedingType;
  amount?: number;
  diaperType?: DiaperType;
  endTime?: number;
  duration?: number;
  isActive: boolean;
  notes?: string;
  breastSide?: 'left' | 'right'; 
  babyId?: string;  
}

export interface SleepEntry extends Entry {
  type: 'sleep';
  startTime: number;
  endTime?: number;
  duration: number;
  babyId?: string;
  isActive: boolean;
}

export interface DailySummary {
  date: string;
  totalSleep: number;
  totalFeedings: number;
  totalDiapers: number;
  lastFeeding?: number;
  lastDiaper?: number;
  activeSleep?: SleepEntry;
}

export interface UserPreferences {
  handPreference: HandPreference;
  units: 'imperial' | 'metric';
  darkMode: boolean;
  hapticFeedback: boolean;
}

export interface BabyProfile {
  id: string;
  name: string;
  dateOfBirth: number; // timestamp
  birthWeight?: number; // in lbs or kg based on preferences
  currentWeight?: number;
  photoUri?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WeightEntry {
  id: string;
  babyId: string;
  weight: number;
  timestamp: number;    
  date: number;  
  notes?: string;
}

export interface ExportData {
  baby: BabyProfile;
  entries: Entry[];
  weights: WeightEntry[];
  startDate: string;
  endDate: string;
  generatedAt: number;
  version: string;
}

// Reference data for feeding guidelines
export interface FeedingGuideline {
  ageInDays: number;
  feedingsPerDay: string;
  amountPerFeeding: string;
  totalPerDay: string;
}

export interface ActiveBreastSession {
  id: string;
  startTime: number;
  side: 'left' | 'right';
  isActive: boolean;
  babyId?: string;
}

