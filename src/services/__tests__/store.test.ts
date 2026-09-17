import { describe, expect, it, beforeEach } from 'vitest';
import { StoreService, SCHEMA_VERSION, migrate, legacyApiKey } from '../store';
import { DEFAULT_DYNAMIC_UI } from '../../types/dynamicUi';

/**
 * Minimal in-memory localStorage so the store module works outside a browser.
 */
function installLocalStorage(): void {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

describe('store schema migration', () => {
  beforeEach(() => {
    installLocalStorage();
    StoreService.resetCache();
  });

  it('produces a valid default state from nothing', () => {
    const state = migrate(null);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.aiSettings.apiKey).toBe('');
  });

  it('ships no colour overrides, so the chosen theme shows through', () => {
    // A default palette here spreads over the base theme at render time and
    // beats it — which made every theme button appear dead.
    expect(DEFAULT_DYNAMIC_UI.colors).toEqual({});

    const state = migrate(null);
    expect(state.dynamicUi.colors).toEqual({});
  });

  it('keeps colours the user chose but drops the old default palette', () => {
    // A v4 file carries the whole Winter palette, none of which the user picked.
    // Their one real choice (the accent the AI set) must survive.
    const state = migrate({
      schemaVersion: 4,
      dynamicUi: {
        colors: {
          bg: '#050505', // the old shipped default — not a choice
          surface: '#0a0a0a',
          cardBg: '#0f0f0f',
          border: '#27272a',
          text: '#fafafa',
          subtext: '#a1a1aa',
          accentGlow: 'rgba(255, 122, 26, 0.28)',
          ringTrack: '#1c1c1f',
          ringProgress: '#ff7a1a',
          ticks: '#3f3f46',
          accent: '#abcdef', // genuinely chosen
        },
      },
    });

    expect(state.dynamicUi.colors).toEqual({ accent: '#abcdef' });
  });

  it('does not strip a colour that only coincidentally matches the default', () => {
    // After v5 the same value is a real choice and must not be rewritten.
    const state = migrate({
      schemaVersion: SCHEMA_VERSION,
      dynamicUi: { colors: { bg: '#050505' } },
    });

    expect(state.dynamicUi.colors.bg).toBe('#050505');
  });

  it('falls back to defaults for corrupt nested UI config', () => {
    const state = migrate({
      dynamicUi: {
        colors: { accent: '#abcdef' },
        dial: { tickLength: 'enormous', glowIntensity: 42, showTicks: false },
        layout: { buttonStyle: 'hexagon' },
      },
    });
    expect(state.dynamicUi.colors.accent).toBe('#abcdef');
    expect(state.dynamicUi.dial.tickLength).toBe(DEFAULT_DYNAMIC_UI.dial.tickLength);
    expect(state.dynamicUi.dial.showTicks).toBe(false);
    expect(state.dynamicUi.layout.buttonStyle).toBe(DEFAULT_DYNAMIC_UI.layout.buttonStyle);
  });

  it('rejects alarms with a malformed time instead of trusting them', () => {
    const state = migrate({
      alarms: [
        { id: 'ok', time: '07:30', title: 'Подъём' },
        { id: 'bad', time: 'не время', title: 'Мусор' },
        { id: 'nope' },
      ],
    });
    expect(state.alarms.map((a) => a.id)).toEqual(['ok']);
  });

  it('normalises single-digit hours and keeps only valid weekday numbers', () => {
    const state = migrate({
      alarms: [{ id: 'a', time: '7:30', days: [1, 9, -1, 5, 'x'] }],
    });
    expect(state.alarms[0].time).toBe('07:30');
    expect(state.alarms[0].days).toEqual([1, 5]);
  });


  it('drops chat messages without text', () => {
    const state = migrate({
      chatMessages: [
        { id: '1', sender: 'user', text: 'привет' },
        { id: '2', sender: 'assistant', text: '' },
        'garbage',
      ],
    });
    expect(state.chatMessages).toHaveLength(1);
    expect(state.chatMessages[0].text).toBe('привет');
  });

  it('rejects a non-JSON import with a readable error', async () => {
    await expect(StoreService.importJson('{not json')).rejects.toThrow('не является корректным JSON');
  });

  it('rejects a JSON payload that is not an Alarmer backup', async () => {
    await expect(StoreService.importJson('{"foo":1}')).rejects.toThrow(
      'не похож на резервную копию Alarmer',
    );
  });

  it('round-trips a valid backup through export and import', async () => {
    await StoreService.persist({
      alarms: [],
      aiSettings: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
      chatMessages: [],
      preferences: {},
    });
    const exported = StoreService.exportJson();
    StoreService.resetCache();
    const imported = await StoreService.importJson(exported);
    expect(imported.aiSettings.model).toBe('gpt-4o-mini');
  });

  it('never writes an API key into the exported backup', async () => {
    // The export is the file a user mails to someone else; a key in it leaks
    // their credential. The key belongs in the OS credential store, and this is
    // the contract that keeps it out.
    const state = migrate({
      aiSettings: { apiKey: 'sk-leaked', baseUrl: 'https://api.openai.com/v1', model: 'm' },
    });

    expect(state.aiSettings.apiKey).toBe('');

    await StoreService.persist(state);
    expect(StoreService.exportJson()).not.toContain('sk-leaked');
  });

  it('still finds a legacy key so it can be migrated out of the file', () => {
    // Dropping the key silently would make an existing user re-enter it, so the
    // value is read once — by the migration that moves it into the credential
    // store — and then left out of the state entirely.
    expect(legacyApiKey({ aiSettings: { apiKey: 'sk-old' } })).toBe('sk-old');
    expect(legacyApiKey({ aiSettings: { apiKey: '   ' } })).toBeNull();
    expect(legacyApiKey({ aiSettings: {} })).toBeNull();
    expect(legacyApiKey(null)).toBeNull();
  });

  it('heals an alarm that could never ring', () => {
    // "days" mode with no days matches no weekday: the alarm would show as
    // "Каждый день" and stay silent. Reading it back as a daily alarm keeps it
    // working instead of leaving a silently broken entry in the list.
    const state = migrate({
      alarms: [{ id: 'dead', time: '07:00', repeat: 'days', days: [] }],
    });

    expect(state.alarms[0].repeat).toBe('daily');
  });

  it('leaves a one-off alarm a one-off', () => {
    const state = migrate({
      alarms: [{ id: 'once', time: '07:00', repeat: 'once', days: [] }],
    });

    expect(state.alarms[0].repeat).toBe('once');
  });

  it('leaves a real day selection alone', () => {
    const state = migrate({
      alarms: [{ id: 'wk', time: '07:00', repeat: 'days', days: [1, 3, 5] }],
    });

    expect(state.alarms[0].repeat).toBe('days');
    expect(state.alarms[0].days).toEqual([1, 3, 5]);
  });

  it('persists preferences with numeric, boolean and string coercion', () => {
    // persist() updates the in-memory snapshot before its first await, so the
    // written value is readable synchronously right after setPreference returns.
    StoreService.setPreference('alarmer_click_volume', 0.35);
    expect(StoreService.getPreference('alarmer_click_volume', 0.5)).toBeCloseTo(0.35);

    StoreService.setPreference('alarmer_ui_clicks', 'false');
    expect(StoreService.getPreference('alarmer_ui_clicks', true)).toBe(false);

    StoreService.setPreference('alarmer_voice_id', 'ru-RU-DmitryNeural');
    expect(StoreService.getPreference('alarmer_voice_id', 'none')).toBe('ru-RU-DmitryNeural');
  });

  it('returns the fallback for an unknown preference key', () => {
    expect(StoreService.getPreference('alarmer_missing', 42)).toBe(42);
  });
});
