export type AppMode = 'dashboard' | 'ai' | 'settings';

export type ThemeId = 'winter' | 'dark-neon' | 'cyberpunk' | 'amoled' | 'nordic' | 'sunset';
export * from './dynamicUi';
export * from './focus';

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
      /** A short description the user wrote, shown when the step rings. */
      note?: string;
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
      /** A short description shown while the block plays. */
      note?: string;
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
  /**
   * Weekdays this schedule runs on; 0 = Sunday. Empty means every day — a
   * schedule is a routine, so "no days chosen" is "all of them".
   */
  days: number[];
  enabled: boolean;
  steps: ScheduleStep[];
  /** The pasted text this schedule was built from, kept verbatim. */
  sourceText?: string;
  createdAt: string;
}

/**
 * How often a standalone alarm rings.
 *
 * `days: []` used to mean "once" in the type, "one time" in the AI prompt and
 * "every day" in the Rust scheduler, so an alarm created as a one-off rang
 * forever. The intent is now explicit instead of inferred from an empty list.
 */
export type RepeatMode = 'once' | 'daily' | 'days';

/**
 * A piece of work the user intends to do.
 *
 * A schedule answers "when", which is not the same question as "what". Without
 * a task, a 09:00 block can only say "Начать блок" — it cannot say what the
 * block is for, and nothing survives the block to be counted afterwards.
 */
export type TaskTimerType = 'interval' | 'time';

export interface TaskTimerConfig {
  enabled: boolean;
  type: TaskTimerType;
  /** Interval in minutes (e.g. 60 for every hour). Used when type is 'interval'. */
  intervalMinutes?: number;
  /** Fixed time "HH:MM" (24h). Used when type is 'time'. */
  time?: string;
  /** Sound profile to play when timer rings. Defaults to 'gentle'. */
  sound?: string;
  /** Optional voice speech reminder. */
  voicePrompt?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  /** Optional longer note shown while the task is being worked on. */
  note?: string;
  done: boolean;
  /** Schedule step this task belongs to, when it came from a program. */
  stepId?: string;
  scheduleId?: string;
  /** Optional recurring or scheduled timer attached to this task. */
  timer?: TaskTimerConfig;
  /** ISO timestamps. */
  createdAt: string;
  completedAt?: string;
}

/**
 * One completed interval block or finished countdown.
 *
 * Recorded so the app can answer "how much did I actually do" — the question
 * that keeps a time-management tool installed past the first week.
 */
export interface SessionRecord {
  id: string;
  /** Schedule the block came from, when it came from one. */
  scheduleId?: string;
  stepId?: string;
  label: string;
  /** Focused seconds actually spent, excluding paused time. */
  focusedSec: number;
  startedAt: string;
  endedAt: string;
  /** True when the user ran it to completion rather than closing it early. */
  completed: boolean;
  /**
   * Direction this work belonged to. Absent means «Без направления»: it still
   * counts toward total focus, but toward no budget — attributing it to a
   * direction the user never chose would be inventing history.
   */
  directionId?: string;
  /**
   * Focus quality the user rated after the block, 1..10.
   *
   * Their headline signal, and the reason the block cycle asks at all: «качество
   * фокуса — это и есть твоё желание и вовлечённость». Absent when skipped, which
   * is deliberately different from a low score.
   */
  quality?: number;
  /**
   * Blocks earned, fractional (25 of 50 minutes = 0.5).
   *
   * Stored rather than always derived, so a later change to the block length
   * does not silently rewrite what past sessions were worth. Absent on records
   * written before blocks existed — derive those from `focusedSec`.
   */
  blocks?: number;
}
/**
 * A free-form note the user keeps.
 *
 * Written in a deliberately small subset of Markdown (headings, emphasis, lists,
 * code, links) so it reads well as plain text in the store and renders
 * formatted in the UI. Bodies are never injected as HTML — the renderer builds
 * them from text, so a note cannot break the app's CSP or inject a script.
 */
export interface NoteItem {
  id: string;
  /** Optional title; a note with only a body shows its first line instead. */
  title: string;
  /** Markdown body. */
  body: string;
  /** When set, the note is attached to a specific alarm or schedule step. */
  alarmId?: string;
  /** Schedule + step this note belongs to, when attached to a program. */
  scheduleId?: string;
  stepId?: string;
  /** Pinned notes sort ahead of the rest. */
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}


export interface AlarmItem {
  id: string;
  title: string;
  label?: string;
  time: string; // "HH:MM" 24h
  /** Weekdays, 0 = Sunday. Only consulted when `repeat` is `'days'`. */
  days: number[];
  repeat: RepeatMode;
  enabled: boolean;
  sound: string;
  voicePrompt?: string;
  voiceAnnouncement?: string;
  /** A short description the user wrote, shown on the ringing takeover. */
  note?: string;
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

export type ClockStyle = 'digital' | 'classic' | 'sand';
