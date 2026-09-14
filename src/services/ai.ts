import { AISettings, AlarmItem } from '../types';
import { asArray, asBoolean, asString, isRecord } from '../types/guards';

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
    // Without an API key, fall back to instant local heuristics so alarms still work offline.
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
   * Generates one or more alarms from a natural-language instruction.
   * E.g. "Поставь будильник на пробежку в 7:00 и на витамины в 14:00"
   */
  static async generateAlarms(prompt: string, settings: AISettings): Promise<AlarmItem[]> {
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

    const parsed = JSON.parse(this.cleanJson(content)) as { alarms?: unknown };
    const rawList = Array.isArray(parsed.alarms) ? parsed.alarms : [];

    return rawList.map((item: unknown, idx: number) => {
      const a = isRecord(item) ? item : {};
      const title = asString(a.title, asString(a.label, 'Будильник'));
      const days = asArray<unknown>(a.days, [1, 2, 3, 4, 5]).filter(
        (d): d is number => typeof d === 'number' && d >= 0 && d <= 6,
      );
      const voicePrompt = asString(
        a.voicePrompt,
        asString(a.voiceAnnouncement, title),
      );
      return {
        id: `ai-alarm-${Date.now()}-${idx}`,
        title,
        label: title,
        time: asString(a.time, '08:00'),
        days,
        enabled: asBoolean(a.enabled, true),
        sound: asString(a.sound, 'gentle'),
        voicePrompt,
        voiceAnnouncement: voicePrompt,
      };
    });
  }

  /**
   * Offline heuristic alarm parser used when no API key is configured.
   * Returns a JSON string shaped like the LLM response so callers stay uniform.
   */
  private static localFallbackParser(prompt: string): string {
    const lower = prompt.toLowerCase();

    if (
      lower.includes('что ты умеешь') ||
      lower.includes('что умеешь') ||
      lower.includes('помощь') ||
      lower.includes('help') ||
      lower.includes('возможности')
    ) {
      return JSON.stringify({
        alarms: [],
        summary:
          'Я — AI Co-Pilot платформы Alarmer. Могу расставлять умные будильники, настраивать таймеры и менять интерфейс приложения.',
      });
    }

    const timeMatches = prompt.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g);
    const alarms: Array<{
      title: string;
      time: string;
      days: number[];
      enabled: boolean;
      sound: string;
      voicePrompt: string;
    }> = [];

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

    return JSON.stringify({
      alarms,
      summary: `Расписание составлено: ${alarms.length} будильника(ов).`,
    });
  }
}
