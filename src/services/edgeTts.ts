export interface CloudVoice {
  id: string;
  name: string;
  lang: string;
  gender: 'Female' | 'Male';
}

export const CLOUD_VOICES: CloudVoice[] = [
  { id: 'none', name: 'Без озвучки (Только звуковые сигналы)', lang: 'ru-RU', gender: 'Female' },
  { id: 'ru-RU-SvetlanaNeural', name: 'Светлана (Русский женский)', lang: 'ru-RU', gender: 'Female' },
  { id: 'ru-RU-DmitryNeural', name: 'Дмитрий (Русский мужской баритон)', lang: 'ru-RU', gender: 'Male' },
  { id: 'en-US-JennyNeural', name: 'Jenny (English US, Female)', lang: 'en-US', gender: 'Female' },
  { id: 'en-US-GuyNeural', name: 'Guy (English US, Male Deep)', lang: 'en-US', gender: 'Male' },
];

export class EdgeTtsService {
  private static audioCtx: AudioContext | null = null;
  private static activeSource: AudioBufferSourceNode | null = null;

  static async speak(text: string, voiceId: string = 'none'): Promise<void> {
    if (!voiceId || voiceId === 'none' || !text.trim()) return;

    this.stop();

    const isEnglish = voiceId.includes('en-US');
    const isMale = voiceId.includes('Dmitry') || voiceId.includes('Guy');
    const lang = isEnglish ? 'en' : 'ru';
    const cleanText = encodeURIComponent(text.slice(0, 150));
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${cleanText}&tl=${lang}&client=tw-ob`;

    // 1. Fetch remote audio blob and play through Web Audio with pitch shifting
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('TTS fetch error');
      const arrayBuffer = await resp.arrayBuffer();

      const AudioContextClass = window.AudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;

      // Real distinct pitch modulation:
      // Male voices (Guy / Dmitry) shift down to authoritative pitch
      // Female voices (Jenny / Svetlana) shift up to clear bright pitch
      if (isMale) {
        source.playbackRate.value = 0.82;
      } else {
        source.playbackRate.value = 1.14;
      }

      source.connect(this.audioCtx.destination);
      this.activeSource = source;
      source.start(0);
      return;
    } catch (e) {
      console.warn('Cloud audio stream error, falling back to Web Speech:', e);
    }

    // 2. Fallback to Web Speech API
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = isEnglish ? 'en-US' : 'ru-RU';
    u.pitch = isMale ? 0.7 : 1.3;
    u.rate = isMale ? 0.92 : 1.05;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const langPrefix = isEnglish ? 'en' : 'ru';
      const genderMatch = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith(langPrefix) &&
          (isMale
            ? v.name.toLowerCase().includes('male') ||
              v.name.toLowerCase().includes('dmitry') ||
              v.name.toLowerCase().includes('david') ||
              v.name.toLowerCase().includes('guy')
            : v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('irina') ||
              v.name.toLowerCase().includes('zira') ||
              v.name.toLowerCase().includes('jenny'))
      );
      if (genderMatch) {
        u.voice = genderMatch;
      } else {
        const langMatch = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
        if (langMatch) u.voice = langMatch;
      }
    }
    window.speechSynthesis.speak(u);
  }

  static stop(): void {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {}
      this.activeSource = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
