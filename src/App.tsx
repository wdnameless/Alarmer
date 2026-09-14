import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { ChatMessage } from './services/aiCompiler';
import { HandClock, HandGear, HandSparkle } from './components/CustomIcons';
import { AppMode, ThemeKey, AISettings, AlarmItem, WorkoutRoutine, ThemeColors } from './types';
import { THEMES } from './constants/themes';
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_ALARMS,
  DEFAULT_WORKOUT_ROUTINES,
} from './constants/defaults';
import { DashboardView } from './components/DashboardView';
import { SettingsView } from './components/SettingsView';
import { windowService } from './services/window';
import { soundService } from './services/sound';
import { NotificationService } from './services/notification';
import { ResizeHandles } from './components/ResizeHandles';
import { AIChatDrawer } from './components/AIChatDrawer';
import { I18nService } from './services/i18n';
import { DynamicUIConfig, DEFAULT_DYNAMIC_UI } from './types';

export const App: React.FC = () => {
  // App state
  const [activeTab, setActiveTab] = useState<AppMode>('dashboard');
  const [themeKey] = useState<ThemeKey>('dark-neon');
  const [isCompact, setIsCompact] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiTimerMinutes, setAiTimerMinutes] = useState<number | undefined>(undefined);
  const [dashboardSubModule, setDashboardSubModule] = useState<"timer" | "workout" | "stopwatch" | "alarms">("timer");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('alarmer_chat_history');
      return saved ? JSON.parse(saved) : [
        {
          id: '1',
          sender: 'assistant',
          text: 'Привет! Я твой AI Co-Pilot. Я умею управлять будильниками, создавать программы тренировок (HIIT, Табата), настраивать таймеры и динамически менять интерфейс приложения. Чем могу помочь?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    } catch {
      return [
        {
          id: '1',
          sender: 'assistant',
          text: 'Привет! Я твой AI Co-Pilot. Я умею управлять будильниками, создавать программы тренировок (HIIT, Табата), настраивать таймеры и динамически менять интерфейс приложения. Чем могу помочь?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    }
  });

  useEffect(() => {
    localStorage.setItem('alarmer_chat_history', JSON.stringify(chatMessages));
  }, [chatMessages]);
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
    soundService.playUiClick();
    setIsCompact((prev) => {
      const next = !prev;
      if (next) {
        setActiveTab('dashboard');
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
    soundService.playUiClick();
    setActiveTab(tab);
  };

  const handleSelectRoutine = (routine: WorkoutRoutine) => {
    // Add to routines list if not present
    if (!routines.find((r) => r.id === routine.id)) {
      setRoutines([routine, ...routines]);
    }
    setSelectedRoutine(routine);
    setActiveTab('dashboard');
  };

  // Effective theme computed from base theme + dynamic UI overrides
  const baseTheme = THEMES[themeKey];
  const theme: ThemeColors = {
    ...baseTheme,
    ...dynamicUi.colors,
    id: themeKey,
  };
  const t = I18nService.t();

  return (
    <div className="w-screen h-screen m-0 p-0 bg-transparent overflow-hidden select-none">
      <div
        className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-colors duration-200"
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
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
      />
      {/* Main App Container */}
      {/* Main Split Layout: Left Primary Surface + Right Side AI Sidebar */}
      <div className="flex-1 flex w-full h-full overflow-hidden relative">
        {/* Left Pane: Timer / Settings */}
        <div className="flex-1 flex flex-col items-center justify-between p-3 overflow-y-auto min-w-0 transition-all duration-300">
          {/* Navigation Tabs */}
          <div
            className="flex items-center justify-between w-full max-w-[340px] p-1 mb-2 rounded-xl border transition-colors"
            style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
          >
            <div className="flex items-center space-x-1.5 flex-1">
              <button
                onClick={() => handleSelectTab('dashboard')}
                className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'dashboard' ? 'font-bold shadow-sm' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeTab === 'dashboard' ? `${theme.accent}25` : 'transparent',
                  color: activeTab === 'dashboard' ? theme.accent : theme.text,
                }}
                title={t.dashboard}
              >
                <HandClock size={15} color={activeTab === 'dashboard' ? theme.accent : theme.text} />
                <span className="text-xs truncate">{t.dashboard}</span>
              </button>

              <button
                onClick={() => handleSelectTab('settings')}
                className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'settings' ? 'font-bold shadow-sm' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeTab === 'settings' ? `${theme.accent}25` : 'transparent',
                  color: activeTab === 'settings' ? theme.accent : theme.text,
                }}
                title={t.settings}
              >
                <HandGear size={15} color={activeTab === 'settings' ? theme.accent : theme.text} />
                <span className="text-xs truncate">{t.settings}</span>
              </button>
            </div>
          </div>

          {/* Content Area Rendering */}
          <div className="w-full flex-1 flex flex-col items-center justify-center">
            {activeTab === 'dashboard' && (
              <DashboardView
                theme={theme}
                dynamicUi={dynamicUi}
                alarms={alarms}
                routines={routines}
                selectedRoutine={selectedRoutine}
                aiSettings={aiSettings}
                onUpdateAlarms={setAlarms}
                onSelectRoutine={handleSelectRoutine}
                onOpenAISettings={() => setActiveTab('settings')}
                timerMinutes={aiTimerMinutes}
                activeSubModule={dashboardSubModule}
                onSubModuleChange={setDashboardSubModule}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView
                theme={theme}
                aiSettings={aiSettings}
                currentUi={dynamicUi}
                onUpdateAISettings={setAISettings}
                onUpdateUI={setDynamicUi}
              />
            )}
          </div>
        </div>

        {/* Right Pane: Split Sidebar for AI Chat */}
        {isAiChatOpen && (
          <div className="w-[320px] max-w-[85vw] h-full border-l flex flex-col z-30 transition-all duration-300" style={{ borderColor: theme.border }}>
            <AIChatDrawer
              isOpen={isAiChatOpen}
              onClose={() => setIsAiChatOpen(false)}
              theme={theme}
              currentUi={dynamicUi}
              aiSettings={aiSettings}
              onApplyUI={(newUi) => setDynamicUi(newUi)}
              onApplyAlarms={(newAlarms) => setAlarms((prev) => [...prev, ...newAlarms])}
              onApplyWorkout={(newWorkout) => handleSelectRoutine(newWorkout)}
              onSetTimerMinutes={(mins) => {
                setAiTimerMinutes(mins);
                setDashboardSubModule('timer');
                setActiveTab('dashboard');
              }}
              onNavigateToModule={(mod) => {
                setDashboardSubModule(mod);
                setActiveTab('dashboard');
              }}
              messages={chatMessages}
              onSendMessage={(msg) => setChatMessages((prev) => [...prev, msg])}
            />
          </div>
        )}

        {/* Sleek Upright Side Toggle Button on Right Edge */}
        {!isAiChatOpen && (
          <button
            onClick={() => {
              soundService.playUiClick();
              setIsAiChatOpen(true);
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 flex items-center space-x-1.5 py-3 px-2 rounded-l-xl border border-r-0 shadow-2xl backdrop-blur-md transition-all active:scale-95 group hover:px-2.5"
            style={{
              backgroundColor: `${theme.cardBg}F2`,
              borderColor: theme.border,
            }}
            title="Открыть AI Co-Pilot"
          >
            <div className="flex flex-col items-center space-y-1.5">
              <HandSparkle size={15} color={theme.accent} className="animate-pulse" />
              <span
                className="text-[10px] font-bold tracking-wider uppercase opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ color: theme.accent }}
              >
                AI
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  </div>
);
};

export default App;
