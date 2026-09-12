export type AppMode = 'timer' | 'alarm' | 'stopwatch' | 'workout' | 'ai' | 'settings';

export type ThemeId = 'dark-neon' | 'cyberpunk' | 'amoled' | 'nordic' | 'sunset';
export type ThemeKey = ThemeId;

export interface ThemeColors {
  id: ThemeId;
  name: string;
  bg: string;
  surface: string;
  cardBg: string;
  border: string;
  text: string;
  subtext: string;
  accent: string;
  accentGlow: string;
  ringTrack: string;
  ringProgress: string;
  ticks: string;
}

export interface WorkoutStep {
  id: string;
  name: string;
  durationSec: number; // in seconds
  type: 'work' | 'rest' | 'prepare' | 'cooldown';
  voicePrompt?: string; // What TTS should speak when starting
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  description?: string;
  steps: WorkoutStep[];
  repeatCount: number;
}

export interface AlarmItem {
  id: string;
  title: string;
  label?: string;
  time: string; // "HH:MM" 24h
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat (empty means once)
  enabled: boolean;
  sound: string;
  voicePrompt?: string;
  voiceAnnouncement?: string;
}

export interface AISettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt?: string;
  enabled?: boolean;
  autoAdjustIntervals?: boolean;
}

export interface AppSettings {
  theme: ThemeId;
  ai: AISettings;
  soundEnabled: boolean;
  ttsEnabled: boolean;
  volume: number; // 0..1
  keepOnTop: boolean;
  compactMode: boolean;
}
