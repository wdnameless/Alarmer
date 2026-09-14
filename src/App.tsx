import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { ChatMessage } from './services/aiCompiler';
import { HandClock, HandGear, HandSparkle } from './components/CustomIcons';
import { AIChatDrawer } from './components/AIChatDrawer';
import { THEMES } from './constants/themes';
import { DashboardView } from './components/DashboardView';
import { SettingsView } from './components/SettingsView';
import { windowService } from './services/window';
import { soundService } from './services/sound';
import { NotificationService } from './services/notification';
import { ResizeHandles } from './components/ResizeHandles';
import { I18nService } from './services/i18n';
import { AppMode, ThemeKey, AISettings, AlarmItem, ThemeColors, DynamicUIConfig } from './types';
import { StoreService } from './services/store';
import { ErrorBoundary } from './components/ErrorBoundary';

/** First message shown in a brand-new conversation. */
function welcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    sender: 'assistant',
    text: 'Привет! Я твой AI Co-Pilot. Я умею управлять будильниками, настраивать таймеры и динамически менять интерфейс приложения. Чем могу помочь?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export const App: React.FC = () => {
  // App state
  const [activeTab, setActiveTab] = useState<AppMode>('dashboard');
  const [themeKey] = useState<ThemeKey>('dark-neon');
  const [isCompact, setIsCompact] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [aiTimerMinutes] = useState<number | undefined>(undefined);
  const [dashboardSubModule, setDashboardSubModule] = useState<"timer" | "workout" | "stopwatch" | "alarms">("timer");
  const [isAiWingOpen, setIsAiWingOpen] = useState<boolean>(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState<number>(() =>
    StoreService.getPreference('alarmer_left_pane_width', 340),
  );
  const [isResizingSplit, setIsResizingSplit] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const stored = StoreService.snapshot().chatMessages;
    if (stored.length > 0) return stored as unknown as ChatMessage[];
    return [welcomeMessage()];
  });
  // Dynamic AI-driven UI Configuration
  const [dynamicUi, setDynamicUi] = useState<DynamicUIConfig>(() => StoreService.snapshot().dynamicUi);


  const [aiSettings, setAISettings] = useState<AISettings>(() => StoreService.snapshot().aiSettings);

  const [alarms, setAlarms] = useState<AlarmItem[]>(() => StoreService.snapshot().alarms);

  // Single persistence funnel: structured state goes to the native store file.
  useEffect(() => {
    void StoreService.persist({ aiSettings, alarms, dynamicUi, chatMessages: chatMessages as never });
  }, [aiSettings, alarms, dynamicUi, chatMessages]);

  // Adopt the persisted store file on first mount (native file, not localStorage).
  useEffect(() => {
    StoreService.hydrate()
      .then((state) => {
        setAlarms(state.alarms);
        setAISettings(state.aiSettings);
        setDynamicUi(state.dynamicUi);
        if (state.chatMessages.length > 0) {
          setChatMessages(state.chatMessages as unknown as ChatMessage[]);
        }
      })
      .catch((e) => console.warn('Failed to hydrate store:', e));
  }, []);

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
  const toggleAiWing = async () => {
    soundService.playUiClick();
    const next = !isAiWingOpen;
    setIsAiWingOpen(next);
    await windowService.setCompanionWing(next);
  };

  // Mouse drag handlers for splitter between Dashboard and AI Wing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSplit) return;
      const clamped = Math.max(260, Math.min(540, e.clientX));
      setLeftPaneWidth(clamped);
      StoreService.setPreference('alarmer_left_pane_width', clamped);
    };

    const handleMouseUp = () => {
      if (isResizingSplit) {
        setIsResizingSplit(false);
      }
    };

    if (isResizingSplit) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSplit]);

  const handleSelectTab = (tab: AppMode) => {
    soundService.playUiClick();
    setActiveTab(tab);
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
        {/* Left Pane: Timer / Settings (Clean, Fixed 340px primary surface) */}
        <div
          className="flex flex-col items-center justify-between p-3 overflow-y-auto shrink-0 transition-all"
          style={{ width: isAiWingOpen ? `${leftPaneWidth}px` : '100%' }}
        >
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
              <ErrorBoundary theme={theme} fallbackTitle="Модуль таймера">
              <DashboardView
                theme={theme}
                dynamicUi={dynamicUi}
                alarms={alarms}
                aiSettings={aiSettings}
                onUpdateAlarms={setAlarms}
                onOpenAISettings={() => setActiveTab('settings')}
                timerMinutes={aiTimerMinutes}
                activeSubModule={dashboardSubModule}
                onSubModuleChange={setDashboardSubModule}
              />
              </ErrorBoundary>
            )}
            {activeTab === 'settings' && (
              <ErrorBoundary theme={theme} fallbackTitle="Модуль настроек">
              <SettingsView
                theme={theme}
                aiSettings={aiSettings}
                onUpdateAISettings={setAISettings}
                onUpdateUI={setDynamicUi}
              />
              </ErrorBoundary>
            )}
          </div>
        </div>

        {/* Right Wing: Attached Companion AI Module */}
        {isAiWingOpen && (
          <div className="flex-1 h-full flex flex-row items-stretch border-l overflow-hidden relative" style={{ borderColor: `${theme.accent}30` }}>
            {/* Interactive Drag Handle to resize panels */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingSplit(true);
              }}
              className="w-2 hover:w-2.5 -ml-1 h-full cursor-col-resize z-50 flex items-center justify-center group transition-all"
              title="Потяните, чтобы изменить ширину колонок"
            >
              <div className="w-[2px] h-12 rounded-full bg-white/20 group-hover:bg-white/80 transition-colors" />
            </div>
            <div className="w-[2px] bg-gradient-to-b from-transparent via-current to-transparent opacity-30" style={{ color: theme.accent }} />
            <div className="flex-1 h-full flex flex-col overflow-hidden">
              <ErrorBoundary theme={theme} fallbackTitle="AI Co-Pilot">
              <AIChatDrawer
                isOpen={true}
                onClose={toggleAiWing}
                theme={theme}
                currentUi={dynamicUi}
                aiSettings={aiSettings}
                onApplyUI={(newUi: DynamicUIConfig) => {
                  setDynamicUi({
                    ...newUi,
                    layout: {
                      ...dynamicUi.layout,
                      ...(newUi.layout || {}),
                    },
                    colors: {
                      ...dynamicUi.colors,
                      ...(newUi.colors || {}),
                    },
                  });
                }}
                onApplyAlarms={(newAlarms: AlarmItem[]) => setAlarms((prev) => [...prev, ...newAlarms])}
                onSetTimerMinutes={() => {
                  setDashboardSubModule('timer');
                  setActiveTab('dashboard');
                }}
                onNavigateToModule={(mod: 'timer' | 'workout' | 'stopwatch' | 'alarms') => {
                  setDashboardSubModule(mod);
                  setActiveTab('dashboard');
                }}
                messages={chatMessages}
                onSendMessage={(msg: ChatMessage) => setChatMessages((prev) => [...prev, msg])}
                onResetChat={() => {
                  const cleanChat: ChatMessage[] = [
                    {
                      id: Date.now().toString(),
                      sender: 'assistant',
                      text: 'Новый чат начат! Чем могу помочь? (Расписание тренировок, будильники, таймеры или настройка интерфейса)',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ];
                  setChatMessages(cleanChat);
                  void StoreService.persist({ chatMessages: cleanChat as never });
                }}
              />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* Sleek Upright Side Toggle Button on Right Edge */}
        {!isAiWingOpen && (
          <button
            onClick={toggleAiWing}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 flex items-center space-x-1.5 py-3 px-2 rounded-l-xl border border-r-0 shadow-2xl backdrop-blur-md transition-all active:scale-95 group hover:px-2.5"
            style={{
              backgroundColor: `${theme.cardBg}F2`,
              borderColor: theme.border,
            }}
            title="Раскрыть монолитный блок AI Co-Pilot"
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
