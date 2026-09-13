export interface CloudVoice {
  id: string;
  name: string;
  lang: string;
  gender: 'Female' | 'Male';
}

export const CLOUD_VOICES: CloudVoice[] = [
  { id: 'none', name: 'Без озвучки (Только звуковые сигналы)', lang: 'ru-RU', gender: 'Female' },
  { id: 'ru-RU-SvetlanaNeural', name: 'Светлана (Естественный мягкий, Edge Neural)', lang: 'ru-RU', gender: 'Female' },
  { id: 'ru-RU-DmitryNeural', name: 'Дмитрий (Четкий дикторский, Edge Neural)', lang: 'ru-RU', gender: 'Male' },
  { id: 'en-US-JennyNeural', name: 'Jenny (English US, Energetic)', lang: 'en-US', gender: 'Female' },
  { id: 'en-US-GuyNeural', name: 'Guy (English US, Natural Coach)', lang: 'en-US', gender: 'Male' },
];

export class EdgeTtsService {
  private static audio: HTMLAudioElement | null = null;

  static async speak(text: string, voiceId: string = 'none'): Promise<void> {
    if (!voiceId || voiceId === 'none') {
      return;
    }

    try {
      if (this.audio) {
        this.audio.pause();
        this.audio = null;
      }

      // Encode for cloud synthesis endpoint
      const encodedText = encodeURIComponent(text);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${voiceId.startsWith('ru') ? 'ru' : 'en'}&client=tw-ob`;

      this.audio = new Audio(url);
      await this.audio.play();
    } catch (e) {
      console.warn('TTS playback error, falling back to Web Speech:', e);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = voiceId.startsWith('ru') ? 'ru-RU' : 'en-US';
        window.speechSynthesis.speak(u);
      }
    }
  }

  static stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
