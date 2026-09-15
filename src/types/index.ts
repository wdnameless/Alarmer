export type AppMode = 'dashboard' | 'ai' | 'settings';

export type ThemeId = 'winter' | 'dark-neon' | 'cyberpunk' | 'amoled' | 'nordic' | 'sunset';
export type ThemeKey = ThemeId;
export * from './dynamicUi';

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

/**
 * One exercise inside an interval block.
 */
export interface ExerciseStep {
  id: string;
  name: string;
  durationSec: number;
  kind: 'work' | 'rest' | 'prepare' | 'cooldown';
  /** Spoken when this exercise starts; falls back to `name`. */
  voicePrompt?: string;
}

/**
 * A step of a schedule is either a moment in time that rings, or a block of
 * timed exercises that runs as a sequence.
 */
export type ScheduleStep =
  | {
      id: string;
      kind: 'moment';
      /** "HH:MM" local time. */
      time: string;
      label: string;
      /** Announced when the moment rings. */
      voicePrompt?: string;
      sound?: string;
    }
  | {
      id: string;
      kind: 'block';
      /** "HH:MM" local time at which the block begins. */
      time: string;
      label: string;
      exercises: ExerciseStep[];
      /** Spoken once when the block starts. */
      voicePrompt?: string;
    };

/**
 * A saved, reusable schedule — the primary object of the product.
 *
 * Unlike a bare alarm, a schedule can be named, toggled as a whole, edited and
 * reused every week. Its steps expand into firings for the scheduler.
 */
export interface Schedule {
  id: string;
  name: string;
  /** Weekdays this schedule runs on; 0 = Sunday. Empty means every day. */
  days: number[];
  enabled: boolean;
  steps: ScheduleStep[];
  /** The pasted text this schedule was built from, kept verbatim. */
  sourceText?: string;
  createdAt: string;
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
  /** Set when this alarm was expanded from a schedule step. */
  scheduleId?: string;
}

export interface AISettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt?: string;
  enabled?: boolean;
  autoAdjustIntervals?: boolean;
}

export type SoundProfileId = 'mechanical' | 'soft' | 'neon' | 'arcade';

export interface SoundSettings {
  uiClicksEnabled: boolean;
  countdownTickEnabled: boolean;
  profile: SoundProfileId;
  volume: number; // 0..1
}

export interface AppSettings {
  theme: ThemeId;
  ai: AISettings;
  sound: SoundSettings;
  soundEnabled: boolean;
  ttsEnabled: boolean;
  volume: number; // 0..1
  keepOnTop: boolean;
  compactMode: boolean;
}
