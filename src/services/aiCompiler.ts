import { AISettings, DynamicUIConfig, AlarmItem, WorkoutRoutine } from '../types';

export interface AIPlatformMutation {
  type: 'ui_change' | 'alarm_schedule' | 'workout_plan' | 'hybrid';
  explanation: string;
  ui?: Partial<DynamicUIConfig>;
  alarms?: AlarmItem[];
  workout?: WorkoutRoutine;
  autoApply: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  mutation?: AIPlatformMutation;
}

export class AICompilerService {
  private static readonly SYSTEM_PROMPT = `Ты — ведущий AI-Дизайнер и Архитектор интерфейса приложения Alarmer.
Твоя задача — трансформировать интерфейс, цвета, шрифты, расположение элементов и логику приложения строго по запросу пользователя.

ВНИМАНИЕ: Не выбирай фиксированные шаблоны! Сгенерируй УНИКАЛЬНЫЙ гармоничный дизайн с hex-кодами, подходящими под настроение запроса.

Отвечай ИСКЛЮЧИТЕЛЬНО в формате JSON со следующей структурой:
{
  "type": "ui" | "alarm" | "workout" | "hybrid",
  "explanation": "Короткое понятное объяснение того, что изменилось на русском языке (1-2 предложения)",
  "autoApply": true,
  "ui": {
    "colors": {
      "bg": "#hex",
      "surface": "#hex",
      "cardBg": "#hex",
      "border": "#hex",
      "text": "#hex",
      "subtext": "#hex",
      "accent": "#hex",
      "accentGlow": "#hex",
      "ringTrack": "#hex",
      "ringProgress": "#hex",
      "ticks": "#hex"
    },
    "typography": {
      "fontFamily": "system-ui" | "mono" | "cyber" | "serif",
      "timeScale": 1.0
    },
    "dial": {
      "size": 220,
      "showTicks": true,
      "tickLength": "short" | "normal" | "long",
      "glowIntensity": "none" | "subtle" | "high"
    },
    "layout": {
      "showPresetButtons": true,
      "showSubtimer": true,
      "buttonStyle": "rounded" | "square" | "pill",
      "glassmorphism": true,
      "contentAlignment": "center" | "top" | "compact",
      "widgetsOrder": ["dial", "subtimer", "presets", "controls"]
    }
  },
  "alarms": [
    {
      "id": "alarm_1",
      "title": "Название",
      "label": "Название",
      "time": "08:00",
      "days": [1,2,3,4,5],
      "enabled": true,
      "sound": "gentle",
      "voicePrompt": "Текст голосового напоминания"
    }
  ],
  "workout": {
    "id": "workout_1",
    "name": "Название комплекса",
    "repeatCount": 3,
    "steps": [
      { "id": "s1", "name": "Разминка", "durationSec": 60, "type": "prepare", "voicePrompt": "Начинаем разминку" },
      { "id": "s2", "name": "Упражнение", "durationSec": 45, "type": "work", "voicePrompt": "Работаем активно" },
      { "id": "s3", "name": "Отдых", "durationSec": 15, "type": "rest", "voicePrompt": "Отдых" }
    ]
  }
}`;

  static async compileUserIntent(
    prompt: string,
    currentUi: DynamicUIConfig,
    settings: AISettings
  ): Promise<AIPlatformMutation> {
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      return this.offlineFallbackCompiler(prompt, currentUi);
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
            { role: 'system', content: this.SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Текущий конфиг UI:\n${JSON.stringify(currentUi, null, 2)}\n\nЗапрос пользователя:\n"${prompt}"`,
            },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`AI Gateway error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const clean = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(clean);

      return {
        type: parsed.type || 'hybrid',
        explanation: parsed.explanation || 'Интерфейс и расписание обновлены ИИ',
        ui: parsed.ui,
        alarms: parsed.alarms,
        workout: parsed.workout,
        autoApply: parsed.autoApply ?? true,
      };
    } catch (e) {
      console.warn('Online AI failed, using intelligent offline compiler:', e);
      return this.offlineFallbackCompiler(prompt, currentUi);
    }
  }

  private static offlineFallbackCompiler(
    prompt: string,
    currentUi: DynamicUIConfig
  ): AIPlatformMutation {
    const lower = prompt.toLowerCase();

    // If asking for capabilities
    if (lower.includes('что ты умеешь') || lower.includes('что умеешь') || lower.includes('помощь') || lower.includes('help')) {
      return {
        type: 'hybrid',
        explanation: `Я — твой персональный AI Co-Pilot для Alarmer. Вот весь мой арсенал:\n\n✨ 1. Генеративный UI: напиши мне любой стиль (например: «Сделай фиолетовый киберпанк с круглыми кнопками», «Убери засечки и пресеты, сделай AMOLED»).\n⏰ 2. Умные будильники: напиши расписание (например: «Будильник на 07:00 и 21:30 по будням с напоминанием о беге»).\n🏋️‍♂️ 3. Фитнес-сценарии: составлю Табату, HIIT или разминку со звуковым сопровождением и голосовыми инструкциями.\n🗣 4. Озвучка: могу говорить через нейронные голоса Microsoft Edge Neural TTS или работать без звука.\n⚙️ 5. Управление: полное управление окном, таймером и режимами.`,
        autoApply: false,
      };
    }

    const cloned = JSON.parse(JSON.stringify(currentUi)) as DynamicUIConfig;

    let explanation = 'ИИ применил изменения по вашему описанию: ';
    const changes: string[] = [];
    // Colors & Palettes
    if (lower.includes('киберпанк') || lower.includes('cyberpunk') || lower.includes('розов')) {
      cloned.themeName = 'Cyberpunk AI';
      cloned.colors.bg = '#0d0d17';
      cloned.colors.surface = '#181a27';
      cloned.colors.accent = '#ff007f';
      cloned.colors.accentGlow = '#ff007f80';
      cloned.colors.ringProgress = '#ff007f';
      cloned.colors.text = '#fef08a';
      cloned.dial.glowIntensity = 'high';
      changes.push('тема Cyberpunk (неоновый розовый/желтый)');
    } else if (lower.includes('амолед') || lower.includes('amoled') || lower.includes('черн')) {
      cloned.themeName = 'AMOLED Pure';
      cloned.colors.bg = '#000000';
      cloned.colors.surface = '#0a0a0a';
      cloned.colors.cardBg = '#0a0a0a';
      cloned.colors.border = '#222222';
      cloned.colors.accent = '#00f0ff';
      cloned.colors.ringProgress = '#00f0ff';
      cloned.dial.glowIntensity = 'subtle';
      changes.push('глубокий AMOLED черный');
    } else if (lower.includes('золот') || lower.includes('amber') || lower.includes('янтарь') || lower.includes('оранж')) {
      cloned.themeName = 'Amber Terminal';
      cloned.colors.bg = '#140f07';
      cloned.colors.surface = '#22190c';
      cloned.colors.accent = '#ffb300';
      cloned.colors.ringProgress = '#ffb300';
      cloned.dial.glowIntensity = 'high';
      changes.push('янтарная палитра');
    }

    // Geometry & Layout
    if (lower.includes('убери засечки') || lower.includes('без засечек') || lower.includes('скрой деления')) {
      cloned.dial.showTicks = false;
      changes.push('скрыты засечки циферблата');
    } else if (lower.includes('верни засечки') || lower.includes('покажи засечки')) {
      cloned.dial.showTicks = true;
      changes.push('включены засечки циферблата');
    }
    if (lower.includes('ко сну') && (lower.includes('убери') || lower.includes('скрой') || lower.includes('отключи'))) {
      cloned.layout.showSleepButton = false;
      changes.push('скрыта кнопка «Ко сну»');
    } else if (lower.includes('ко сну') && (lower.includes('верни') || lower.includes('покажи') || lower.includes('включи'))) {
      cloned.layout.showSleepButton = true;
      changes.push('возвращена кнопка «Ко сну»');
    }

    if ((lower.includes('кнопк') || lower.includes('виджет') || lower.includes('ии')) && (lower.includes('ии') || lower.includes('ai')) && (lower.includes('убери') || lower.includes('скрой') || lower.includes('отключи'))) {
      cloned.layout.showAiScheduleButton = false;
      changes.push('скрыта кнопка «ИИ» в будильниках');
    } else if ((lower.includes('кнопк') || lower.includes('виджет') || lower.includes('ии')) && (lower.includes('ии') || lower.includes('ai')) && (lower.includes('верни') || lower.includes('покажи') || lower.includes('включи'))) {
      cloned.layout.showAiScheduleButton = true;
      changes.push('возвращена кнопка «ИИ» в будильниках');
    }

    if (lower.includes('убери пресет') || lower.includes('без нижних кнопок') || lower.includes('минимал')) {
      cloned.layout.showPresetButtons = false;
      changes.push('скрыты кнопки быстрых пресетов');
    } else if (lower.includes('покажи пресет') || lower.includes('верни кнопки')) {
      cloned.layout.showPresetButtons = true;
    }

    if (lower.includes('круглые кнопки') || lower.includes('таблетки') || lower.includes('pill')) {
      cloned.layout.buttonStyle = 'pill';
      changes.push('форма кнопок: pill (скругленные)');
    } else if (lower.includes('квадрат') || lower.includes('square')) {
      cloned.layout.buttonStyle = 'square';
      changes.push('форма кнопок: строгие квадраты');
    }

    if (lower.includes('моно') || lower.includes('код') || lower.includes('mono')) {
      cloned.typography.fontFamily = 'mono';
      changes.push('шрифт: моноширинный');
    }

    explanation += changes.length > 0 ? changes.join(', ') : 'оптимизированы параметры интерфейса';

    // Alarms generation if asked
    let alarms: AlarmItem[] | undefined;
    const timeMatches = prompt.match(/\b([0-2]?[0-9]):([0-5][0-9])\b/g);
    if (timeMatches && (lower.includes('будильник') || lower.includes('напомин') || lower.includes('поставь'))) {
      alarms = timeMatches.map((t, i) => ({
        id: `ai_alarm_${Date.now()}_${i}`,
        title: `Напоминание ${t}`,
        label: `Напоминание ${t}`,
        time: t.padStart(5, '0'),
        days: [1, 2, 3, 4, 5],
        enabled: true,
        sound: 'gentle',
        voicePrompt: `Время активности: ${t}. Выполните запланированное действие!`,
      }));
    }

    return {
      type: alarms ? 'hybrid' : 'ui_change',
      explanation,
      ui: cloned,
      alarms,
      autoApply: true,
    };
  }
}
