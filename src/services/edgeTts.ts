import { invoke } from '@tauri-apps/api/core';
import { StoreService } from './store';

export interface CloudVoice {
  id: string;
  name: string;
  lang: string;
  gender: 'Female' | 'Male';
}

export const CLOUD_VOICES: CloudVoice[] = [
  { id: 'none', name: 'Без озвучки (Только звуковые сигналы)', lang: 'ru-RU', gender: 'Female' },
  { id: 'ru-RU-SvetlanaNeural', name: 'Светлана (Русский женский нейросетевой)', lang: 'ru-RU', gender: 'Female' },
  { id: 'ru-RU-DmitryNeural', name: 'Дмитрий (Русский мужской диктор)', lang: 'ru-RU', gender: 'Male' },
  { id: 'en-US-JennyNeural', name: 'Jenny (English US, Female Neural)', lang: 'en-US', gender: 'Female' },
  { id: 'en-US-GuyNeural', name: 'Guy (English US, Male Coach)', lang: 'en-US', gender: 'Male' },
];

interface Utterance {
  text: string;
  voiceId: string;
  /** Releases whoever is awaiting this line. */
  done: () => void;
}

/** How long a stalled utterance may block the queue for. */
const UTTERANCE_TIMEOUT_MS = 20_000;

/**
 * Spoken lines through Microsoft Edge neural voices.
 *
 * Lines are queued rather than played immediately. There is one audio element
 * and several callers — an interval block announcing its next exercise while an
 * alarm announces itself, a chat reply, a settings preview — and playing them
 * the moment each is ready meant every new line cut off the one before it, so a
 * two-part sentence arrived as a fragment.
 *
 * Synthesis still happens on demand, but playback waits its turn.
 */
export class EdgeTtsService {
  private static audioEl: HTMLAudioElement | null = null;
  private static audioCache = new Map<string, string>();

  private static queue: Utterance[] = [];
  private static draining = false;
  /** Bumped by `stop()` so an in-flight drain abandons the queue it had. */
  private static generation = 0;

  /**
   * Speaks `text`, resolving once that line has finished.
   *
   * Each caller awaits its own line rather than the whole queue: awaiting the
   * drain would make a caller wait for lines queued after its own, which is not
   * what "say this" means.
   */
  static async speak(text: string, voiceId: string = 'none'): Promise<void> {
    if (!voiceId || voiceId === 'none' || !text.trim()) return;

    // A direct request supersedes anything still waiting: the user asked for
    // this line now, and the stale queue behind it is no longer what they want.
    this.releaseQueue();

    const { promise, resolve } = Promise.withResolvers<void>();
    this.queue.push({ text, voiceId, done: resolve });

    if (!this.draining) void this.drain();
    await promise;
  }

  /** Releases anything waiting in the queue without playing it. */
  private static releaseQueue(): void {
    for (const pending of this.queue) pending.done();
    this.queue = [];
  }

  /** Plays queued lines one after another, in order. */
  private static async drain(): Promise<void> {
    this.draining = true;
    const myGeneration = this.generation;

    try {
      while (this.queue.length > 0) {
        if (myGeneration !== this.generation) return;

        const next = this.queue.shift();
        if (!next) return;
        await this.play(next, myGeneration);
        // Release the caller of this line as soon as it has been spoken, even
        // if later lines are still waiting.
        next.done();
      }
    } finally {
      this.draining = false;
    }
  }

  private static async play(utterance: Utterance, myGeneration: number): Promise<void> {
    const voiceVol = StoreService.getPreference('alarmer_voice_volume', 0.8);
    const volume = Math.max(0, Math.min(1, voiceVol));
    const cacheKey = `${utterance.voiceId}::${utterance.text}`;

    const cached = this.audioCache.get(cacheKey);
    if (cached) {
      await this.playSrc(cached, volume, myGeneration);
      return;
    }

    const dataUri = await this.synthesize(utterance.text, utterance.voiceId);
    if (!dataUri) return;
    if (myGeneration !== this.generation) return;

    this.audioCache.set(cacheKey, dataUri);
    await this.playSrc(dataUri, volume, myGeneration);
  }

  /** Native neural synthesis, with an honest fallback chain. */
  private static async synthesize(text: string, voiceId: string): Promise<string | null> {
    try {
      const dataUri = await invoke<string>('synthesize_speech', { text, voiceId });
      if (dataUri && dataUri.startsWith('data:audio/')) return dataUri;
    } catch (err) {
      console.warn('Native Edge TTS synthesis failed, trying fallback:', err);
    }

    const isEnglish = voiceId.includes('en-US');
    const lang = isEnglish ? 'en' : 'ru';
    const cleanText = encodeURIComponent(text.slice(0, 150));
    const fallback = `https://translate.google.com/translate_tts?ie=UTF-8&q=${cleanText}&tl=${lang}&client=tw-ob`;

    try {
      // Probe the fallback before queueing it, so a dead endpoint fails here
      // rather than becoming a silent entry that stalls the queue.
      const response = await fetch(fallback, { method: 'HEAD' });
      if (response.ok) return fallback;
    } catch {
      // Fall through to the local synthesiser.
    }

    return null;
  }

  /**
   * Plays one source and resolves when it ends.
   *
   * Resolving on `ended` is what makes the queue sequential; resolving on
   * `play()` would overlap every line.
   */
  private static async playSrc(
    src: string,
    volume: number,
    myGeneration: number,
  ): Promise<void> {
    if (myGeneration !== this.generation) return;

    if (!this.audioEl) this.audioEl = new Audio();
    const el = this.audioEl;

    const { promise, resolve } = Promise.withResolvers<void>();

    const finish = () => {
      window.clearTimeout(timer);
      el.removeEventListener('ended', finish);
      el.removeEventListener('error', finish);
      resolve();
    };

    // A source that never fires `ended` — a network stall, a corrupt sample —
    // would otherwise hold the queue forever.
    const timer = window.setTimeout(finish, UTTERANCE_TIMEOUT_MS);

    el.addEventListener('ended', finish);
    el.addEventListener('error', finish);

    el.src = src;
    el.volume = volume;
    void el.play().catch((err) => {
      console.warn('Speech playback failed:', err);
      finish();
    });

    await promise;
  }

  /** Silences speech and abandons everything still queued. */
  static stop(): void {
    this.generation += 1;
    // Callers awaiting a queued line must be released, or a stop leaves them
    // waiting for a line that will never be spoken.
    this.releaseQueue();
    this.draining = false;

    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
