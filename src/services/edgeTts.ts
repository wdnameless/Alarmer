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
  static async speak(text: string, voiceId: string = 'none'): Promise<void> {
    if (!voiceId || voiceId === 'none') return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    const isRussian = voiceId.startsWith('ru');
    u.lang = isRussian ? 'ru-RU' : 'en-US';

    // Differentiate male vs female voice profiles distinctly
    if (voiceId === 'ru-RU-DmitryNeural') {
      u.pitch = 0.72; // Deep authoritative male pitch
      u.rate = 0.95;
    } else if (voiceId === 'ru-RU-SvetlanaNeural') {
      u.pitch = 1.35; // Bright melodious female pitch
      u.rate = 1.02;
    } else if (voiceId === 'en-US-GuyNeural') {
      u.pitch = 0.8;
      u.rate = 0.98;
    } else if (voiceId === 'en-US-JennyNeural') {
      u.pitch = 1.3;
      u.rate = 1.05;
    }

    // Find the best native matching voice from installed system voices
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const targetGender = voiceId.includes('Dmitry') || voiceId.includes('Guy') ? 'male' : 'female';
      const langVoices = voices.filter((v) => v.lang.startsWith(isRussian ? 'ru' : 'en'));
      const genderMatch = langVoices.find((v) => v.name.toLowerCase().includes(targetGender));
      if (genderMatch) {
        u.voice = genderMatch;
      } else if (langVoices.length > 0) {
        u.voice = langVoices[0];
      }
    }

    window.speechSynthesis.speak(u);
  }

  static stop(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
