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
    // Get available voices dynamically
    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      await new Promise<void>((resolve) => {
        window.speechSynthesis.onvoiceschanged = () => resolve();
        setTimeout(resolve, 150);
      });
      voices = window.speechSynthesis.getVoices();
    }

    if (voices.length > 0) {
      const isMale = voiceId.includes('Dmitry') || voiceId.includes('Guy');
      const langPrefix = isRussian ? 'ru' : 'en';
      const matchingLang = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));

      // Try to find matching gender in name or voice URI
      const genderMatch = matchingLang.find((v) => {
        const n = v.name.toLowerCase();
        return isMale ? (n.includes('male') || n.includes('david') || n.includes('dmitry') || n.includes('pavel') || n.includes('george')) : (n.includes('female') || n.includes('zira') || n.includes('irina') || n.includes('svetlana') || n.includes('jenny'));
      });

      if (genderMatch) {
        u.voice = genderMatch;
      } else if (matchingLang.length > 0) {
        u.voice = matchingLang[0];
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
