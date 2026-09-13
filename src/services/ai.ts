import { AISettings, WorkoutRoutine, AlarmItem } from '../types';

export interface AIPlanResult {
  message: string;
  alarms?: AlarmItem[];
  workout?: WorkoutRoutine;
}

export class AIService {
  private static cleanJson(raw: string): string {
    return raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
  }
  /**
   * Fetches available models from the OpenAI-compatible API endpoint
   */
  static async fetchModels(baseUrl: string, apiKey: string): Promise<string[]> {
    if (!apiKey || !apiKey.trim()) {
      return ['gpt-4o-mini', 'gpt-4o', 'deepseek-chat', 'claude-3-5-sonnet-20241022'];
    }
    const url = `${baseUrl.replace(/\/+$/, '')}/models`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Ошибка загрузки моделей (${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        const models = data.data
          .map((m: { id?: string }) => m?.id)
          .filter((id: unknown): id is string => typeof id === 'string');
        return models.sort();
      }
      return ['gpt-4o-mini', 'gpt-4o'];
    } catch (err) {
      console.warn('Failed to fetch models:', err);
      throw err;
    }
  }


  private static async requestChat(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    settings: AISettings
  ): Promise<string> {
    // If no API key is provided, perform instant heuristic local parsing so user can test out of the box!
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      const userMsg = messages.find((m) => m.role === 'user')?.content || '';
      return this.localFallbackParser(userMsg);
    }
    const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Ошибка AI API (${response.status}): ${errBody || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Пустой ответ от AI модели.');
    }
    return content;
  }

  /**
   * Generates a workout routine from user prompt
   */
  static async generateWorkout(
    prompt: string,
    settings: AISettings
  ): Promise<WorkoutRoutine> {
    const systemPrompt = `Ты персональный фитнес-тренер и эксперт по тренировкам и интервальным таймерам.
Пользователь просит сгенерировать тренировку. Верни СТРОГИЙ JSON следующей структуры:
{
  "name": "Название тренировки",
  "description": "Краткое мотивирующее описание",
  "rounds": 3,
  "steps": [
    {
      "name": "Разминка шеи и плеч",
      "duration": 45,
      "type": "warmup",
      "voiceAnnouncement": "Разминка шеи и плеч, круговые вращения"
    },
    {
      "name": "Бёрпи",
      "duration": 30,
      "type": "work",
      "voiceAnnouncement": "Бёрпи, максимальный темп!"
    },
    {
      "name": "Отдых",
      "duration": 15,
      "type": "rest",
      "voiceAnnouncement": "Отдыхаем, восстанавливаем дыхание"
    }
  ]
}
Допустимые типы: "warmup" (разминка), "work" (работа), "rest" (отдых), "cooldown" (заминка).
Длительности должны быть разумными в секундах (например 30-45 сек работа, 15-30 сек отдых).`;

    const content = await this.requestChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      settings
    );

    const parsed = JSON.parse(this.cleanJson(content));
    return {
      ...parsed,
      id: `ai-workout-${Date.now()}`,
    };
  }

  /**
   * Generates one or more Alarms based on user instructions
   * E.g. "Поставь мне будильник на утреннюю пробежку в 7:00 и на прием витаминов в 14:00"
   */
  static async generateAlarms(
    prompt: string,
    settings: AISettings
  ): Promise<AlarmItem[]> {
    const systemPrompt = `Ты умный ассистент тайм-менеджмента и будильников.
Пользователь передает инструкцию по расстановке будильников и напоминаний.
Проанализируй время, дни недели и цель каждого напоминания.
Верни СТРОГИЙ JSON:
{
  "alarms": [
    {
      "title": "Утренняя пробежка",
      "time": "07:00",
      "days": [1, 2, 3, 4, 5],
      "enabled": true,
      "sound": "energetic",
      "voicePrompt": "Доброе утро! Время надевать кроссовки и выходить на пробежку."
    }
  ]
}
Правила:
- "time": обязательно формат "HH:MM" (24 часа, например "07:30", "19:00", "22:15").
- "days": массив чисел дней недели, где 0=Вс, 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб. Если каждый день: [0, 1, 2, 3, 4, 5, 6]. Если один раз: [].
- "sound": один из: "gentle", "chime", "radar", "energetic", "beep".
- "voicePrompt": воодушевляющая фраза на русском языке, которую синтезатор речи произнесет вслух при срабатывании.`;

    const content = await this.requestChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      settings
    );

    const parsed = JSON.parse(this.cleanJson(content));
    const rawList = Array.isArray(parsed.alarms) ? parsed.alarms : [];

    return rawList.map((item: any, idx: number) => ({
      id: `ai-alarm-${Date.now()}-${idx}`,
      title: item.title || item.label || 'Будильник',
      label: item.title || item.label || 'Будильник',
      time: item.time || '08:00',
      days: Array.isArray(item.days) ? item.days : [1, 2, 3, 4, 5],
      enabled: item.enabled ?? true,
      sound: item.sound || 'gentle',
      voicePrompt: item.voicePrompt || item.voiceAnnouncement || item.title || 'Пора действовать!',
      voiceAnnouncement: item.voicePrompt || item.voiceAnnouncement || item.title || 'Пора действовать!',
    }));
  }

  /**
   * Universal Orchestrator: parses user prompt to determine if they want:
   * - Workout routine
   * - Alarms schedule
   * - Combined plan (Workout + matching scheduled alarms)
   */
  static async orchestratePlan(
    prompt: string,
    settings: AISettings
  ): Promise<AIPlanResult> {
    const systemPrompt = `Ты главный ИИ-распорядитель умного фитнес-будильника "Alarmer".
Пользователь обращается на естественном языке. Он может попросить:
1. Расставить расписание будильников для тренировок или дня (например "Вот моя тренировка, расставь будильники на подъем, тренировку и растяжку").
2. Создать программу тренировки.
3. Сделать и то, и другое одновременно.

Верни СТРОГИЙ JSON:
{
  "message": "Краткий ответ пользователю о том, что было настроено",
  "hasAlarms": true,
  "alarms": [
    {
      "title": "Подъем и разминка",
      "time": "06:45",
      "days": [1, 2, 3, 4, 5],
      "enabled": true,
      "sound": "energetic",
      "voicePrompt": "Доброе утро! Через 15 минут начинается тренировка."
    },
    {
      "title": "Основная тренировка",
      "time": "07:00",
      "days": [1, 2, 3, 4, 5],
      "enabled": true,
      "sound": "radar",
      "voicePrompt": "Время силовой тренировки! Запускай таймер."
    }
  ],
  "hasWorkout": true,
  "workout": {
    "name": "Утренний заряд энергии",
    "description": "Бодрящий комплекс на все тело",
    "rounds": 2,
    "steps": [
      {
        "name": "Суставная гимнастика",
        "duration": 60,
        "type": "warmup",
        "voiceAnnouncement": "Начинаем с суставной гимнастики"
      },
      {
        "name": "Приседания",
        "duration": 40,
        "type": "work",
        "voiceAnnouncement": "Приседания в среднем темпе"
      },
      {
        "name": "Отдых",
        "duration": 20,
        "type": "rest",
        "voiceAnnouncement": "Отдых 20 секунд"
      }
    ]
  }
}
Если будильники не требуются, поставь "hasAlarms": false и "alarms": [].
Если тренировка не требуется, поставь "hasWorkout": false и "workout": null.`;

    const content = await this.requestChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      settings
    );

    const parsed = JSON.parse(this.cleanJson(content));
    const result: AIPlanResult = {
      message: parsed.message || 'План успешно сформирован!',
    };

    if (parsed.hasAlarms && Array.isArray(parsed.alarms)) {
      result.alarms = parsed.alarms.map((item: any, idx: number) => ({
        id: `ai-alarm-${Date.now()}-${idx}`,
        title: item.title || item.label || 'Будильник',
        label: item.title || item.label || 'Будильник',
        time: item.time || '08:00',
        days: Array.isArray(item.days) ? item.days : [1, 2, 3, 4, 5],
        enabled: item.enabled ?? true,
        sound: item.sound || 'gentle',
        voicePrompt: item.voicePrompt || item.voiceAnnouncement || item.title || 'Пора действовать!',
        voiceAnnouncement: item.voicePrompt || item.voiceAnnouncement || item.title || 'Пора действовать!',
      }));
    }

    if (parsed.hasWorkout && parsed.workout) {
      result.workout = {
        ...parsed.workout,
        id: `ai-workout-${Date.now()}`,
      };
    }

    return result;
  }
  private static localFallbackParser(prompt: string): string {
    const lower = prompt.toLowerCase();
    const timeMatches = prompt.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g);

    const alarms = [];
    if (timeMatches && timeMatches.length > 0) {
      for (const t of timeMatches) {
        const [hourStr, minStr] = t.split(':');
        const h = parseInt(hourStr, 10);
        const isMorning = h < 12;
        alarms.push({
          title: isMorning ? 'Утренняя активность' : 'Вечерняя активность',
          time: `${hourStr.padStart(2, '0')}:${minStr}`,
          days: [1, 2, 3, 4, 5],
          enabled: true,
          sound: 'gentle',
          voicePrompt: `Время для активности: ${t}! Выполняем запланированное.`,
        });
      }
    } else {
      alarms.push({
        title: 'Запланированная тренировка',
        time: '08:00',
        days: [1, 2, 3, 4, 5],
        enabled: true,
        sound: 'gentle',
        voicePrompt: 'Доброе утро! Время для тренировки.',
      });
    }

    const isTabata = lower.includes('табат');
    const isPomodoro = lower.includes('помодоро');

    let steps = [
      { name: 'Разминка', duration: 180, type: 'warmup', voiceAnnouncement: 'Начинаем суставную разминку' },
      { name: 'Приседания', duration: 45, type: 'work', voiceAnnouncement: 'Приседания, 45 секунд, держим темп' },
      { name: 'Отдых', duration: 15, type: 'rest', voiceAnnouncement: 'Отдых 15 секунд' },
      { name: 'Планка', duration: 45, type: 'work', voiceAnnouncement: 'Планка, держим корпус прямо' },
      { name: 'Заминка', duration: 120, type: 'cooldown', voiceAnnouncement: 'Отличная работа! Переходим к растяжке' },
    ];

    if (isTabata) {
      steps = [
        { name: 'Интенсивная работа', duration: 20, type: 'work', voiceAnnouncement: 'Максимальное ускорение, 20 секунд!' },
        { name: 'Быстрый отдых', duration: 10, type: 'rest', voiceAnnouncement: 'Отдых 10 секунд' },
      ];
    } else if (isPomodoro) {
      steps = [
        { name: 'Фокус-работа', duration: 1500, type: 'work', voiceAnnouncement: 'Фокусируемся на задаче, 25 минут' },
        { name: 'Перерыв', duration: 300, type: 'rest', voiceAnnouncement: 'Время отдохнуть и сделать разминку' },
      ];
    }

    return JSON.stringify({
      name: isTabata ? 'Табата комплекс' : isPomodoro ? 'Помодоро сессия' : 'Тренировка по запросу',
      description: prompt,
      repeatCount: isTabata ? 8 : isPomodoro ? 4 : 3,
      steps,
      hasAlarms: true,
      alarms,
      hasWorkout: true,
      workout: {
        name: isTabata ? 'Табата комплекс' : isPomodoro ? 'Помодоро сессия' : 'Тренировка по запросу',
        description: prompt,
        repeatCount: isTabata ? 8 : isPomodoro ? 4 : 3,
        steps: steps.map((s, idx) => ({
          id: `step-${idx}`,
          name: s.name,
          durationSec: s.duration,
          type: s.type,
          voicePrompt: s.voiceAnnouncement,
        })),
      },
      summary: `План составлен: ${alarms.length} будильника(ов) и комплекс «${isTabata ? 'Табата' : 'Тренировка'}» на ${steps.length} этапов.`,
    });
  }
}
