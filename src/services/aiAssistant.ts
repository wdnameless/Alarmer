import { AICompilerService } from './aiCompiler';
import { AISettings, DynamicUIConfig, AlarmItem, WorkoutRoutine } from '../types';

export interface AIExecutionResult {
  message: string;
  ui?: Partial<DynamicUIConfig>;
  alarms?: AlarmItem[];
  workout?: WorkoutRoutine;
  timerMinutes?: number;
  unsupportedReason?: string;
}

export class AIAssistantService {
  /**
   * Universal intent processor: handles natural language input from user,
   * compiles mutations, modifies timer / UI / alarms / workout,
   * or explicitly rejects requests that are unsupported.
   */
  static async processUserInput(
    query: string,
    currentUi: DynamicUIConfig,
    settings: AISettings
  ): Promise<AIExecutionResult> {
    const q = query.trim();
    if (!q) {
      return { message: 'Запрос пуст.' };
    }

    const lower = q.toLowerCase();

    // 1. Direct timer commands (e.g. "поставь таймер на 15 минут", "таймер 45м")
    const timerMatch = lower.match(/(?:таймер|поставь таймер|запусти таймер|timer)\s+(?:на\s+)?(\d+)\s*(?:мин|минут|m|min)?/i);
    if (timerMatch && timerMatch[1]) {
      const minutes = parseInt(timerMatch[1], 10);
      if (minutes > 0 && minutes <= 180) {
        return {
          message: `Установил таймер на ${minutes} мин.`,
          timerMinutes: minutes
        };
      }
    }

    // 2. Direct alarm commands (e.g. "будильник на 07:30")
    const timeMatch = lower.match(/(?:будильник|напомни|разбуди|alarm)\s+(?:на\s+)?([0-2]?[0-9]:[0-5][0-9])/i);
    if (timeMatch && timeMatch[1]) {
      const t = timeMatch[1].padStart(5, '0');
      const newAlarm: AlarmItem = {
        id: `alm_${Date.now()}`,
        title: `Будильник ${t}`,
        label: `Будильник ${t}`,
        time: t,
        days: [1, 2, 3, 4, 5],
        enabled: true,
        sound: 'gentle',
        voicePrompt: `Время активности: ${t}. Подъем!`
      };
      return {
        message: `Будильник установлен на ${t}`,
        alarms: [newAlarm]
      };
    }

    // 3. Check for out-of-scope / impossible requests
    const unsupportedKeywords = [
      'погода', 'weather', 'биткоин', 'bitcoin', 'купи', 'закажи', 'переведи деньги',
      'удали windows', 'напиши код', 'взломай', 'удали систему', 'открой браузер',
      'включи музыку', 'spotify', 'youtube', 'игры', 'играть'
    ];
    for (const kw of unsupportedKeywords) {
      if (lower.includes(kw)) {
        return {
          message: `Такая возможность («${kw}») в приложении Alarmer не предусмотрена. Я управляю таймером, будильниками, тренировками, темами и звуками.`,
          unsupportedReason: `Запрос «${kw}» вне возможностей Alarmer`
        };
      }
    }

    // 4. Delegate to AI Compiler (UI transformations, workouts, complex schedules)
    try {
      const mutation = await AICompilerService.compileUserIntent(q, currentUi, settings);
      return {
        message: mutation.explanation || 'Изменения успешно применены!',
        ui: mutation.ui,
        alarms: mutation.alarms,
        workout: mutation.workout
      };
    } catch {
      return {
        message: 'Не удалось обработать запрос. Попробуйте сформулировать иначе (например: «Поставь таймер на 20 минут» или «Сделай тему AMOLED»).'
      };
    }
  }
}
