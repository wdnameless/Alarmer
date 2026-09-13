import React, { useState, useEffect } from 'react';
import {
  Timer as TimerIcon,
  Flame,
  Watch,
  Bell,
  Sparkles,
  Palette,
  Check,
} from 'lucide-react';
import { TitleBar } from './components/TitleBar';
import { Timer } from './components/Timer';
import { Stopwatch } from './components/Stopwatch';
import { Alarms } from './components/Alarms';
import { WorkoutPlayer } from './components/WorkoutPlayer';
import { AITrainer } from './components/AITrainer';
import { AppMode, ThemeKey, AISettings, AlarmItem, WorkoutRoutine, ThemeColors } from './types';
import { THEMES } from './constants/themes';
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_ALARMS,
  DEFAULT_WORKOUT_ROUTINES,
} from './constants/defaults';
import { windowService } from './services/window';
import { soundService } from './services/sound';
import { NotificationService } from './services/notification';
import { ResizeHandles } from './components/ResizeHandles';
import { AIDynamicUIBar } from './components/AIDynamicUIBar';
import { AIChatDrawer } from './components/AIChatDrawer';
import { DynamicUIConfig, DEFAULT_DYNAMIC_UI } from './types';

export const App: React.FC = () => {
  // App state
  const [activeTab, setActiveTab] = useState<AppMode>('timer');
  const [themeKey, setThemeKey] = useState<ThemeKey>('dark-neon');
  const [isCompact, setIsCompact] = useState(true);
  const [isPinned, setIsPinned] = useState(true);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  // Dynamic AI-driven UI Configuration
  const [dynamicUi, setDynamicUi] = useState<DynamicUIConfig>(() => {
    try {
      const saved = localStorage.getItem('alarmer_dynamic_ui');
      return saved ? JSON.parse(saved) : DEFAULT_DYNAMIC_UI;
    } catch {
      return DEFAULT_DYNAMIC_UI;
    }
  });

  useEffect(() => {
    localStorage.setItem('alarmer_dynamic_ui', JSON.stringify(dynamicUi));
  }, [dynamicUi]);


  // Data state with localStorage persistence
  const [aiSettings, setAISettings] = useState<AISettings>(() => {
    try {
      const saved = localStorage.getItem('alarmer_ai_settings');
      return saved ? JSON.parse(saved) : DEFAULT_AI_SETTINGS;
    } catch {
      return DEFAULT_AI_SETTINGS;
    }
  });

  const [alarms, setAlarms] = useState<AlarmItem[]>(() => {
    try {
      const saved = localStorage.getItem('alarmer_alarms');
      return saved ? JSON.parse(saved) : DEFAULT_ALARMS;
    } catch {
      return DEFAULT_ALARMS;
    }
  });

  const [routines, setRoutines] = useState<WorkoutRoutine[]>(() => {
    try {
      const saved = localStorage.getItem('alarmer_routines');
      return saved ? JSON.parse(saved) : DEFAULT_WORKOUT_ROUTINES;
    } catch {
      return DEFAULT_WORKOUT_ROUTINES;
    }
  });

  const [selectedRoutine, setSelectedRoutine] = useState<WorkoutRoutine>(routines[0]);

  // Persist state
  useEffect(() => {
    localStorage.setItem('alarmer_ai_settings', JSON.stringify(aiSettings));
  }, [aiSettings]);

  useEffect(() => {
    localStorage.setItem('alarmer_alarms', JSON.stringify(alarms));
  }, [alarms]);

  useEffect(() => {
    localStorage.setItem('alarmer_routines', JSON.stringify(routines));
  }, [routines]);
  // Initialize notification permissions on mount
  useEffect(() => {
    NotificationService.init().catch(console.error);
  }, []);

  // Sync window size on compact mode toggle
  const toggleCompact = () => {
    soundService.playCountdownTick();
    setIsCompact((prev) => {
      const next = !prev;
      if (next) {
        setActiveTab('timer');
      }
      windowService.toggleCompactMode(next).catch(console.error);
      return next;
    });
  };

  const togglePin = async () => {
    const newPin = !isPinned;
    setIsPinned(newPin);
    await windowService.setAlwaysOnTop(newPin);
  };

  const handleSelectTab = (tab: AppMode) => {
    soundService.playCountdownTick();
    setActiveTab(tab);
    setShowThemePicker(false);
  };

  const handleSelectRoutine = (routine: WorkoutRoutine) => {
    // Add to routines list if not present
    if (!routines.find((r) => r.id === routine.id)) {
      setRoutines([routine, ...routines]);
    }
    setSelectedRoutine(routine);
    setActiveTab('workout');
  };

  // Effective theme computed from base theme + dynamic UI overrides
  const baseTheme = THEMES[themeKey];
  const theme: ThemeColors = {
    ...baseTheme,
    ...dynamicUi.colors,
    id: themeKey,
  };

  return (
    <div className="w-screen h-screen m-0 p-0 bg-transparent overflow-hidden select-none">
      <div
        className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl border transition-colors duration-200"
        style={{
          backgroundColor: theme.bg,
          borderColor: `${theme.accent}55`,
          color: theme.text,
          filter: dynamicUi.dial.glowIntensity === 'high' ? `drop-shadow(0 0 15px ${theme.accent}33)` : undefined,
        }}
      >
        <ResizeHandles />
      {/* Sleek Custom Windows / macOS Titlebar with Drag & Controls */}
      <TitleBar
        theme={theme}
        isCompact={isCompact}
        isPinned={isPinned}
        onToggleCompact={toggleCompact}
        onTogglePin={togglePin}
        onOpenAIChat={() => setIsAiChatOpen(true)}
      />
      {/* Main App Container */}
      <div className="flex-1 flex flex-col items-center justify-between p-3 overflow-y-auto">
        {/* Navigation Tabs (Hidden in ultra-compact view for floating pill look) */}
        {!isCompact && (
          <div
            className="flex items-center justify-between w-full p-1 mb-2 rounded-xl border transition-colors"
            style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
          >
            <div className="flex items-center space-x-1 flex-1">
              <button
                onClick={() => handleSelectTab('timer')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                  activeTab === 'timer' ? 'font-bold' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeTab === 'timer' ? `${theme.accent}25` : 'transparent',
                  color: activeTab === 'timer' ? theme.accent : theme.text,
                }}
                title="Таймер Помодоро"
              >
                <TimerIcon size={16} />
              </button>

              <button
                onClick={() => handleSelectTab('workout')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                  activeTab === 'workout' ? 'font-bold' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeTab === 'workout' ? `${theme.accent}25` : 'transparent',
                  color: activeTab === 'workout' ? theme.accent : theme.text,
                }}
                title="Интервальные тренировки"
              >
                <Flame size={16} />
              </button>

              <button
                onClick={() => handleSelectTab('stopwatch')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                  activeTab === 'stopwatch' ? 'font-bold' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeTab === 'stopwatch' ? `${theme.accent}25` : 'transparent',
                  color: activeTab === 'stopwatch' ? theme.accent : theme.text,
                }}
                title="Секундомер с кругами"
              >
                <Watch size={16} />
              </button>

              <button
                onClick={() => handleSelectTab('alarm')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                  activeTab === 'alarm' ? 'font-bold' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeTab === 'alarm' ? `${theme.accent}25` : 'transparent',
                  color: activeTab === 'alarm' ? theme.accent : theme.text,
                }}
                title="Будильники и напоминания"
              >
                <Bell size={16} />
              </button>

              <button
                onClick={() => handleSelectTab('ai')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                  activeTab === 'ai' ? 'font-bold' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeTab === 'ai' ? `${theme.accent}25` : 'transparent',
                  color: activeTab === 'ai' ? theme.accent : theme.text,
                }}
                title="AI Ассистент тренировок"
              >
                <Sparkles size={16} />
              </button>
            </div>

            {/* Theme switcher button */}
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="p-1.5 ml-1 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: showThemePicker ? theme.accent : theme.subtext }}
              title="Выбор темы оформления"
            >
              <Palette size={16} />
            </button>
          </div>
        )}

        {/* Theme Picker Popover */}
        {showThemePicker && !isCompact && (
          <div
            className="w-full p-2.5 mb-2 rounded-xl border flex flex-col space-y-2 animate-in fade-in"
            style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>
              Темы оформления
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
                const th = THEMES[key];
                const isCurrent = themeKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      soundService.playCountdownTick();
                      setThemeKey(key);
                      setShowThemePicker(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all border ${
                      isCurrent ? 'ring-1 ring-white/50' : 'opacity-80'
                    }`}
                    style={{
                      backgroundColor: th.bg,
                      borderColor: isCurrent ? th.accent : th.border,
                    }}
                  >
                    <div className="flex items-center space-x-1.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: th.accent }}
                      />
                      <span>{th.name}</span>
                    </div>
                    {isCurrent && <Check size={14} style={{ color: th.accent }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Area Rendering by active Tab */}
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          {activeTab === 'timer' && <Timer theme={theme} dynamicUi={dynamicUi} />}

          {activeTab === 'workout' && (
            <WorkoutPlayer
              theme={theme}
              routine={selectedRoutine}
              onFinish={() => {
                // Return to first step or alert
              }}
            />
          )}

          {activeTab === 'stopwatch' && <Stopwatch theme={theme} />}

          {activeTab === 'alarm' && (
            <Alarms
              theme={theme}
              alarms={alarms}
              aiSettings={aiSettings}
              onUpdateAlarms={setAlarms}
              onOpenAISettings={() => setActiveTab('ai')}
            />
          )}

          {activeTab === 'ai' && (
            <AITrainer
              theme={theme}
              aiSettings={aiSettings}
              alarms={alarms}
              onUpdateAISettings={setAISettings}
              onSelectRoutine={handleSelectRoutine}
              onApplyAlarms={setAlarms}
              onSwitchTab={setActiveTab}
            />
          )}

          <AIDynamicUIBar
            theme={theme}
            currentConfig={dynamicUi}
            aiSettings={aiSettings}
            onApplyConfig={setDynamicUi}
            onClose={() => {}}
          />

          {/* Universal AI Co-Pilot & UI Compiler Drawer */}
          <AIChatDrawer
            isOpen={isAiChatOpen}
            onClose={() => setIsAiChatOpen(false)}
            theme={theme}
            currentUi={dynamicUi}
            aiSettings={aiSettings}
            onApplyUI={(newUi) => setDynamicUi(newUi)}
            onApplyAlarms={(newAlarms) => setAlarms((prev) => [...prev, ...newAlarms])}
            onApplyWorkout={(newWorkout) => handleSelectRoutine(newWorkout)}
          />
        </div>
      </div>
    </div>
  </div>
);
};

export default App;
