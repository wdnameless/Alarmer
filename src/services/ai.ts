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

  private static async requestChat(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    settings: AISettings
  ): Promise<string> {
    if (!settings.apiKey) {
      throw new Error('Укажите API ключ в настройках AI (BYOK).');
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
}
