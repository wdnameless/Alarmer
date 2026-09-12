import { AISettings, WorkoutRoutine } from '../types';

export class AIService {
  static async generateWorkout(
    prompt: string,
    settings: AISettings
  ): Promise<WorkoutRoutine> {
    if (!settings.apiKey) {
      throw new Error('Укажите API ключ в настройках AI (BYOK).');
    }

    const systemPrompt = `Ты персональный фитнес-тренер и эксперт по тренировкам и интервальным таймерам.
Пользователь просит составить тренировку или комплекс упражнений.
Тебе необходимо вернуть СТРОГИЙ JSON формат без лишнего текста и markdown форматирования:
{
  "id": "generated-${Date.now()}",
  "name": "Название тренировки",
  "repeatCount": 3,
  "steps": [
    {
      "id": "step-1",
      "name": "Название упражнения или отдыха",
      "durationSec": 45,
      "type": "work", // "work" | "rest" | "prepare" | "cooldown"
      "voicePrompt": "Короткая фраза озвучки для TTS, например: Начинаем отжимания!"
    }
  ]
}
Длительности должны быть разумными в секундах (например 30-45 сек работа, 15-30 сек отдых).`;

    const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Пустой ответ от AI модели.');
    }

    // Clean up potential markdown formatting code blocks ```json ... ```
    const cleanedJson = rawContent
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    try {
      const parsed = JSON.parse(cleanedJson) as WorkoutRoutine;
      return parsed;
    } catch (e) {
      console.error('Failed to parse AI response:', rawContent);
      throw new Error('Не удалось разобрать JSON тренировки от AI.');
    }
  }

  static async analyzeProgressAndAdapt(
    historySummary: string,
    currentRoutine: WorkoutRoutine,
    settings: AISettings
  ): Promise<{ advice: string; suggestedRoutine?: WorkoutRoutine }> {
    if (!settings.apiKey) {
      throw new Error('API ключ не задан.');
    }

    const systemPrompt = `Ты AI тренер-аналитик. Пользователь передает отчет о выполненной тренировке и текущий план.
Верни JSON:
{
  "advice": "Совет по восстановлению, нагрузке и технике",
  "suggestedRoutine": null // или адаптированная WorkoutRoutine если нужно усложнить/облегчить
}`;

    const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `История: ${historySummary}\nТекущий план: ${JSON.stringify(currentRoutine)}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API Error: ${errText}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

    return JSON.parse(cleaned);
  }
}
