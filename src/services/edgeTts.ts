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

export class EdgeTtsService {
  private static audioEl: HTMLAudioElement | null = null;
  private static audioCache = new Map<string, string>();

  static async speak(text: string, voiceId: string = 'none'): Promise<void> {
    if (!voiceId || voiceId === 'none' || !text.trim()) return;

    this.stop();

    const voiceVol = StoreService.getPreference('alarmer_voice_volume', 0.8);
    const cacheKey = `${voiceId}::${text}`;

    // 0. In-memory data-URI cache (instant replay without IPC)
    const cachedUri = this.audioCache.get(cacheKey);
    if (cachedUri) {
      try {
        if (!this.audioEl) {
          this.audioEl = new Audio();
        }
        this.audioEl.src = cachedUri;
        this.audioEl.volume = Math.max(0, Math.min(1, voiceVol));
        await this.audioEl.play();
        return;
      } catch (err) {
        console.warn('Cached Edge TTS playback failed:', err);
      }
    }

    // 1. Native Rust Microsoft Edge Neural TTS
    try {
      const dataUri = await invoke<string>('synthesize_speech', {
        text,
        voiceId,
      });

      if (dataUri && dataUri.startsWith('data:audio/')) {
        this.audioCache.set(cacheKey, dataUri);
        if (!this.audioEl) {
          this.audioEl = new Audio();
        }
        this.audioEl.src = dataUri;
        this.audioEl.volume = Math.max(0, Math.min(1, voiceVol));
        await this.audioEl.play();
        return;
      }
    } catch (err) {
      console.warn('Native Edge TTS synthesis failed, trying fallback:', err);
    }
    // 2. Fallback: Google TTS remote stream
    const isEnglish = voiceId.includes('en-US');
    const lang = isEnglish ? 'en' : 'ru';
    const cleanText = encodeURIComponent(text.slice(0, 150));
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${cleanText}&tl=${lang}&client=tw-ob`;

    try {
      if (!this.audioEl) {
        this.audioEl = new Audio();
      }
      this.audioEl.src = url;
      this.audioEl.volume = Math.max(0, Math.min(1, voiceVol));
      await this.audioEl.play();
      return;
    } catch (e) {
      console.warn('Remote stream fallback failed:', e);
    }

    // 3. Fallback: Local SpeechSynthesis
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = isEnglish ? 'en-US' : 'ru-RU';
      u.volume = Math.max(0, Math.min(1, voiceVol));
      window.speechSynthesis.speak(u);
    }
  }

  static stop(): void {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
