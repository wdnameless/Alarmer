export type Language = 'en' | 'ru';

export interface Translations {
  dashboard: string;
  aiCopilot: string;
  settings: string;
  timer: string;
  fitness: string;
  laps: string;
  alarms: string;
  start: string;
  pause: string;
  reset: string;
  voicePrompt: string;
  language: string;
  audioSettings: string;
  uiClicks: string;
  clockTicks: string;
  clickVolume: string;
  alarmVolume: string;
  soundProfile: string;
  aiSettings: string;
  apiKey: string;
  save: string;
  testVoice: string;
  systemSettings: string;
  settingsDesc: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    dashboard: 'Dashboard',
    aiCopilot: 'AI Co-Pilot',
    settings: 'Settings',
    timer: 'Timer',
    fitness: 'Fitness',
    laps: 'Stopwatch',
    alarms: 'Alarms',
    start: 'Start',
    pause: 'Pause',
    reset: 'Reset',
    voicePrompt: 'Cloud Neural Voice',
    language: 'Language',
    audioSettings: 'Sound Effects & Clicks',
    uiClicks: 'Button & Tab Clicks',
    clockTicks: 'Second-by-second Clock Tick',
    clickVolume: 'Click & UI Volume',
    alarmVolume: 'Alarm & Alert Volume',
    soundProfile: 'Click Sound Profile',
    aiSettings: 'AI Configuration (BYOK)',
    apiKey: 'API Key',
    save: 'Save',
    testVoice: 'Test Voice',
    systemSettings: 'System Settings',
    settingsDesc: 'Voice audio, AI models and interface parameters',
  },
  ru: {
    dashboard: 'Дашборд',
    aiCopilot: 'AI Co-Pilot',
    settings: 'Настройки',
    timer: 'Таймер',
    fitness: 'Фитнес',
    laps: 'Круги',
    alarms: 'Алармы',
    start: 'Старт',
    pause: 'Пауза',
    reset: 'Сброс',
    voicePrompt: 'Голосовая озвучка (Cloud Neural TTS)',
    language: 'Язык интерфейса',
    audioSettings: 'Звуковые эффекты и клики',
    uiClicks: 'Клики кнопок и вкладок',
    clockTicks: 'Тиканье секунд часов (каждую сек)',
    clickVolume: 'Громкость кликов интерфейса',
    alarmVolume: 'Громкость будильников и таймера',
    soundProfile: 'Профиль звука кликов',
    aiSettings: 'Подключение ИИ (BYOK / OpenAI-compatible)',
    apiKey: 'API Ключ',
    save: 'Сохранить',
    testVoice: 'Тест голоса',
    systemSettings: 'Настройки системы',
    settingsDesc: 'Озвучка, нейросети и параметры интерфейса',
  },
};

export class I18nService {
  static getLang(): Language {
    return (localStorage.getItem('alarmer_lang') as Language) || 'ru';
  }

  static setLang(lang: Language) {
    localStorage.setItem('alarmer_lang', lang);
  }

  static t(): Translations {
    return TRANSLATIONS[this.getLang()];
  }
}
