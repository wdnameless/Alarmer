import React, { useState, useEffect, useMemo } from 'react';
import { TitleBar } from './components/TitleBar';
import { ChatMessage } from './services/aiCompiler';
import { HandClock, HandGear, HandSparkle } from './components/CustomIcons';
import { AIChatDrawer } from './components/AIChatDrawer';
import { THEMES } from './constants/themes';
import { DashboardView, type SubModule } from './components/DashboardView';
import { SettingsView } from './components/SettingsView';
import { windowService } from './services/window';
import { soundService } from './services/sound';
import { NotificationService } from './services/notification';
import { ResizeHandles } from './components/ResizeHandles';
import { I18nService } from './services/i18n';
import { AppMode, ThemeId, AISettings, AlarmItem, Schedule, ThemeColors, DynamicUIConfig, TaskItem, SessionRecord, NoteItem } from './types';
import { StoreService } from './services/store';
import { buildFirings } from './services/scheduleEngine';
import { AlarmCenter, type MissedAlarm } from './components/AlarmCenter';
import { UpdateBanner } from './components/UpdateBanner';
import { trimSessions } from './services/session';
import { TimerService } from './services/timer';
import { checkForUpdate, type UpdateInfo } from './services/update';
import { ErrorBoundary } from './components/ErrorBoundary';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from './services/platform';

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
  const [themeKey, setThemeKey] = useState<ThemeId>(() =>
    StoreService.getPreference('alarmer_theme', 'winter' as ThemeId),
  );
  const [isCompact, setIsCompact] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [aiTimerMinutes] = useState<number | undefined>(undefined);
  const [dashboardSubModule, setDashboardSubModule] = useState<SubModule>('today');
  const [isAiWingOpen, setIsAiWingOpen] = useState<boolean>(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState<number>(() =>
    StoreService.getPreference('alarmer_left_pane_width', 340),
  );
  const [isResizingSplit, setIsResizingSplit] = useState<boolean>(false);
  /** Alarm volume and mute, held as state so the backend ringer follows changes. */
  const [alarmVolume, setAlarmVolume] = useState<number>(() =>
    StoreService.getPreference('alarmer_alarm_volume', 0.8),
  );
  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(() =>
    StoreService.getPreference('alarmer_alarm_enabled', true),
  );
  /** Alarms whose moment passed without ringing; shown until acknowledged. */
  const [missedAlarms, setMissedAlarms] = useState<MissedAlarm[]>([]);
  /** Gates writing until the stored file has been read, to avoid clobbering it. */
  const [hydrated, setHydrated] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const stored = StoreService.snapshot().chatMessages;
    if (stored.length > 0) return stored as unknown as ChatMessage[];
    return [welcomeMessage()];
  });
  // Dynamic AI-driven UI Configuration
  const [dynamicUi, setDynamicUi] = useState<DynamicUIConfig>(() => StoreService.snapshot().dynamicUi);


  const [aiSettings, setAISettings] = useState<AISettings>(() => StoreService.snapshot().aiSettings);

  /** Standalone alarms the user created directly. */
  const [alarms, setAlarmsState] = useState<AlarmItem[]>(() => StoreService.snapshot().alarms);

  /**
   * Writes the standalone alarm list, refusing derived entries.
   *
   * The alarm list renders `firings` — schedules expanded into alarms — so any
   * update built from what is on screen contains schedule steps too. Those are
   * recomputed from their schedule on every render, and persisting one would
   * store a stale copy as if the user had created it. The filter lives here
   * rather than at each call site so no screen can leak them by omission.
   */
  const setAlarms: React.Dispatch<React.SetStateAction<AlarmItem[]>> = (action) => {
    setAlarmsState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      return next.filter((a) => !a.scheduleId);
    });
  };
  /** Saved schedules — the primary object of the product. */
  const [schedules, setSchedules] = useState<Schedule[]>(() => StoreService.snapshot().schedules);
  /** Work the user intends to do, linked to schedule steps where applicable. */
  const [tasks, setTasks] = useState<TaskItem[]>(() => StoreService.snapshot().tasks);
  /** Log of completed focus sessions, the source of every statistic. */
  const [sessions, setSessions] = useState<SessionRecord[]>(() => StoreService.snapshot().sessions);
  /** Free-form and attached notes. */
  const [notes, setNotes] = useState<NoteItem[]>(() => StoreService.snapshot().notes);

  /**
   * What the scheduler actually receives: schedule steps expanded into firings,
   * plus the standalone alarms. Derived, never stored twice.
   */
  const firings = useMemo(() => buildFirings(schedules, alarms), [schedules, alarms]);

  // Single persistence funnel: structured state goes to the native store file.
  // Guarded until hydration completes, otherwise the initial defaults would be
  // written over the file before it has been read.
  useEffect(() => {
    if (!hydrated) return;
    void StoreService.persist({
      aiSettings,
      alarms,
      schedules,
      tasks,
      sessions,
      notes,
      dynamicUi,
      chatMessages: chatMessages as never,
    });
  }, [hydrated, aiSettings, alarms, schedules, tasks, sessions, notes, dynamicUi, chatMessages]);

  // Adopt the persisted store file on first mount (native file, not localStorage).
  useEffect(() => {
    StoreService.hydrate()
      .then((state) => {
        setAlarms(state.alarms);
        setSchedules(state.schedules);
        setTasks(state.tasks);
        setSessions(state.sessions);
        setNotes(state.notes);
        setAISettings(state.aiSettings);
        setDynamicUi(state.dynamicUi);
        if (state.chatMessages.length > 0) {
          setChatMessages(state.chatMessages as unknown as ChatMessage[]);
        }
        setHydrated(true);
      })
      .catch((e) => {
        console.warn('Failed to hydrate store:', e);
        setHydrated(true);
      });
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
  /** Opens the compact always-on-top overlay window. */
  const toggleMiniOverlay = () => {
    soundService.playUiClick();
    // The overlay is a second native window; a plain browser has no such thing.
    if (!isTauri()) return;
    void invoke('toggle_mini_overlay', { open: true }).catch((e) =>
      console.warn('mini overlay unavailable:', e),
    );
  };
  const toggleAiWing = async () => {
    soundService.playUiClick();
    const next = !isAiWingOpen;
    setIsAiWingOpen(next);
    await windowService.setCompanionWing(next);
  };

  /**
   * A one-shot alarm switches itself off in the backend the moment it rings, so
   * the frontend mirrors that instead of leaving a lit toggle for a dead alarm.
   */
  const handleAlarmConsumed = (id: string) => {
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: false } : a)));
  };

  /**
   * Records a finished focus session.
   *
   * This is the only place the session log grows, so the trim that keeps the
   * store file bounded lives here too rather than being forgotten at a call site.
   */
  const recordSession = (session: SessionRecord) => {
    setSessions((prev) => trimSessions([...prev, session]));
  };

  /**
   * Records completed countdowns.
   *
   * Subscribed here rather than inside the Timer view: the backend measures
   * focus, and a session must still land in the log when the timer runs while
   * the user is on another screen or the window is hidden.
   */
  useEffect(() => {
    return TimerService.onSession((event) => {
      recordSession({
        id: `timer_${event.ended_at_ms}`,
        label: 'Таймер',
        focusedSec: event.focused_secs,
        startedAt: new Date(event.started_at_ms).toISOString(),
        endedAt: new Date(event.ended_at_ms).toISOString(),
        completed: event.completed,
      });
    });
  }, []);

  /**
   * Collects alarms the backend had to skip, plus anything missed before this
   * window existed — an app that was closed through an alarm's minute still owes
   * the user that information.
   *
   * Runs after hydration: the backend only reports what it has been given, and
   * before the first sync it has been given nothing.
   */
  useEffect(() => {
    if (!isTauri() || !hydrated) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listen<MissedAlarm>('alarm://missed', (event) => {
      setMissedAlarms((prev) =>
        prev.some((m) => m.id === event.payload.id) ? prev : [...prev, event.payload],
      );
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    // The sync is an IPC round-trip, so the first tick that can report a missed
    // alarm may not have happened yet; ask again shortly after.
    const ask = () =>
      void invoke<MissedAlarm[]>('missed_alarms_today')
        .then((list) => {
          if (!cancelled && list.length > 0) setMissedAlarms(list);
        })
        .catch(() => {});

    ask();
    const retry = window.setTimeout(ask, 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      unlisten?.();
    };
  }, [hydrated]);

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
  /** Repaints the chrome when the interface language changes. */
  const [, setLangTick] = useState(0);
  useEffect(() => I18nService.subscribe(() => setLangTick((n) => n + 1)), []);

  /** A version found in the background, offered as a quiet bar. */
  const [pendingUpdate, setPendingUpdate] = useState<UpdateInfo | null>(null);

  /**
   * Looks for an update shortly after launch.
   *
   * Without this the app only ever updates if the user goes looking in
   * settings, which in practice means it does not update at all. Delayed so it
   * never competes with start-up work, and silent on failure — a background
   * check that cannot succeed is not worth interrupting anyone over.
   */
  useEffect(() => {
    if (!isTauri()) return;
    const timer = window.setTimeout(() => {
      void checkForUpdate().then((result) => {
        if (result.status === 'update') setPendingUpdate(result.info);
      });
    }, 8000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AlarmCenter
      theme={theme}
      firings={firings}
      schedules={schedules}
      alarmVolume={alarmVolume}
      alarmEnabled={alarmEnabled}
      onDisableAlarm={handleAlarmConsumed}
      onSession={recordSession}
      missed={missedAlarms}
      onDismissMissed={() => setMissedAlarms([])}
      hydrated={hydrated}
    >
    <div className="w-screen h-screen m-0 p-0 bg-transparent overflow-hidden select-none">
      <div
        className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-colors duration-200"
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
        }}
      >
        <ResizeHandles />
      {/* A newer version found in the background, offered quietly. */}
      <UpdateBanner
        theme={theme}
        version={pendingUpdate?.version ?? null}
        onOpenSettings={() => setActiveTab('settings')}
        onDismiss={() => setPendingUpdate(null)}
      />
      {/* Sleek Custom Windows / macOS Titlebar with Drag & Controls */}
      <TitleBar
        theme={theme}
        isCompact={isCompact}
        isPinned={isPinned}
        onToggleCompact={toggleCompact}
        onTogglePin={togglePin}
        onToggleOverlay={toggleMiniOverlay}
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
                  backgroundColor: activeTab === 'dashboard' ? 'rgba(255,255,255,0.07)' : 'transparent',
                  color: activeTab === 'dashboard' ? theme.text : theme.subtext,
                }}
                title={t.dashboard}
              >
                <HandClock size={15} color={activeTab === 'dashboard' ? theme.text : theme.subtext} />
                <span className="text-xs truncate">{t.dashboard}</span>
              </button>

              <button
                onClick={() => handleSelectTab('settings')}
                className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'settings' ? 'font-bold shadow-sm' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeTab === 'settings' ? 'rgba(255,255,255,0.07)' : 'transparent',
                  color: activeTab === 'settings' ? theme.text : theme.subtext,
                }}
                title={t.settings}
              >
                <HandGear size={15} color={activeTab === 'settings' ? theme.text : theme.subtext} />
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
                alarms={firings}
                schedules={schedules}
                onUpdateSchedules={setSchedules}
                aiSettings={aiSettings}
                /*
                 * `alarms` above is the expanded firing list, but only the
                 * standalone entries are real data — anything carrying a
                 * `scheduleId` is recomputed from its schedule on every render.
                 * `setAlarms` drops those, so no screen can persist a stale
                 * copy of a schedule step.
                 */
                onUpdateAlarms={setAlarms}
                onOpenAISettings={() => setActiveTab('settings')}
                timerMinutes={aiTimerMinutes}
                tasks={tasks}
                onUpdateTasks={setTasks}
                sessions={sessions}
                onSession={recordSession}
                notes={notes}
                onUpdateNotes={setNotes}
                activeSubModule={dashboardSubModule}
                onSubModuleChange={setDashboardSubModule}
              />
              </ErrorBoundary>
            )}
            {activeTab === 'settings' && (
              <ErrorBoundary theme={theme} fallbackTitle="Модуль настроек">
              <SettingsView
                theme={theme}
                themeKey={themeKey}
                onSelectTheme={(next) => {
                  setThemeKey(next);
                  StoreService.setPreference('alarmer_theme', next);
                }}
                alarmVolume={alarmVolume}
                alarmEnabled={alarmEnabled}
                onAlarmAudioChange={(volume, enabled) => {
                  setAlarmVolume(volume);
                  setAlarmEnabled(enabled);
                  StoreService.setPreference('alarmer_alarm_volume', volume);
                  StoreService.setPreference('alarmer_alarm_enabled', enabled);
                }}
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
          <div className="flex-1 h-full flex flex-row items-stretch border-l overflow-hidden relative" style={{ borderColor: theme.border }}>
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
            <div className="w-px h-full" style={{ backgroundColor: theme.border }} />
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
                onNavigateToModule={(mod: 'today' | 'timer' | 'alarms') => {
                  setDashboardSubModule(mod);
                  setActiveTab('dashboard');
                }}
                messages={chatMessages}
                onSendMessage={(msg: ChatMessage) => setChatMessages((prev) => [...prev, msg])}
                onSaveSchedule={(schedule: Schedule) => {
                  setSchedules((prev) => {
                    const withoutSameName = prev.filter((x) => x.name !== schedule.name);
                    return [...withoutSameName, schedule];
                  });
                }}
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
            {/* Calm at rest: the warm marker is reserved for the present moment
                in time, so this trigger only warms on hover. */}
            <div className="flex flex-col items-center space-y-1.5 opacity-55 group-hover:opacity-100 transition-opacity">
              <HandSparkle size={15} color={theme.subtext} className="group-hover:hidden" />
              <HandSparkle size={15} color={theme.accent} className="hidden group-hover:block" />
              <span
                className="text-[10px] font-bold tracking-wider uppercase"
                style={{ color: theme.subtext }}
              >
                AI
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
    </div>
    </AlarmCenter>
  );
};

export default App;
