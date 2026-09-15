import type { AISettings, ExerciseStep, Schedule, ScheduleStep } from '../types';
import { asArray, asNumber, asString, isRecord, oneOf } from '../types/guards';

/**
 * Turns pasted, human-written schedule text into a structured schedule.
 *
 * The user's actual ask is "drop in my training plan and get alarms out of it",
 * so this is the product's main entry point. It works with a BYOK model when a
 * key is configured and falls back to a deterministic heuristic parser when it
 * is not, so the feature never hard-fails on a missing key.
 */

export interface ParsedSchedule {
  name: string;
  days: number[];
  steps: ScheduleStep[];
  /** Assistant's short note to show alongside the draft. */
  note: string;
}

const SYSTEM_PROMPT = `Ты превращаешь свободный текст расписания (тренировки, режим дня) в СТРОГИЙ JSON.
Верни только JSON:
{
  "name": "Короткое название программы",
  "days": [1,2,3,4,5],
  "steps": [
    { "kind": "moment", "time": "07:00", "label": "Подъём", "voicePrompt": "Доброе утро! Подъём." },
    { "kind": "block", "time": "07:15", "label": "Разминка", "voicePrompt": "Начинаем разминку.",
      "exercises": [
        { "name": "Вращения шеи", "durationSec": 60, "kind": "prepare", "voicePrompt": "Медленные вращения шеи." },
        { "name": "Круги плечами", "durationSec": 60, "kind": "work" }
      ] }
  ],
  "note": "Одно предложение: что получилось."
}
Правила:
- days: 0=Вс, 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб. Пустой массив = каждый день. "по будням" = [1,2,3,4,5].
- "moment" — просто напоминание в момент времени. "block" — тренировка из нескольких упражнений с длительностями.
- time всегда "HH:MM" в 24 часах.
- durationSec — целое число секунд. Если в тексте "15 минут разминки" без деталей — сделай block из 2-3 упражнений суммарно на 15 минут.
- voicePrompt — короткая живая фраза на русском, которую произнесёт голосовой ассистент.
- Не выдумывай шаги, которых нет в тексте.`;

const WEEKDAYS: Record<string, number> = {
  вс: 0, воскресенье: 0,
  пн: 1, понедельник: 1,
  вт: 2, вторник: 2,
  ср: 3, среда: 3,
  чт: 4, четверг: 4,
  пт: 5, пятница: 5,
  сб: 6, суббота: 6,
};

function parseDaysFromText(text: string): number[] {
  const lower = text.toLowerCase();
  if (/каждый день|ежедневно|daily/.test(lower)) return [];
  if (/по будням|будни|будних|weekday/.test(lower)) return [1, 2, 3, 4, 5];
  if (/по выходным|выходны/.test(lower)) return [0, 6];

  const found = new Set<number>();
  for (const [needle, index] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`(^|[^а-яё])${needle}([^а-яё]|$)`, 'i').test(lower)) found.add(index);
  }
  return found.size > 0 ? [...found].sort((a, b) => a - b) : [];
}

/** "15 мин" / "1 час 30 минут" / "90 сек" -> seconds. */
function parseDuration(text: string): number | null {
  const hours = text.match(/(\d+)\s*(?:ч|час)/i);
  const minutes = text.match(/(\d+)\s*(?:мин|м\b)/i);
  const seconds = text.match(/(\d+)\s*(?:сек|с\b)/i);

  let total = 0;
  if (hours) total += Number(hours[1]) * 3600;
  if (minutes) total += Number(minutes[1]) * 60;
  if (seconds) total += Number(seconds[1]);
  return total > 0 ? total : null;
}

function sanitizeExercise(raw: unknown, index: number): ExerciseStep | null {
  if (!isRecord(raw)) return null;
  const duration = asNumber(raw.durationSec, 0);
  if (duration <= 0) return null;
  return {
    id: asString(raw.id, `ex_${Date.now()}_${index}`),
    name: asString(raw.name, `Упражнение ${index + 1}`),
    durationSec: Math.round(duration),
    kind: oneOf(raw.kind, ['work', 'rest', 'prepare', 'cooldown'] as const, 'work'),
    voicePrompt: typeof raw.voicePrompt === 'string' ? raw.voicePrompt : undefined,
  };
}

function sanitizeStep(raw: unknown, index: number): ScheduleStep | null {
  if (!isRecord(raw)) return null;
  const time = asString(raw.time, '');
  if (!/^\d{1,2}:\d{2}$/.test(time)) return null;
  const normalized = time.padStart(5, '0');
  const label = asString(raw.label, `Шаг ${index + 1}`);
  const voicePrompt = typeof raw.voicePrompt === 'string' ? raw.voicePrompt : undefined;

  if (raw.kind === 'block') {
    const exercises = asArray<unknown>(raw.exercises, [])
      .map(sanitizeExercise)
      .filter((e): e is ExerciseStep => e !== null);
    if (exercises.length === 0) return null;
    return {
      id: asString(raw.id, `step_${Date.now()}_${index}`),
      kind: 'block',
      time: normalized,
      label,
      exercises,
      voicePrompt,
    };
  }

  return {
    id: asString(raw.id, `step_${Date.now()}_${index}`),
    kind: 'moment',
    time: normalized,
    label,
    voicePrompt,
    sound: typeof raw.sound === 'string' ? raw.sound : undefined,
  };
}

/**
 * Heuristic parser used when no API key is configured.
 *
 * It reads time-stamped lines ("07:00 Подъём", "в 7:15 разминка 15 мин") and
 * turns each into a step, so the core flow still works offline.
 */
export function parseScheduleHeuristically(text: string): ParsedSchedule {
  const days = parseDaysFromText(text);
  const lines = text
    .split(/[\n;•·]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const steps: ScheduleStep[] = [];
  const timeRe = /(\d{1,2})[:.](\d{2})/;

  for (const line of lines) {
    const match = line.match(timeRe);
    if (!match) continue;

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) continue;
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    // Everything after the time is the description of what happens.
    const tail = line.slice((match.index ?? 0) + match[0].length).replace(/^[\s—–-]+/, '');
    const label = (tail || 'Напоминание').slice(0, 60);
    const duration = parseDuration(tail);

    const isTraining = /трениров|разминк|зарядк|растяжк|силов|кардио|планк|приседа|workout/i.test(tail);

    if (duration && isTraining) {
      // Split the total across a few movements so a block is genuinely runnable.
      const perExercise = Math.max(30, Math.round(duration / 3 / 15) * 15);
      const exercises: ExerciseStep[] = [
        { id: `ex_${steps.length}_a`, name: 'Разминка суставов', durationSec: perExercise, kind: 'prepare', voicePrompt: 'Разогреваем суставы.' },
        { id: `ex_${steps.length}_b`, name: 'Основная работа', durationSec: perExercise, kind: 'work', voicePrompt: 'Работаем в хорошем темпе.' },
        { id: `ex_${steps.length}_c`, name: 'Заминка', durationSec: perExercise, kind: 'cooldown', voicePrompt: 'Заминка, восстанавливаем дыхание.' },
      ];
      steps.push({
        id: `step_${steps.length}`,
        kind: 'block',
        time,
        label,
        exercises,
        voicePrompt: `Начинаем: ${label}`,
      });
    } else {
      steps.push({
        id: `step_${steps.length}`,
        kind: 'moment',
        time,
        label,
        voicePrompt: label,
      });
    }
  }

  steps.sort((a, b) => a.time.localeCompare(b.time));

  return {
    name: steps.length > 0 ? 'Моё расписание' : 'Новое расписание',
    days,
    steps,
    note:
      steps.length > 0
        ? `Разобрал текст без ИИ: ${steps.length} шаг(ов). Проверьте и сохраните.`
        : 'Не нашёл время в тексте. Укажите его в формате 07:00 — и я разберу расписание.',
  };
}

export class ScheduleParserService {
  /** Parses pasted text into a schedule draft, using the model when available. */
  static async parse(text: string, settings: AISettings): Promise<ParsedSchedule> {
    const trimmed = text.trim();
    if (!trimmed) {
      return { name: 'Пустое расписание', days: [], steps: [], note: 'Текст пуст.' };
    }

    if (!settings.apiKey || settings.apiKey.trim() === '') {
      return parseScheduleHeuristically(trimmed);
    }

    try {
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
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: trimmed },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) throw new Error(`AI error ${response.status}`);

      const data = await response.json();
      const content = asString(data?.choices?.[0]?.message?.content, '{}');
      const clean = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed: unknown = JSON.parse(clean);
      if (!isRecord(parsed)) throw new Error('unexpected shape');

      const steps = asArray<unknown>(parsed.steps, [])
        .map(sanitizeStep)
        .filter((s): s is ScheduleStep => s !== null);
      steps.sort((a, b) => a.time.localeCompare(b.time));

      // A model that returned nothing usable should not beat the offline parser.
      if (steps.length === 0) return parseScheduleHeuristically(trimmed);

      return {
        name: asString(parsed.name, 'Моё расписание'),
        days: asArray<unknown>(parsed.days, [])
          .filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6),
        steps,
        note: asString(parsed.note, `Готово: ${steps.length} шаг(ов).`),
      };
    } catch (e) {
      console.warn('Schedule parsing via model failed, using heuristics:', e);
      return parseScheduleHeuristically(trimmed);
    }
  }

  /** Promotes a parsed draft into a persisted schedule. */
  static toSchedule(draft: ParsedSchedule, sourceText: string): Schedule {
    return {
      id: `sched_${Date.now()}`,
      name: draft.name,
      days: draft.days,
      enabled: true,
      steps: draft.steps,
      sourceText,
      createdAt: new Date().toISOString(),
    };
  }

  /** True when the text looks like a schedule rather than a UI command. */
  static looksLikeSchedule(text: string): boolean {
    const hasTime = /\d{1,2}[:.]\d{2}/.test(text);
    const isLong = text.trim().split(/\s+/).length > 4;
    const hasNewline = text.includes('\n');
    const scheduleWords = /расписан|трениров|режим|план|программ|подъ[её]м|разминк|зарядк/i.test(text);

    // A short UI command with a time inside it must not become a schedule.
    if (!hasTime) return false;
    return isLong || hasNewline || scheduleWords;
  }
}
