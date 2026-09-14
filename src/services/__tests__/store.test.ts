import { describe, expect, it, beforeEach } from 'vitest';
import { StoreService, SCHEMA_VERSION, migrate } from '../store';
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
    expect(state.dynamicUi.colors.accent).toBe(DEFAULT_DYNAMIC_UI.colors.accent);
    expect(state.aiSettings.apiKey).toBe('');
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

  it('falls back to defaults for corrupt nested UI config', () => {
    const state = migrate({
      dynamicUi: {
        colors: { accent: '#abcdef' },
        dial: { tickLength: 'enormous', glowIntensity: 42, showTicks: false },
        layout: { buttonStyle: 'hexagon' },
      },
    });
    expect(state.dynamicUi.colors.accent).toBe('#abcdef');
    expect(state.dynamicUi.colors.bg).toBe(DEFAULT_DYNAMIC_UI.colors.bg);
    expect(state.dynamicUi.dial.tickLength).toBe(DEFAULT_DYNAMIC_UI.dial.tickLength);
    expect(state.dynamicUi.dial.showTicks).toBe(false);
    expect(state.dynamicUi.layout.buttonStyle).toBe(DEFAULT_DYNAMIC_UI.layout.buttonStyle);
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
      aiSettings: { apiKey: 'sk-test', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
      chatMessages: [],
      preferences: {},
    });
    const exported = StoreService.exportJson();
    StoreService.resetCache();
    const imported = await StoreService.importJson(exported);
    expect(imported.aiSettings.apiKey).toBe('sk-test');
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
