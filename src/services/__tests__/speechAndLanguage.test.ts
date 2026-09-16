import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { EdgeTtsService } from '../edgeTts';
import { I18nService, TRANSLATIONS } from '../i18n';

/**
 * Spoken lines queue instead of overlapping.
 *
 * There is one audio element and several callers — a block announcing its next
 * exercise, an alarm announcing itself, a chat reply — so a line that started
 * while another was speaking used to cut the first one off mid-sentence.
 */

/**
 * Audio stub.
 *
 * `src` is an accessor rather than a field so that the service's plain
 * `el.src = …` assignment is recorded; the tests assert on what was handed to
 * the element, which is what "which line is playing" actually means here.
 */
class FakeAudio {
  static instances: FakeAudio[] = [];

  private currentSrc = '';
  /** Sources this element has been given, oldest first. */
  played: string[] = [];
  volume = 1;
  currentTime = 0;
  private listeners = new Map<string, Array<() => void>>();

  constructor() {
    FakeAudio.instances.push(this);
  }

  get src(): string {
    return this.currentSrc;
  }

  set src(value: string) {
    this.currentSrc = value;
    if (value) this.played.push(value);
  }

  addEventListener(event: string, fn: () => void) {
    const list = this.listeners.get(event) ?? [];
    list.push(fn);
    this.listeners.set(event, list);
  }

  removeEventListener(event: string, fn: () => void) {
    this.listeners.set(event, (this.listeners.get(event) ?? []).filter((f) => f !== fn));
  }

  play() {
    return Promise.resolve();
  }

  pause() {
    /* nothing to do */
  }

  /** Fires `ended`, the way a real element does when playback finishes. */
  end() {
    for (const fn of this.listeners.get('ended') ?? []) fn();
  }
}

const invokeMock = vi.fn(async (cmd: string, args: { text: string }) =>
  cmd === 'synthesize_speech'
    ? `data:audio/mp3;base64,${encodeURIComponent(args.text)}`
    : undefined,
);

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string, args: { text: string }) => invokeMock(cmd, args),
}));

const prefs = new Map<string, unknown>();
vi.mock('../store', () => ({
  StoreService: {
    getPreference: (key: string, fallback: unknown) => prefs.get(key) ?? fallback,
    setPreference: (key: string, value: unknown) => void prefs.set(key, value),
  },
}));

/**
 * Lets the service's pending work run.
 *
 * The queue advances on promises — synthesis resolves, then playback starts —
 * so draining microtasks is the exact condition being waited on. A wall-clock
 * poll would guess at it and cost every run real time.
 */
async function flush(times = 8): Promise<void> {
  for (let i = 0; i < times; i += 1) await Promise.resolve();
}

/** The element the service is using. */
function element(): FakeAudio {
  const found = FakeAudio.instances[0];
  if (!found) throw new Error('the service never reached playback');
  return found;
}

let elementCountBefore = 0;

describe('speech queue', () => {
  beforeEach(async () => {
    invokeMock.mockClear();
    (globalThis as Record<string, unknown>).Audio = FakeAudio;
    // The fallback probe must resolve, or the service stalls before playback.
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    EdgeTtsService.stop();
    // Stop the previous test's element from answering this one's first poll.
    if (FakeAudio.instances[0]) FakeAudio.instances[0].played = [];
    elementCountBefore = FakeAudio.instances.length;
  });

  afterEach(() => {
    EdgeTtsService.stop();
    vi.unstubAllGlobals();
  });

  it('speaks a line and resolves the caller once it has finished', async () => {
    const spoken = EdgeTtsService.speak('Первая фраза', 'ru-RU-DmitryNeural');
    await flush();

    expect(element().played).toHaveLength(1);

    // The caller resolves only when its own line ends, not when it starts.
    let settled = false;
    void spoken.then(() => {
      settled = true;
    });
    await flush();
    expect(settled).toBe(false);

    element().end();
    await flush();
    expect(settled).toBe(true);
  });

  it('does not start the next line until the first one ends', async () => {
    const first = EdgeTtsService.speak('Первая фраза', 'ru-RU-DmitryNeural');
    await flush();
    const el = element();
    const firstSrc = el.played[0];

    // A second line arrives while the first is still speaking.
    void EdgeTtsService.speak('Вторая фраза', 'ru-RU-DmitryNeural');
    await flush();

    // Nothing new was handed to the element: the first line was not cut off.
    expect(el.played).toEqual([firstSrc]);

    el.end();
    await first;
    await flush();

    expect(el.played).toHaveLength(2);
    expect(el.played[0]).not.toBe(el.played[1]);
  });

  it('reuses a cached line without asking the backend again', async () => {
    const first = EdgeTtsService.speak('Повтор', 'ru-RU-DmitryNeural');
    await flush();
    const el = element();
    el.end();
    await first;
    await flush();

    const callsAfterFirst = invokeMock.mock.calls.length;

    const second = EdgeTtsService.speak('Повтор', 'ru-RU-DmitryNeural');
    await flush();
    el.end();
    await second;

    // The cache is why a repeated announcement is instant.
    expect(invokeMock.mock.calls.length).toBe(callsAfterFirst);
    expect(el.played).toHaveLength(2);
  });

  it('releases a caller waiting behind a stopped queue', async () => {
    // Regression: emptying the queue without releasing whoever was waiting on a
    // line left that caller hanging forever.
    const first = EdgeTtsService.speak('Первая', 'ru-RU-DmitryNeural');
    await flush();

    const waiting = EdgeTtsService.speak('Вторая', 'ru-RU-DmitryNeural');
    EdgeTtsService.stop();

    await expect(waiting).resolves.toBeUndefined();

    element().end();
    await first;
  });

  it('says nothing at all when the voice is off', async () => {
    await EdgeTtsService.speak('Тишина', 'none');

    expect(invokeMock).not.toHaveBeenCalled();
    expect(FakeAudio.instances.length).toBe(elementCountBefore);
  });
});

describe('interface language', () => {
  beforeEach(() => {
    prefs.clear();
    I18nService.setLang('ru');
  });

  afterEach(() => {
    prefs.clear();
  });

  it('covers every navigation label the user clicks', () => {
    // A missing key renders as `undefined` in the tab bar, so both languages
    // must always agree on their shape.
    expect(Object.keys(TRANSLATIONS.en).sort()).toEqual(Object.keys(TRANSLATIONS.ru).sort());
  });

  it('has no empty translation', () => {
    for (const lang of ['ru', 'en'] as const) {
      for (const [key, value] of Object.entries(TRANSLATIONS[lang])) {
        expect(value.trim(), `${lang}.${key} is empty`).not.toBe('');
      }
    }
  });

  it('notifies subscribers so the chrome repaints', () => {
    const seen: string[] = [];
    const unsubscribe = I18nService.subscribe(() => seen.push(I18nService.getLang()));

    I18nService.setLang('en');

    expect(seen).toEqual(['en']);
    unsubscribe();
  });

  it('stops notifying once unsubscribed', () => {
    const listener = vi.fn();
    I18nService.subscribe(listener)();

    I18nService.setLang('en');

    expect(listener).not.toHaveBeenCalled();
  });
});
