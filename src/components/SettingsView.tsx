import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Key, RotateCcw, Check, Play } from 'lucide-react';
import { ThemeColors, AISettings, DynamicUIConfig, DEFAULT_DYNAMIC_UI } from '../types';
import { CLOUD_VOICES, EdgeTtsService } from '../services/edgeTts';
import { soundService } from '../services/sound';

interface SettingsViewProps {
  theme: ThemeColors;
  aiSettings: AISettings;
  currentUi: DynamicUIConfig;
  onUpdateAISettings: (settings: AISettings) => void;
  onUpdateUI: (ui: DynamicUIConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  aiSettings,
  currentUi: _currentUi,
  onUpdateAISettings,
  onUpdateUI,
}) => {
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    return localStorage.getItem('alarmer_voice_id') || 'none';
  });

  const [apiKey, setApiKey] = useState(aiSettings.apiKey);
  const [baseUrl, setBaseUrl] = useState(aiSettings.baseUrl);
  const [model, setModel] = useState(aiSettings.model);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [uiClicks, setUiClicks] = useState<boolean>(() => {
    return localStorage.getItem('alarmer_ui_clicks') !== 'false';
  });
  const [countdownTicks, setCountdownTicks] = useState<boolean>(() => {
    return localStorage.getItem('alarmer_countdown_ticks') !== 'false';
  });
  const [soundProfile, setSoundProfile] = useState<string>(() => {
    return localStorage.getItem('alarmer_sound_profile') || 'neon';
  });

  const handleToggleUiClicks = () => {
    const next = !uiClicks;
    setUiClicks(next);
    localStorage.setItem('alarmer_ui_clicks', String(next));
    if (next) soundService.playUiClick();
  };

  const handleToggleCountdownTicks = () => {
    const next = !countdownTicks;
    setCountdownTicks(next);
    localStorage.setItem('alarmer_countdown_ticks', String(next));
    if (next) soundService.playCountdownTick();
  };

  const handleSelectProfile = (prof: string) => {
    setSoundProfile(prof);
    localStorage.setItem('alarmer_sound_profile', prof);
    soundService.playUiClick();
  };
  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
    localStorage.setItem('alarmer_voice_id', voiceId);
    soundService.playCountdownTick();
  };

  const handleTestVoice = async () => {
    if (selectedVoice === 'none') {
      soundService.playBeep(440, 0.2, 0.3);
      return;
    }
    setTestingVoice(true);
    try {
      await EdgeTtsService.speak('Привет! Это проверка новой естественной озвучки Alarmer.', selectedVoice);
    } catch (e) {
      console.error(e);
    } finally {
      setTestingVoice(false);
    }
  };

  const handleSaveAI = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAISettings({
      ...aiSettings,
      apiKey,
      baseUrl: baseUrl || 'https://api.openai.com/v1',
      model: model || 'gpt-4o-mini',
      enabled: Boolean(apiKey.trim()),
    });
    setSavedSuccess(true);
    soundService.playCountdownTick();
    setTimeout(() => setSavedSuccess(false), 1500);
  };

  const handleResetUI = () => {
    onUpdateUI(DEFAULT_DYNAMIC_UI);
    soundService.playCountdownTick();
  };

  return (
    <div className="flex flex-col w-full h-full p-4 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
        <div>
          <h2 className="text-base font-bold tracking-tight">Настройки системы</h2>
          <p className="text-xs opacity-60">Озвучка, нейросети и параметры интерфейса</p>
        </div>
      </div>

      {/* Voice Selection */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5" style={{ color: theme.accent }}>
            {selectedVoice === 'none' ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span>Голосовая озвучка (Cloud Neural TTS)</span>
          </label>
          <button
            type="button"
            onClick={handleTestVoice}
            disabled={testingVoice || selectedVoice === 'none'}
            className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 bg-white/10 hover:bg-white/15 disabled:opacity-30 transition-all"
          >
            <Play size={11} />
            <span>{testingVoice ? 'Воспроизведение...' : 'Тест голоса'}</span>
          </button>
        </div>

        <div className="flex flex-col space-y-1.5">
          {CLOUD_VOICES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => handleVoiceSelect(v.id)}
              className="flex items-center justify-between p-2.5 rounded-xl border text-left transition-all"
              style={{
                backgroundColor: selectedVoice === v.id ? `${theme.accent}18` : theme.cardBg,
                borderColor: selectedVoice === v.id ? theme.accent : theme.border,
              }}
            >
              <div>
                <p className="text-xs font-medium">{v.name}</p>
                <span className="text-[10px] opacity-50">{v.lang} • {v.gender}</span>
              </div>
              {selectedVoice === v.id && <Check size={14} style={{ color: theme.accent }} />}
            </button>
          ))}
        </div>
        <p className="text-[11px] opacity-50">
          По умолчанию озвучка отключена (только звуковые сигналы). Вы можете в любой момент выбрать нейросетевой облачный голос.
        </p>
      </div>

      {/* Sound Effects & Clicks Controls */}
      <div className="flex flex-col space-y-3 border-t pt-4" style={{ borderColor: theme.border }}>
        <label className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5" style={{ color: theme.accent }}>
          <Volume2 size={15} />
          <span>Звуковые эффекты и клики интерфейса</span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleToggleUiClicks()}
            className="p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all"
            style={{
              borderColor: uiClicks ? theme.accent : theme.border,
              backgroundColor: uiClicks ? `${theme.accent}15` : 'transparent',
              color: theme.text,
            }}
          >
            <span>Клики кнопок и вкладок</span>
            <span className="text-[10px] font-bold opacity-80">{uiClicks ? 'ВКЛ' : 'ВЫКЛ'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleCountdownTicks()}
            className="p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all"
            style={{
              borderColor: countdownTicks ? theme.accent : theme.border,
              backgroundColor: countdownTicks ? `${theme.accent}15` : 'transparent',
              color: theme.text,
            }}
          >
            <span>Тиканье таймера (3..2..1)</span>
            <span className="text-[10px] font-bold opacity-80">{countdownTicks ? 'ВКЛ' : 'ВЫКЛ'}</span>
          </button>
        </div>

        <div className="flex flex-col space-y-1.5 pt-1">
          <span className="text-[10px] opacity-60">Профиль звука кликов:</span>
          <div className="grid grid-cols-4 gap-1.5">
            {(['neon', 'mechanical', 'soft', 'arcade'] as const).map((prof) => (
              <button
                key={prof}
                type="button"
                onClick={() => handleSelectProfile(prof)}
                className="py-1.5 px-2 rounded-lg border text-[11px] font-medium capitalize transition-all"
                style={{
                  borderColor: soundProfile === prof ? theme.accent : theme.border,
                  backgroundColor: soundProfile === prof ? `${theme.accent}20` : 'transparent',
                  color: theme.text,
                }}
              >
                {prof}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* AI Key Config */}
      <form onSubmit={handleSaveAI} className="flex flex-col space-y-3 border-t pt-4" style={{ borderColor: theme.border }}>
        <label className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5" style={{ color: theme.accent }}>
          <Key size={15} />
          <span>Подключение ИИ (BYOK / OpenAI-Compatible)</span>
        </label>

        <div className="flex flex-col space-y-1">
          <span className="text-[10px] opacity-60">API Ключ</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-black/30"
            style={{ borderColor: theme.border, color: theme.text }}
          />
        </div>

        <div className="flex flex-col space-y-1">
          <span className="text-[10px] opacity-60">Base URL</span>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-black/30"
            style={{ borderColor: theme.border, color: theme.text }}
          />
        </div>

        <div className="flex flex-col space-y-1">
          <span className="text-[10px] opacity-60">Модель</span>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className="w-full px-3 py-2 rounded-xl text-xs border outline-none bg-black/30"
            style={{ borderColor: theme.border, color: theme.text }}
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all mt-1"
          style={{ backgroundColor: theme.accent, color: theme.bg }}
        >
          {savedSuccess ? <Check size={14} /> : <Sparkles size={14} />}
          <span>{savedSuccess ? 'Настройки сохранены!' : 'Сохранить параметры ИИ'}</span>
        </button>
      </form>

      {/* UI Reset */}
      <div className="flex flex-col space-y-2 border-t pt-4" style={{ borderColor: theme.border }}>
        <label className="text-xs font-bold uppercase tracking-wider opacity-60">
          Сброс внешнего вида
        </label>
        <button
          type="button"
          onClick={handleResetUI}
          className="w-full py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 hover:bg-white/5 active:scale-98 transition-all"
          style={{ borderColor: theme.border }}
        >
          <RotateCcw size={13} />
          <span>Сбросить кастомный UI к дефолту</span>
        </button>
      </div>
    </div>
  );
};
