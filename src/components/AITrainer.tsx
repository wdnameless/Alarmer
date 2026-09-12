import React, { useState } from 'react';
import { Sparkles, Key, Send, Loader2, PlayCircle, Bot, AlertCircle, Check } from 'lucide-react';
import { ThemeColors, AISettings, WorkoutRoutine } from '../types';
import { AIService } from '../services/ai';
import { soundService } from '../services/sound';

interface AITrainerProps {
  theme: ThemeColors;
  aiSettings: AISettings;
  onUpdateAISettings: (settings: AISettings) => void;
  onSelectRoutine: (routine: WorkoutRoutine) => void;
}

export const AITrainer: React.FC<AITrainerProps> = ({
  theme,
  aiSettings,
  onUpdateAISettings,
  onSelectRoutine,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<WorkoutRoutine | null>(null);
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
    setTimeout(() => {
      setSavedSuccess(false);
      setShowConfig(false);
    }, 1200);
  };

  const handleGenerate = async (customPrompt?: string) => {
    const query = customPrompt || prompt;
    if (!query.trim()) return;

    if (!aiSettings.apiKey) {
      setShowConfig(true);
      setError('Сначала укажите ваш OpenAI-compatible API ключ.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      soundService.playCountdownTick();
      const routine = await AIService.generateWorkout(query, aiSettings);
      setLastGenerated(routine);
      soundService.speak(`Тренировка ${routine.name} готова!`);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Ошибка генерации тренировки';
      setError(message);
      soundService.playBeep(200, 0.4, 0.4);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Табата на пресс 4 минуты (20с работа, 10с отдых)',
    'Быстрая утренняя разминка для суставов 5 минут',
    'HIIT взрывное кардио (джампинг джек, берпи, планка)',
    'Растяжка спины и шеи после работы за ПК',
  ];

  return (
    <div className="flex flex-col w-full px-2 py-1 space-y-3">
      {/* Header bar with Settings toggle */}
      <div
        className="flex items-center justify-between p-3 rounded-xl border"
        style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
      >
        <div className="flex items-center space-x-2">
          <Bot size={18} style={{ color: theme.accent }} />
          <div>
            <div className="text-xs font-bold" style={{ color: theme.text }}>
              AI Фитнес-Ассистент
            </div>
            <div className="text-[10px]" style={{ color: theme.subtext }}>
              BYOK • {aiSettings.model || 'OpenAI'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors"
          style={{
            backgroundColor: showConfig ? `${theme.accent}20` : 'transparent',
            color: showConfig ? theme.accent : theme.subtext,
          }}
        >
          <Key size={13} />
          <span>{showConfig ? 'Закрыть API' : 'Настройка API'}</span>
        </button>
      </div>

      {/* API Configuration Panel */}
      {showConfig && (
        <form
          onSubmit={handleSaveConfig}
          className="flex flex-col space-y-2.5 p-3 rounded-xl border animate-in fade-in"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
        >
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>
            OpenAI-Compatible Конфигурация (BYOK)
          </div>

          <div>
            <label className="text-[10px] block mb-1" style={{ color: theme.subtext }}>
              API Base URL:
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white/5 border outline-none font-mono"
              style={{ borderColor: theme.border, color: theme.text }}
            />
          </div>

          <div>
            <label className="text-[10px] block mb-1" style={{ color: theme.subtext }}>
              API Key (хранится только локально):
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white/5 border outline-none font-mono"
              style={{ borderColor: theme.border, color: theme.text }}
            />
          </div>

          <div>
            <label className="text-[10px] block mb-1" style={{ color: theme.subtext }}>
              Model:
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini / deepseek-chat / etc."
              className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white/5 border outline-none font-mono"
              style={{ borderColor: theme.border, color: theme.text }}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-transform active:scale-95 mt-1"
            style={{ backgroundColor: theme.accent, color: '#000' }}
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

      {/* Main Generator Input */}
      <div
        className="flex flex-col space-y-2 p-3 rounded-xl border"
        style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
      >
        <div className="flex items-center space-x-1.5 text-xs font-bold" style={{ color: theme.text }}>
          <Sparkles size={14} style={{ color: theme.accent }} />
          <span>Сгенерировать комплекс под задачу</span>
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="Например: 10 мин круговая на ноги и пресс..."
            className="flex-1 px-3 py-2 rounded-lg text-xs bg-white/5 border outline-none"
            style={{ borderColor: theme.border, color: theme.text }}
          />
          <button
            onClick={() => handleGenerate()}
            disabled={loading || !prompt.trim()}
            className="px-3 py-2 rounded-lg font-bold flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: theme.accent, color: '#000' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(p);
                handleGenerate(p);
              }}
              disabled={loading}
              className="text-[10px] px-2 py-1 rounded-md text-left transition-colors border hover:border-white/30"
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderColor: `${theme.border}60`,
                color: theme.subtext,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center space-x-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generated Routine Preview Card */}
      {lastGenerated && (
        <div
          className="flex flex-col space-y-2 p-3 rounded-xl border animate-in zoom-in-95"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.accent }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold" style={{ color: theme.text }}>
                {lastGenerated.name}
              </div>
              <div className="text-[11px]" style={{ color: theme.subtext }}>
                {lastGenerated.repeatCount} раунда • {lastGenerated.steps.length} упражнений
              </div>
            </div>

            <button
              onClick={() => onSelectRoutine(lastGenerated)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95 shadow-lg"
              style={{ backgroundColor: theme.accent, color: '#000' }}
            >
              <PlayCircle size={15} />
              <span>Запустить</span>
            </button>
          </div>

          {/* Steps summary */}
          <div className="space-y-1 pt-1 max-h-40 overflow-y-auto">
            {lastGenerated.steps.map((st, i) => (
              <div
                key={st.id || i}
                className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-white/5"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-neutral-500">{i + 1}.</span>
                  <span style={{ color: theme.text }}>{st.name}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono">
                  <span
                    className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold"
                    style={{
                      backgroundColor:
                        st.type === 'work' ? `${theme.accent}30` : 'rgba(59,130,246,0.2)',
                      color: st.type === 'work' ? theme.accent : '#60a5fa',
                    }}
                  >
                    {st.type}
                  </span>
                  <span style={{ color: theme.subtext }}>{st.durationSec}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
