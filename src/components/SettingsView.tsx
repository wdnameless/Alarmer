import React, { useState, useEffect } from 'react';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { Volume2, VolumeX, Sparkles, Key, RotateCcw, Check, Play, Download, Upload } from 'lucide-react';
import { ThemeColors, AISettings, DynamicUIConfig, DEFAULT_DYNAMIC_UI } from '../types';
import { CLOUD_VOICES, EdgeTtsService } from '../services/edgeTts';
import { soundService } from '../services/sound';
import { I18nService, Language } from '../services/i18n';
import { StoreService } from '../services/store';

interface SettingsViewProps {
  theme: ThemeColors;
  aiSettings: AISettings;
  onUpdateAISettings: (settings: AISettings) => void;
  onUpdateUI: (ui: DynamicUIConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  aiSettings,
  onUpdateAISettings,
  onUpdateUI,
}) => {
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    return StoreService.getPreference('alarmer_voice_id', 'none');
  });

  const [apiKey, setApiKey] = useState(aiSettings.apiKey);
  const [baseUrl, setBaseUrl] = useState(aiSettings.baseUrl);
  const [model, setModel] = useState(aiSettings.model);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'sound' | 'ai' | 'data'>('sound');
  const [uiClicks, setUiClicks] = useState<boolean>(() => {
    return StoreService.getPreference('alarmer_ui_clicks', true);
  });
  const [countdownTicks, setCountdownTicks] = useState<boolean>(() => {
    return StoreService.getPreference('alarmer_countdown_ticks', true);
  });
  const [soundProfile, setSoundProfile] = useState<string>(() => {
    return StoreService.getPreference('alarmer_sound_profile', 'neon');
  });
  const [clockTick, setClockTick] = useState<boolean>(() => {
    return StoreService.getPreference('alarmer_clock_tick', true);
  });
  const [clickVolume, setClickVolume] = useState<number>(() => {
    return StoreService.getPreference('alarmer_click_volume', 0.5);
  });
  const [alarmVolume, setAlarmVolume] = useState<number>(() => {
    return StoreService.getPreference('alarmer_alarm_volume', 0.8);
  });
  const [voiceVolume, setVoiceVolume] = useState<number>(() => {
    return StoreService.getPreference('alarmer_voice_volume', 0.8);
  });
  const [currentLang, setCurrentLang] = useState<Language>(() => I18nService.getLang());

  const handleLangChange = (lang: Language) => {
    I18nService.setLang(lang);
    setCurrentLang(lang);
    soundService.playUiClick();
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    StoreService.setPreference('alarmer_voice_id', voiceId);
    if (voiceId !== 'none') {
      EdgeTtsService.speak('Голос успешно выбран!', voiceId);
    } else {
      EdgeTtsService.stop();
    }
  };
  const handleToggleUiClicks = () => {
    const next = !uiClicks;
    setUiClicks(next);
    StoreService.setPreference('alarmer_ui_clicks', next);
    if (next) soundService.playUiClick();
  };

  const handleToggleCountdownTicks = () => {
    const next = !countdownTicks;
    setCountdownTicks(next);
    StoreService.setPreference('alarmer_countdown_ticks', next);
    if (next) soundService.playCountdownTick();
  };

  const handleSelectProfile = (prof: string) => {
    setSoundProfile(prof);
    StoreService.setPreference('alarmer_sound_profile', prof);
    soundService.playUiClick();
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

  // Reflect the real OS-level autostart state rather than a cached flag.
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    void isEnabled()
      .then(setAutostartEnabled)
      .catch(() => setAutostartEnabled(false));
  }, []);

  const t = I18nService.t();

  return (
    <div className="flex flex-col w-full h-full p-4 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
        <div>
          <h2 className="text-base font-bold tracking-tight">{t.systemSettings}</h2>
          <p className="text-xs opacity-60">{t.settingsDesc}</p>
        </div>
        <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => handleLangChange('en')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              currentLang === 'en' ? 'bg-white/20 text-white' : 'opacity-50 hover:opacity-100'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => handleLangChange('ru')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              currentLang === 'ru' ? 'bg-white/20 text-white' : 'opacity-50 hover:opacity-100'
            }`}
          >
            RU
          </button>
        </div>
      </div>

      {/* Phased sub-navigation: audio, AI, data */}
      <div className="flex items-center space-x-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setActiveTab('sound');
            soundService.playUiClick();
          }}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
            activeTab === 'sound' ? 'bg-white/20 font-bold shadow-sm' : 'opacity-60 hover:opacity-100'
          }`}
          style={{ color: activeTab === 'sound' ? theme.accent : undefined }}
        >
          <Volume2 size={13} />
          <span>Звук</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('ai');
            soundService.playUiClick();
          }}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
            activeTab === 'ai' ? 'bg-white/20 font-bold shadow-sm' : 'opacity-60 hover:opacity-100'
          }`}
          style={{ color: activeTab === 'ai' ? theme.accent : undefined }}
        >
          <Key size={13} />
          <span>Нейросеть</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('data');
            soundService.playUiClick();
          }}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
            activeTab === 'data' ? 'bg-white/20 font-bold shadow-sm' : 'opacity-60 hover:opacity-100'
          }`}
          style={{ color: activeTab === 'data' ? theme.accent : undefined }}
        >
          <RotateCcw size={13} />
          <span>Данные</span>
        </button>
      </div>
      {activeTab === 'sound' && (
        <div className="flex flex-col space-y-6">
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
          <div className="flex flex-col space-y-2">
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border text-xs outline-none cursor-pointer transition-colors"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
                color: theme.text,
              }}
            >
              {CLOUD_VOICES.map((v) => (
                <option key={v.id} value={v.id} className="bg-neutral-900 text-white">
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Voice Volume Slider */}
          <div className="flex flex-col space-y-1.5 pt-1">
            <div className="flex justify-between text-xs">
              <span style={{ color: theme.subtext }}>Громкость голоса озвучки:</span>
              <span className="font-mono font-bold" style={{ color: theme.accent }}>
                {Math.round(voiceVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={voiceVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVoiceVolume(val);
                StoreService.setPreference('alarmer_voice_volume', val);
              }}
              className="w-full accent-current h-1.5 rounded-lg cursor-pointer bg-white/10"
              style={{ accentColor: theme.accent }}
            />
          </div>

          <p className="text-[11px] opacity-60 leading-relaxed">
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
            <button
              type="button"
              onClick={() => {
                const next = !clockTick;
                setClockTick(next);
                StoreService.setPreference('alarmer_clock_tick', next);
                if (next) soundService.playUiClick();
              }}
              className="p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all col-span-2"
              style={{
                borderColor: clockTick ? theme.accent : theme.border,
                backgroundColor: clockTick ? `${theme.accent}15` : 'transparent',
                color: theme.text,
              }}
            >
              <span>Звук тиканья часов (каждую секунду)</span>
              <span className="text-[10px] font-bold opacity-80">{clockTick ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </button>
          </div>

          {/* Volume Sliders */}
          <div className="flex flex-col space-y-3 pt-2">
            <div className="flex flex-col space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="opacity-80">Громкость кликов и тиков:</span>
                <span className="font-mono font-bold" style={{ color: theme.accent }}>{Math.round(clickVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={clickVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setClickVolume(val);
                  StoreService.setPreference('alarmer_click_volume', val);
                  soundService.playUiClick();
                }}
                className="w-full accent-current h-1 rounded-lg cursor-pointer opacity-80"
                style={{ accentColor: theme.accent }}
              />
            </div>

            <div className="flex flex-col space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="opacity-80">Громкость будильников и сигналов:</span>
                <span className="font-mono font-bold" style={{ color: theme.accent }}>{Math.round(alarmVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={alarmVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAlarmVolume(val);
                  StoreService.setPreference('alarmer_alarm_volume', val);
                }}
                className="w-full accent-current h-1 rounded-lg cursor-pointer opacity-80"
                style={{ accentColor: theme.accent }}
              />
            </div>
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
        </div>
      )}
      {activeTab === 'ai' && (
        <div className="flex flex-col space-y-6">
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
        </div>
      )}
      {activeTab === 'data' && (
        <div className="flex flex-col space-y-6">
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

          {/* Autostart with the operating system */}
        <div className="flex flex-col space-y-2 border-t pt-4" style={{ borderColor: theme.border }}>
          <label className="text-xs font-bold uppercase tracking-wider opacity-60">
            Запуск вместе с системой
          </label>
          <button
            type="button"
            onClick={async () => {
              soundService.playUiClick();
              try {
                if (autostartEnabled) {
                  await disable();
                  setAutostartEnabled(false);
                } else {
                  await enable();
                  setAutostartEnabled(true);
                }
              } catch (e) {
                console.warn('autostart toggle failed:', e);
              }
            }}
            className="p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all"
            style={{
              borderColor: autostartEnabled ? theme.accent : theme.border,
              backgroundColor: autostartEnabled ? `${theme.accent}15` : 'transparent',
              color: theme.text,
            }}
          >
            <span>Запускать Alarmer при входе в систему</span>
            <span className="text-[10px] font-bold opacity-80">{autostartEnabled ? 'ВКЛ' : 'ВЫКЛ'}</span>
          </button>
          <p className="text-[11px] opacity-60 leading-relaxed">
            Приложение стартует свёрнутым в трей — будильники срабатывают даже без открытого окна.
          </p>
        </div>

        {/* Global hotkeys reference */}
        <div className="flex flex-col space-y-2 border-t pt-4" style={{ borderColor: theme.border }}>
          <label className="text-xs font-bold uppercase tracking-wider opacity-60">
            Горячие клавиши (работают из любой программы)
          </label>
          <div className="flex flex-col space-y-1 text-[11px]" style={{ color: theme.subtext }}>
            <div className="flex justify-between"><span>Пауза / продолжить</span><span className="font-mono" style={{ color: theme.text }}>Alt + S</span></div>
            <div className="flex justify-between"><span>Сбросить таймер</span><span className="font-mono" style={{ color: theme.text }}>Alt + R</span></div>
            <div className="flex justify-between"><span>Прибавить 5 минут</span><span className="font-mono" style={{ color: theme.text }}>Alt + Shift + U</span></div>
            <div className="flex justify-between"><span>Убавить 5 минут</span><span className="font-mono" style={{ color: theme.text }}>Alt + Shift + D</span></div>
          </div>
        </div>

      {/* Data Management: Export / Import JSON */}
        <div className="flex flex-col space-y-2 border-t pt-4" style={{ borderColor: theme.border }}>
          <label className="text-xs font-bold uppercase tracking-wider opacity-60">
            Управление данными (Резервная копия)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([StoreService.exportJson()], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `alarmer-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 hover:bg-white/5 active:scale-98 transition-all"
              style={{ borderColor: theme.border }}
            >
              <Download size={13} />
              <span>Экспорт JSON</span>
            </button>

            <label
              className="py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 hover:bg-white/5 active:scale-98 transition-all cursor-pointer"
              style={{ borderColor: theme.border }}
            >
              <Upload size={13} />
              <span>Импорт JSON</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    try {
                      setImportError(null);
                      await StoreService.importJson(String(event.target?.result ?? ''));
                      window.location.reload();
                    } catch (err) {
                      // Surface a readable message instead of silently resetting state.
                      setImportError(err instanceof Error ? err.message : 'Не удалось импортировать файл');
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>
          {importError && (
            <p className="text-[11px] text-red-400 leading-snug">Ошибка импорта: {importError}</p>
          )}
        </div>
        </div>
      )}
    </div>
  );
};
