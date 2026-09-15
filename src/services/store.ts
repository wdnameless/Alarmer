import { LazyStore } from '@tauri-apps/plugin-store';
import { DEFAULT_AI_SETTINGS, DEFAULT_SCHEDULES } from '../constants/defaults';
import { DEFAULT_DYNAMIC_UI, DynamicUIConfig } from '../types/dynamicUi';
import { AISettings, AlarmItem, Schedule, ScheduleStep, ExerciseStep } from '../types';
import { asArray, asBoolean, asNumber, asString, isRecord, oneOf } from '../types/guards';

/**
 * Persistence layer for the whole application.
 *
 * Backs onto the native Tauri store file (survives WebView cache clears, unlike
 * localStorage) and falls back to localStorage when running in a plain browser
 * so the dev server keeps working.
 *
 * Every value is read through `hydrate()` / validated before use, and imports go
 * through the same sanitiser — a corrupted or stale file can never crash the
 * render tree.
 */

export const SCHEMA_VERSION = 2;

const STORE_FILE = 'alarmer.json';

export interface StoredChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface PersistedState {
  schemaVersion: number;
  alarms: AlarmItem[];
  schedules: Schedule[];
  aiSettings: AISettings;
  dynamicUi: DynamicUIConfig;
  chatMessages: StoredChatMessage[];
  preferences: Record<string, unknown>;
}

export const PREFERENCE_KEYS = [
  'alarmer_click_volume',
  'alarmer_alarm_volume',
  'alarmer_voice_volume',
  'alarmer_ui_clicks',
  'alarmer_countdown_ticks',
  'alarmer_clock_tick',
  'alarmer_sound_profile',
  'alarmer_voice_id',
  'alarmer_left_pane_width',
  'alarmer_custom_alarm_sound',
  'alarmer_custom_alarm_filename',
  'alarmer_lang',
] as const;

let storePromise: Promise<LazyStore> | null = null;
let cache: PersistedState | null = null;

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function getStore(): Promise<LazyStore> {
  if (!storePromise) {
    storePromise = Promise.resolve(new LazyStore(STORE_FILE));
  }
  return storePromise;
}

function sanitizeAlarm(raw: unknown, index: number): AlarmItem | null {
  if (!isRecord(raw)) return null;
  const time = asString(raw.time, '');
  if (!/^\d{1,2}:\d{2}$/.test(time)) return null;
  const label = asString(raw.label, asString(raw.title, 'Будильник'));
  return {
    id: asString(raw.id, `alarm_${index}`),
    title: asString(raw.title, label),
    label,
    time: time.padStart(5, '0'),
    days: asArray<unknown>(raw.days, [1, 2, 3, 4, 5]).filter(
      (d): d is number => typeof d === 'number' && d >= 0 && d <= 6,
    ),
    enabled: asBoolean(raw.enabled, true),
    sound: asString(raw.sound, 'gentle'),
    voicePrompt: typeof raw.voicePrompt === 'string' ? raw.voicePrompt : undefined,
    voiceAnnouncement: typeof raw.voiceAnnouncement === 'string' ? raw.voiceAnnouncement : undefined,
  };
}

function sanitizeAiSettings(raw: unknown): AISettings {
  if (!isRecord(raw)) return { ...DEFAULT_AI_SETTINGS };
  return {
    apiKey: asString(raw.apiKey, ''),
    baseUrl: asString(raw.baseUrl, DEFAULT_AI_SETTINGS.baseUrl),
    model: asString(raw.model, DEFAULT_AI_SETTINGS.model),
    systemPrompt: typeof raw.systemPrompt === 'string' ? raw.systemPrompt : undefined,
    enabled: asBoolean(raw.enabled, true),
    autoAdjustIntervals: asBoolean(raw.autoAdjustIntervals, false),
  };
}

function sanitizeDynamicUi(raw: unknown): DynamicUIConfig {
  const base = DEFAULT_DYNAMIC_UI;
  if (!isRecord(raw)) return structuredClone(base);
  const colors = isRecord(raw.colors) ? raw.colors : {};
  const dial = isRecord(raw.dial) ? raw.dial : {};
  const typography = isRecord(raw.typography) ? raw.typography : {};
  const layout = isRecord(raw.layout) ? raw.layout : {};

  return {
    themeName: asString(raw.themeName, base.themeName),
    colors: {
      bg: asString(colors.bg, base.colors.bg),
      surface: asString(colors.surface, base.colors.surface),
      cardBg: asString(colors.cardBg, base.colors.cardBg),
      border: asString(colors.border, base.colors.border),
      text: asString(colors.text, base.colors.text),
      subtext: asString(colors.subtext, base.colors.subtext),
      accent: asString(colors.accent, base.colors.accent),
      accentGlow: asString(colors.accentGlow, base.colors.accentGlow),
      ringTrack: asString(colors.ringTrack, base.colors.ringTrack),
      ringProgress: asString(colors.ringProgress, base.colors.ringProgress),
      ticks: asString(colors.ticks, base.colors.ticks),
    },
    typography: {
      fontFamily: asString(typography.fontFamily, base.typography.fontFamily),
      timeScale: asNumber(typography.timeScale, base.typography.timeScale),
    },
    dial: {
      size: asNumber(dial.size, base.dial.size),
      showTicks: asBoolean(dial.showTicks, base.dial.showTicks),
      tickLength: oneOf(dial.tickLength, ['short', 'normal', 'long'] as const, base.dial.tickLength),
      glowIntensity: oneOf(
        dial.glowIntensity,
        ['none', 'subtle', 'high'] as const,
        base.dial.glowIntensity,
      ),
      stylePreset: oneOf(
        dial.stylePreset,
        ['neon', 'vintage', 'chronograph', 'minimal'] as const,
        base.dial.stylePreset ?? 'neon',
      ),
    },
    layout: {
      showPresetButtons: asBoolean(layout.showPresetButtons, base.layout.showPresetButtons),
      showSubtimer: asBoolean(layout.showSubtimer, base.layout.showSubtimer),
      buttonStyle: oneOf(
        layout.buttonStyle,
        ['rounded', 'square', 'pill'] as const,
        base.layout.buttonStyle,
      ),
      glassmorphism: asBoolean(layout.glassmorphism, base.layout.glassmorphism),
      contentAlignment: oneOf(
        layout.contentAlignment,
        ['center', 'top', 'compact'] as const,
        base.layout.contentAlignment,
      ),
      widgetsOrder: asArray(layout.widgetsOrder, base.layout.widgetsOrder),
      showSleepButton: asBoolean(layout.showSleepButton, true),
      showAiScheduleButton: asBoolean(layout.showAiScheduleButton, true),
      showCurrentTimeBadge: asBoolean(layout.showCurrentTimeBadge, true),
    },
  };
}

function sanitizeExercise(raw: unknown, index: number): ExerciseStep | null {
  if (!isRecord(raw)) return null;
  const duration = asNumber(raw.durationSec, 0);
  if (duration <= 0) return null;
  const name = asString(raw.name, `Упражнение ${index + 1}`);
  return {
    id: asString(raw.id, `ex_${index}`),
    name,
    durationSec: Math.round(duration),
    kind: oneOf(raw.kind, ['work', 'rest', 'prepare', 'cooldown'] as const, 'work'),
    voicePrompt: typeof raw.voicePrompt === 'string' ? raw.voicePrompt : undefined,
  };
}

function sanitizeStep(raw: unknown, index: number): ScheduleStep | null {
  if (!isRecord(raw)) return null;
  const time = asString(raw.time, '');
  if (!/^\d{1,2}:\d{2}$/.test(time)) return null;
  const normalizedTime = time.padStart(5, '0');
  const label = asString(raw.label, `Шаг ${index + 1}`);
  const voicePrompt = typeof raw.voicePrompt === 'string' ? raw.voicePrompt : undefined;

  if (raw.kind === 'block') {
    const exercises = asArray<unknown>(raw.exercises, [])
      .map(sanitizeExercise)
      .filter((e): e is ExerciseStep => e !== null);
    // A block with no usable exercises is not a block.
    if (exercises.length === 0) return null;
    return {
      id: asString(raw.id, `step_${index}`),
      kind: 'block',
      time: normalizedTime,
      label,
      exercises,
      voicePrompt,
    };
  }

  return {
    id: asString(raw.id, `step_${index}`),
    kind: 'moment',
    time: normalizedTime,
    label,
    voicePrompt,
    sound: typeof raw.sound === 'string' ? raw.sound : undefined,
  };
}

function sanitizeSchedule(raw: unknown, index: number): Schedule | null {
  if (!isRecord(raw)) return null;
  const name = asString(raw.name, '');
  if (!name) return null;
  const steps = asArray<unknown>(raw.steps, [])
    .map(sanitizeStep)
    .filter((s): s is ScheduleStep => s !== null);
  if (steps.length === 0) return null;

  return {
    id: asString(raw.id, `sched_${index}`),
    name,
    days: asArray<unknown>(raw.days, [])
      .filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6),
    enabled: asBoolean(raw.enabled, true),
    steps,
    sourceText: typeof raw.sourceText === 'string' ? raw.sourceText : undefined,
    createdAt: asString(raw.createdAt, new Date().toISOString()),
  };
}

function sanitizeMessages(raw: unknown): StoredChatMessage[] {
  return asArray<unknown>(raw, [])
    .filter(isRecord)
    .map((m, i) => ({
      id: asString(m.id, `msg_${i}`),
      sender: asString(m.sender, 'assistant'),
      text: asString(m.text, ''),
      timestamp: asString(m.timestamp, ''),
    }))
    .filter((m) => m.text.length > 0);
}

/**
 * Brings any stored payload up to the current schema. Unknown or corrupt fields
 * are replaced with defaults rather than propagated.
 *
 * v1 -> v2: introduced `schedules` as the primary object. Existing standalone
 * alarms are preserved as-is so nobody loses the alarms they already rely on.
 */
export function migrate(raw: unknown): PersistedState {
  const record = isRecord(raw) ? raw : {};
  const version = asNumber(record.schemaVersion, 0);

  const schedules = asArray<unknown>(record.schedules, [])
    .map(sanitizeSchedule)
    .filter((s): s is Schedule => s !== null);

  // A fresh install (or a v1 file with no schedules yet) gets the sample
  // schedule so the product's core flow is visible on first launch.
  const withSchedules = schedules.length === 0 && version < 2 ? DEFAULT_SCHEDULES : schedules;

  return {
    schemaVersion: SCHEMA_VERSION,
    alarms: asArray<unknown>(record.alarms, [])
      .map(sanitizeAlarm)
      .filter((a): a is AlarmItem => a !== null),
    schedules: withSchedules,
    aiSettings: sanitizeAiSettings(record.aiSettings),
    dynamicUi: sanitizeDynamicUi(record.dynamicUi),
    chatMessages: sanitizeMessages(record.chatMessages),
    preferences: isRecord(record.preferences) ? record.preferences : {},
  };
}

function readLegacyPreferences(): Record<string, unknown> {
  const prefs: Record<string, unknown> = {};
  if (typeof localStorage === 'undefined') return prefs;
  for (const key of PREFERENCE_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) prefs[key] = value;
  }
  return prefs;
}

export class StoreService {
  /** Loads persisted state once, migrating and validating whatever is on disk. */
  static async hydrate(): Promise<PersistedState> {
    if (cache) return cache;

    let raw: unknown = null;
    try {
      if (isTauri()) {
        const store = await getStore();
        raw = await store.get('state');
      } else if (typeof localStorage !== 'undefined') {
        const legacy = localStorage.getItem('alarmer_state');
        if (legacy) raw = JSON.parse(legacy);
      }
    } catch (e) {
      console.warn('Store hydrate failed, starting from defaults:', e);
      raw = null;
    }

    const migrated = migrate(raw);
    if (Object.keys(migrated.preferences).length === 0) {
      migrated.preferences = readLegacyPreferences();
    }
    cache = migrated;
    return cache;
  }

  /** Synchronous snapshot of the hydrated state (defaults before hydrate completes). */
  static snapshot(): PersistedState {
    return cache ?? migrate(null);
  }

  static async persist(partial: Partial<Omit<PersistedState, 'schemaVersion'>>): Promise<void> {
    const next: PersistedState = {
      ...StoreService.snapshot(),
      ...partial,
      schemaVersion: SCHEMA_VERSION,
    };
    cache = next;
    try {
      if (isTauri()) {
        const store = await getStore();
        await store.set('state', next);
        await store.save();
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('alarmer_state', JSON.stringify(next));
      }
    } catch (e) {
      console.warn('Store persist failed:', e);
    }
  }

  static getPreference<T extends string | number | boolean>(key: string, fallback: T): T {
    const value = StoreService.snapshot().preferences[key];
    if (value === undefined) return fallback;
    if (typeof fallback === 'number') {
      const parsed = typeof value === 'number' ? value : parseFloat(String(value));
      return (Number.isFinite(parsed) ? parsed : fallback) as T;
    }
    if (typeof fallback === 'boolean') {
      return (value !== 'false' && value !== false) as T;
    }
    return String(value) as T;
  }

  static setPreference(key: string, value: unknown): void {
    const prefs = { ...StoreService.snapshot().preferences, [key]: value };
    void StoreService.persist({ preferences: prefs });
  }

  /** Exports the full state as a JSON string for user-facing backup. */
  static exportJson(): string {
    return JSON.stringify(StoreService.snapshot(), null, 2);
  }

  /**
   * Validates and imports a backup. Throws with a readable message when the
   * payload is not a well-formed Alarmer backup.
   */
  static async importJson(text: string): Promise<PersistedState> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Файл не является корректным JSON');
    }
    if (!isRecord(parsed)) {
      throw new Error('Ожидался объект с резервной копией Alarmer');
    }
    if (!('alarms' in parsed) && !('aiSettings' in parsed) && !('dynamicUi' in parsed)) {
      throw new Error('Файл не похож на резервную копию Alarmer');
    }

    const next = migrate(parsed);
    cache = next;
    await StoreService.persist(next);
    return next;
  }

  /** Test seam: clears the memoized state. */
  static resetCache(): void {
    cache = null;
  }
}
