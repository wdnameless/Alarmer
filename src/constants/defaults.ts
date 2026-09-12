import { AppSettings, WorkoutRoutine, AlarmItem } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark-neon',
  ai: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    systemPrompt: 'Ты элитный фитнес-тренер и ментор по тайм-менеджменту. Давай краткие, зажигательные инструкции, рекомендации по подходам и отдыху.',
  },
  soundEnabled: true,
  ttsEnabled: true,
  volume: 0.8,
  keepOnTop: true,
  compactMode: false,
};
export const DEFAULT_AI_SETTINGS = DEFAULT_SETTINGS.ai;

export const DEFAULT_ROUTINES: WorkoutRoutine[] = [
  {
    id: 'hiit-tabata',
    name: 'HIIT / Табата (4 мин)',
    description: 'Интенсивные интервалы: 20 сек работы, 10 сек отдыха',
    repeatCount: 8,
    steps: [
      { id: 's1', name: 'Спринт / Работа', durationSec: 20, type: 'work', voicePrompt: 'Взрывной темп! Работаем на максимум!' },
      { id: 's2', name: 'Отдых и дыхание', durationSec: 10, type: 'rest', voicePrompt: 'Глубокий вдох, 10 секунд отдыха.' }
    ]
  },
  {
    id: 'strength-intervals',
    name: 'Силовая круговая',
    description: 'Подходы по 45 секунд и 30 секунд отдыха',
    repeatCount: 4,
    steps: [
      { id: 'st1', name: 'Подход: Отжимания / Жим', durationSec: 45, type: 'work', voicePrompt: 'Начали подход! Следи за техникой.' },
      { id: 'st2', name: 'Переход и отдых', durationSec: 30, type: 'rest', voicePrompt: 'Отдых полминуты. Готовься к следующему упражнению.' },
      { id: 'st3', name: 'Подход: Приседания', durationSec: 45, type: 'work', voicePrompt: 'Приседания, держи спину ровно!' },
      { id: 'st4', name: 'Отдых между кругами', durationSec: 60, type: 'rest', voicePrompt: 'Минута отдыха. Попей воды.' }
    ]
  },
  {
    id: 'plank-challenge',
    name: 'Планка челлендж',
    description: 'Серия планок с короткими паузами',
    repeatCount: 3,
    steps: [
      { id: 'p1', name: 'Классическая планка', durationSec: 30, type: 'work', voicePrompt: 'Встаем в планку, корпус в одну линию!' },
      { id: 'p2', name: 'Пауза', durationSec: 15, type: 'rest', voicePrompt: 'Сбросили напряжение, 15 секунд.' },
      { id: 'p3', name: 'Боковая планка (левая)', durationSec: 30, type: 'work', voicePrompt: 'Боковая планка левый бок!' },
      { id: 'p4', name: 'Боковая планка (правая)', durationSec: 30, type: 'work', voicePrompt: 'Переворот на правый бок!' },
      { id: 'p5', name: 'Отдых', durationSec: 30, type: 'rest', voicePrompt: 'Отличная работа! Отдыхаем.' }
    ]
  }
];
export const DEFAULT_WORKOUT_ROUTINES = DEFAULT_ROUTINES;

export const DEFAULT_ALARMS: AlarmItem[] = [
  {
    id: 'alm-1',
    title: 'Утренняя зарядка и подъем',
    time: '07:00',
    days: [1, 2, 3, 4, 5],
    enabled: true,
    sound: 'beacon',
    voiceAnnouncement: 'Доброе утро! Время для утренней разминки и стакана воды.'
  },
  {
    id: 'alm-2',
    title: 'Вечерняя тренировка',
    time: '19:00',
    days: [1, 3, 5],
    enabled: true,
    sound: 'pulse',
    voiceAnnouncement: 'Пора на тренировку! Разомнись и включи нужный комплекс.'
  }
];
