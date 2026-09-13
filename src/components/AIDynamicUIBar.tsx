import React, { useState } from 'react';
import { Sparkles, Loader2, Check, RefreshCw, X } from 'lucide-react';
import { DynamicUIConfig } from '../types/dynamicUi';
import { AISettings, ThemeColors } from '../types';
import { AIDynamicUIService } from '../services/aiDynamicUi';
import { soundService } from '../services/sound';

interface AIDynamicUIBarProps {
  theme: ThemeColors;
  currentConfig: DynamicUIConfig;
  aiSettings: AISettings;
  onApplyConfig: (config: DynamicUIConfig) => void;
  onClose: () => void;
}

export const AIDynamicUIBar: React.FC<AIDynamicUIBarProps> = ({
  theme,
  currentConfig,
  aiSettings,
  onApplyConfig,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const presets = [
    'Сделай стиль Киберпанк с розовым неоном',
    'Черный минималистичный AMOLED без засечек',
    'Теплый золотой янтарный стиль с крупным таймером',
    'Нордик с небесно-голубым акцентом',
  ];

  const handleGenerate = async (customText?: string) => {
    const text = customText || prompt;
    if (!text.trim() || loading) return;

    setLoading(true);
    soundService.playCountdownTick();
    try {
      const generated = await AIDynamicUIService.generateDynamicUI(text, currentConfig, aiSettings);
      onApplyConfig(generated);
      setLastGenerated(generated.themeName);
      soundService.speak(`Тема «${generated.themeName}» применена!`);
      setPrompt('');
    } catch (e) {
      console.error(e);
      soundService.playBeep(200, 0.4, 0.4);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full flex flex-col p-3 rounded-2xl border backdrop-blur-xl shadow-2xl space-y-2.5 transition-all text-xs"
      style={{
        backgroundColor: `${theme.cardBg}fa`,
        borderColor: theme.border,
        color: theme.text,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 font-bold">
          <Sparkles size={14} style={{ color: theme.accent }} />
          <span>Генеративный AI-интерфейс</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-white/10"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex space-x-1.5">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="Опиши желаемый интерфейс (цвета, стиль, шрифт...)"
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs focus:outline-none focus:border-emerald-500"
          style={{ color: theme.text }}
        />
        <button
          onClick={() => handleGenerate()}
          disabled={loading || !prompt.trim()}
          className="px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all disabled:opacity-40"
          style={{
            backgroundColor: theme.accent,
            color: '#000000',
          }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          <span>Применить</span>
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1">
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleGenerate(p)}
            disabled={loading}
            className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] opacity-80 hover:opacity-100 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {lastGenerated && (
        <div className="text-[10px] flex items-center space-x-1 opacity-70 text-emerald-400">
          <RefreshCw size={10} />
          <span>Активная AI-тема: {lastGenerated}</span>
        </div>
      )}
    </div>
  );
};
