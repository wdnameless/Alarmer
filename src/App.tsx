import React, { useState, useEffect } from 'react';
import {
  Timer as TimerIcon,
  Sparkles,
  Settings as SettingsIcon,
} from 'lucide-react';
import { TitleBar } from './components/TitleBar';

import { AITrainer } from './components/AITrainer';
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
import { DynamicUIConfig, DEFAULT_DYNAMIC_UI } from './types';

export const App: React.FC = () => {
  // App state
  const [activeTab, setActiveTab] = useState<AppMode>('dashboard');
  const [themeKey] = useState<ThemeKey>('dark-neon');
  const [isCompact, setIsCompact] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
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
        onOpenAIChat={() => setIsAiChatOpen(true)}
      />
      {/* Main App Container */}
      <div className="flex-1 flex flex-col items-center justify-between p-3 overflow-y-auto">
        {/* Navigation Tabs (Hidden in ultra-compact view for floating pill look) */}
        {true && (
          <div
            className="flex items-center justify-between w-full p-1 mb-2 rounded-xl border transition-colors"
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
                title="Дашборд"
              >
                <TimerIcon size={15} />
                <span className="text-xs hidden min-[280px]:inline truncate">Дашборд</span>
              </button>

              <button
                onClick={() => handleSelectTab('ai')}
                className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'ai' ? 'font-bold shadow-sm' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeTab === 'ai' ? `${theme.accent}25` : 'transparent',
                  color: activeTab === 'ai' ? theme.accent : theme.text,
                }}
                title="AI Co-Pilot"
              >
                <Sparkles size={15} />
                <span className="text-xs hidden min-[280px]:inline truncate">AI</span>
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
                title="Настройки"
              >
                <SettingsIcon size={15} />
                <span className="text-xs hidden min-[280px]:inline truncate">Опции</span>
              </button>
            </div>
          </div>
        )}
        {/* Content Area Rendering by active Tab */}
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
              onSelectRoutine={setSelectedRoutine}
              onOpenAISettings={() => setActiveTab('settings')}
            />
          )}
          {activeTab === 'ai' && (
            <AITrainer
              theme={theme}
              aiSettings={aiSettings}
              currentUi={dynamicUi}
              alarms={alarms}
              onUpdateAISettings={setAISettings}
              onSelectRoutine={handleSelectRoutine}
              onApplyAlarms={setAlarms}
              onApplyUI={(newUi) => setDynamicUi(newUi)}
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
