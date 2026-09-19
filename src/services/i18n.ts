import { StoreService } from './store';

/**
 * Interface language.
 *
 * The app is Russian-first: the schedule parser, the AI prompts and every voice
 * line are written for Russian, so only the navigation chrome is translated.
 * That boundary is deliberate — English mode relabels the app you navigate but
 * does not pretend the model or the assistant speaks English. The keys for the
 * removed fitness/stopwatch modules are gone, since a translation for a screen
 * that no longer exists is just a lie waiting to be read.
 */

export type Language = 'en' | 'ru';

export interface Translations {
  dashboard: string;
  settings: string;
  today: string;
  todayTitle: string;
  timer: string;
  timerTitle: string;
  tasks: string;
  tasksTitle: string;
  alarms: string;
  alarmsTitle: string;
  notes: string;
  notesTitle: string;
  stats: string;
  statsTitle: string;
  aiCopilot: string;
  start: string;
  pause: string;
  reset: string;
  language: string;
  systemSettings: string;
  settingsDesc: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    dashboard: 'Dashboard',
    settings: 'Settings',
    today: 'Today',
    todayTitle: 'What is now and what is next',
    timer: 'Timer',
    timerTitle: 'Timer',
    tasks: 'Tasks',
    tasksTitle: 'What needs doing',
    alarms: 'Alarms',
    alarmsTitle: 'Alarms',
    notes: 'Notes',
    notesTitle: 'Quick scratchpad',
    stats: 'Journal',
    statsTitle: 'Focus Journal & Budget',
    aiCopilot: 'AI Co-Pilot',
    start: 'Start',
    pause: 'Pause',
    reset: 'Reset',
    language: 'Interface language',
    systemSettings: 'System settings',
    settingsDesc: 'Voice, models and interface parameters',
  },
  ru: {
    dashboard: 'Дашборд',
    settings: 'Настройки',
    today: 'Сегодня',
    todayTitle: 'Что сейчас и что дальше',
    timer: 'Таймер',
    timerTitle: 'Таймер',
    tasks: 'Задачи',
    tasksTitle: 'Что нужно сделать',
    alarms: 'Алармы',
    alarmsTitle: 'Будильники',
    notes: 'Заметки',
    notesTitle: 'Быстрые заметки',
    stats: 'Журнал',
    statsTitle: 'Журнал фокуса и бюджет',
    aiCopilot: 'AI Co-Pilot',
    start: 'Старт',
    pause: 'Пауза',
    reset: 'Сброс',
    language: 'Язык интерфейса',
    systemSettings: 'Настройки системы',
    settingsDesc: 'Озвучка, нейросети и параметры интерфейса',
  },
};

export class I18nService {
  static getLang(): Language {
    return StoreService.getPreference('alarmer_lang', 'ru') as Language;
  }

  static setLang(lang: Language) {
    StoreService.setPreference('alarmer_lang', lang);
    this.listeners.forEach((listener) => listener());
  }

  private static listeners = new Set<() => void>();

  /**
   * Notifies when the language changes.
   *
   * The chrome is rendered from `t()` at the top of the tree, so switching the
   * language has to re-render it — a stored preference alone leaves the tab
   * labels in the previous language until something else happens to redraw them.
   */
  static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  static t(): Translations {
    return TRANSLATIONS[this.getLang()];
  }
}
