import React, { useState } from 'react';
import { Sparkles, Key, Send, Loader2, PlayCircle, Bot, AlertCircle, Check, Bell } from 'lucide-react';
import { ThemeColors, AISettings, WorkoutRoutine, AlarmItem } from '../types';
import { AIService, AIPlanResult } from '../services/ai';
import { soundService } from '../services/sound';

interface AITrainerProps {
  theme: ThemeColors;
  aiSettings: AISettings;
  alarms?: AlarmItem[];
  onUpdateAISettings: (settings: AISettings) => void;
  onSelectRoutine: (routine: WorkoutRoutine) => void;
  onApplyAlarms?: (alarms: AlarmItem[]) => void;
  onSwitchTab?: (tab: 'workout' | 'alarm') => void;
}

export const AITrainer: React.FC<AITrainerProps> = ({
  theme,
  aiSettings,
  alarms = [],
  onUpdateAISettings,
  onSelectRoutine,
  onApplyAlarms,
  onSwitchTab,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AIPlanResult | null>(null);
  const [showConfig, setShowConfig] = useState(!aiSettings.apiKey);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form state for config
  const [apiKey, setApiKey] = useState(aiSettings.apiKey);
  const [baseUrl, setBaseUrl] = useState(aiSettings.baseUrl);
  const [model, setModel] = useState(aiSettings.model);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAISettings({
      apiKey,
      baseUrl: baseUrl || 'https://api.openai.com/v1',
      model: model || 'gpt-4o-mini',
      enabled: true,
      autoAdjustIntervals: aiSettings.autoAdjustIntervals,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setShowConfig(false);
    }, 1200);
  };

  const handleOrchestrate = async (customPrompt?: string) => {
    const query = customPrompt || prompt;
    if (!query.trim()) return;

    // If no API key provided, AIService will use smart local offline fallback!

    setLoading(true);
    setError(null);
    try {
      soundService.playCountdownTick();
      const plan = await AIService.orchestratePlan(query, aiSettings);
      setLastResult(plan);

      // Speak feedback
      if (plan.message) {
        soundService.speak(plan.message);
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Ошибка обработки ИИ';
      setError(message);
      soundService.playBeep(200, 0.4, 0.4);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAllAlarms = () => {
    if (lastResult?.alarms && onApplyAlarms) {
      soundService.playCountdownTick();
      onApplyAlarms([...alarms, ...lastResult.alarms]);
      soundService.speak(`Применено ${lastResult.alarms.length} будильников!`);
      if (onSwitchTab) onSwitchTab('alarm');
    }
  };

  const handleLaunchWorkout = () => {
    if (lastResult?.workout) {
      soundService.playCountdownTick();
      onSelectRoutine(lastResult.workout);
      if (onSwitchTab) onSwitchTab('workout');
    }
  };

  return (
    <div className="flex flex-col w-full px-2 py-1 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <Bot size={20} style={{ color: theme.accent }} />
          <span className="text-sm font-semibold tracking-wider uppercase opacity-80">
            ИИ Распорядитель & Тренер
          </span>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg transition-all"
          style={{
            backgroundColor: showConfig ? `${theme.accent}20` : 'transparent',
            color: showConfig ? theme.accent : theme.subtext,
            border: `1px solid ${showConfig ? theme.accent : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <Key size={13} />
          <span>{aiSettings.apiKey ? 'Настройки BYOK' : 'Подключить API'}</span>
        </button>
      </div>

      {/* BYOK Configuration Form */}
      {showConfig && (
        <form
          onSubmit={handleSaveConfig}
          className="p-3 rounded-xl border flex flex-col space-y-2.5 bg-black/30 animate-in fade-in zoom-in-95 duration-150"
          style={{ borderColor: `${theme.accent}40` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center space-x-1.5">
              <Sparkles size={13} style={{ color: theme.accent }} />
              <span>Конфигурация OpenAI-Compatible</span>
            </span>
            <span className="text-[10px] opacity-60">Локально & Безопасно</span>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider opacity-60">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="bg-black/50 text-xs px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none"
              style={{ color: theme.text }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="bg-black/50 text-xs px-2 py-1.5 rounded-lg border border-white/10 focus:outline-none"
                style={{ color: theme.text }}
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                Model
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="bg-black/50 text-xs px-2 py-1.5 rounded-lg border border-white/10 focus:outline-none"
                style={{ color: theme.text }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
            style={{
              backgroundColor: theme.accent,
              color: theme.bg,
            }}
          >
            {savedSuccess ? (
              <>
                <Check size={14} />
                <span>Сохранено!</span>
              </>
            ) : (
              <span>Сохранить настройки</span>
            )}
          </button>
        </form>
      )}

      {/* Main Orchestration Prompt Area */}
      <div className="flex flex-col space-y-2">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleOrchestrate();
              }
            }}
            placeholder="Опишите задачу: «Вот моя тренировка, расставь будильники на 7:00 подъем и 19:00 растяжка»..."
            rows={2}
            className="w-full bg-black/30 text-xs p-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-white/20 resize-none pr-10"
            style={{ color: theme.text }}
          />
          <button
            onClick={() => handleOrchestrate()}
            disabled={loading || !prompt.trim()}
            className="absolute right-2 bottom-2.5 p-1.5 rounded-lg transition-transform active:scale-95 disabled:opacity-30 flex items-center justify-center"
            style={{ backgroundColor: theme.accent, color: theme.bg }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>

        {/* Quick prompt suggestions */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10px]">
          <span className="opacity-40 shrink-0">Быстрые:</span>
          {[
            'Расставь будильники на утренний бег в 6:30 и растяжку в 20:00',
            '15 мин табата для пресса и будильник перед ней',
            'Помодоро 4 раунда по 25 мин с будильником',
          ].map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(q);
                handleOrchestrate(q);
              }}
              className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 whitespace-nowrap border border-white/5 opacity-80"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generated Result Card (Workout + Alarms Schedule) */}
      {lastResult && (
        <div
          className="p-3 rounded-xl border flex flex-col space-y-3 bg-black/40 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ borderColor: `${theme.accent}50` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold" style={{ color: theme.accent }}>
              <Sparkles size={14} />
              <span>Результат от ИИ</span>
            </div>
            <span className="text-[10px] opacity-60">Сгенерировано</span>
          </div>

          <p className="text-xs italic opacity-90">{lastResult.message}</p>

          {/* If Alarms were planned */}
          {lastResult.alarms && lastResult.alarms.length > 0 && (
            <div className="flex flex-col space-y-1.5 p-2 rounded-lg bg-black/30 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center space-x-1">
                  <Bell size={13} style={{ color: theme.accent }} />
                  <span>Будильники ({lastResult.alarms.length})</span>
                </span>
                <button
                  onClick={handleApplyAllAlarms}
                  className="px-2 py-0.5 text-[10px] font-bold rounded shadow-sm"
                  style={{ backgroundColor: theme.accent, color: theme.bg }}
                >
                  Применить в расписание
                </button>
              </div>
              <div className="flex flex-col space-y-1 pt-1">
                {lastResult.alarms.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] opacity-80">
                    <span className="font-mono font-bold text-white">{a.time}</span>
                    <span className="truncate max-w-[170px]">{a.label || a.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If Workout routine was planned */}
          {lastResult.workout && (
            <div className="flex flex-col space-y-1.5 p-2 rounded-lg bg-black/30 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center space-x-1">
                  <PlayCircle size={13} style={{ color: theme.accent }} />
                  <span>Тренировка: {lastResult.workout.name}</span>
                </span>
                <button
                  onClick={handleLaunchWorkout}
                  className="px-2 py-0.5 text-[10px] font-bold rounded shadow-sm"
                  style={{ backgroundColor: theme.accent, color: theme.bg }}
                >
                  Запустить в таймере
                </button>
              </div>
              <span className="text-[10px] opacity-70">
                {lastResult.workout.repeatCount} раунда(ов) • {lastResult.workout.steps.length} упражнений
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
