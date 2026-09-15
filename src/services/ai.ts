import { AISettings, AlarmItem } from '../types';
import { asArray, asBoolean, asString, isRecord, oneOf } from '../types/guards';
import { AIGateway } from './aiGateway';

export class AIService {
  /**
   * Generates one or more alarms from a natural-language instruction.
   * E.g. "Поставь будильник на пробежку в 7:00 и на витамины в 14:00"
   *
   * Returns the alarms plus, when the model could not be reached, the reason —
   * the caller reports it rather than pretending the offline guess was the
   * model's answer.
   */
  static async generateAlarms(
    prompt: string,
    settings: AISettings,
  ): Promise<{ alarms: AlarmItem[]; error: string | null }> {
    const systemPrompt = `Ты умный ассистент тайм-менеджмента и будильников.
Пользователь передает инструкцию по расстановке будильников и напоминаний.
Проанализируй время, дни недели и цель каждого напоминания.
Верни СТРОГИЙ JSON:
{
  "alarms": [
    {
      "title": "Утренняя пробежка",
      "time": "07:00",
      "repeat": "days",
      "days": [1, 2, 3, 4, 5],
      "enabled": true,
      "sound": "energetic",
      "voicePrompt": "Доброе утро! Время надевать кроссовки и выходить на пробежку."
    }
  ]
}
Правила:
- "time": обязательно формат "HH:MM" (24 часа, например "07:30", "19:00", "22:15").
- "repeat": "once" — сработать один раз и выключиться; "daily" — каждый день; "days" — только в дни из "days".
- "days": массив дней недели, где 0=Вс, 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб. Заполняй только при "repeat": "days". "по будням" = [1,2,3,4,5].
- "sound": один из: "gentle", "chime", "radar", "energetic", "beep".
- "voicePrompt": воодушевляющая фраза на русском языке, которую синтезатор речи произнесет вслух при срабатывании.`;

    const { value, error } = await AIGateway.requestJson({
      system: systemPrompt,
      user: prompt,
      baseUrl: settings.baseUrl,
      model: settings.model || 'gpt-4o-mini',
    });

    if (error) {
      // The offline parser still produces something usable, but the user is
      // told it was the fallback and why.
      const parsed = JSON.parse(this.localFallbackParser(prompt)) as { alarms?: unknown };
      return { alarms: this.toAlarms(parsed.alarms), error };
    }

    return { alarms: this.toAlarms(value.alarms), error: null };
  }

  /** Validates whatever the model returned into real alarms. */
  private static toAlarms(raw: unknown): AlarmItem[] {
    return asArray<unknown>(raw, []).map((item: unknown, idx: number) => {
      const a = isRecord(item) ? item : {};
      const title = asString(a.title, asString(a.label, 'Будильник'));
      const days = asArray<unknown>(a.days, [1, 2, 3, 4, 5]).filter(
        (d): d is number => typeof d === 'number' && d >= 0 && d <= 6,
      );
      const voicePrompt = asString(a.voicePrompt, asString(a.voiceAnnouncement, title));
      return {
        id: `ai-alarm-${Date.now()}-${idx}`,
        title,
        label: title,
        time: asString(a.time, '08:00'),
        days,
        repeat: oneOf(a.repeat, ['once', 'daily', 'days'] as const, 'days' as const),
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
      repeat: AlarmItem['repeat'];
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
          repeat: 'days',
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
        repeat: 'days',
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
