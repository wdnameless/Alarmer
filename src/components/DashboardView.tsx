import { Plus, X, LayoutGrid, Timer as TimerIcon, Bell, ListTodo, NotebookPen } from "lucide-react";
import { StoreService } from "../services/store";
import React, { useState } from "react";
import { ThemeColors, DynamicUIConfig, AlarmItem, Schedule, AISettings, TaskItem, SessionRecord, NoteItem, Direction, BlockSettings } from "../types";
import { Timer } from "./Timer";
import { Alarms } from "./Alarms";
import { TodayView } from "./TodayView";
import { TasksView } from "./TasksView";
import { TimerService } from '../services/timer';
import { NotesView } from "./NotesView";

/** Modules reachable from the dashboard. */
export type SubModule = 'today' | 'timer' | 'tasks' | 'alarms' | 'notes';

interface DashboardViewProps {
  theme: ThemeColors;
  dynamicUi: DynamicUIConfig;
  alarms: AlarmItem[];
  schedules: Schedule[];
  onUpdateSchedules: (schedules: Schedule[]) => void;
  aiSettings: AISettings;
  onUpdateAlarms: (alarms: AlarmItem[]) => void;
  onOpenAISettings: () => void;
  tasks: TaskItem[];
  onUpdateTasks: (tasks: TaskItem[]) => void;
  sessions: SessionRecord[];
  onSession: (session: SessionRecord) => void;
  timerMinutes?: number;
  activeSubModule?: SubModule;
  onSubModuleChange?: (sub: SubModule) => void;
  notes: NoteItem[];
  onUpdateNotes: (notes: NoteItem[]) => void;
  directions?: Direction[];
  onStartBlock?: (directionId: string) => void;
  onRateQuality?: (quality: number) => void;
  blockSettings?: BlockSettings;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  theme,
  dynamicUi,
  alarms,
  schedules,
  onUpdateSchedules,
  aiSettings,
  onUpdateAlarms,
  onOpenAISettings,
  tasks,
  onUpdateTasks,
  sessions,
  onSession,
  notes,
  onUpdateNotes,
  timerMinutes,
  activeSubModule,
  onSubModuleChange,
  directions = [],
  onStartBlock,
  onRateQuality,
  blockSettings,
}) => {
  const [localSubModule, setLocalSubModule] = useState<SubModule>("today");
  const [activeWidgets, setActiveWidgets] = useState<string[]>(() => {
    try {
      const raw = StoreService.getPreference<string>('alarmer_dashboard_widgets', '["timer","tasks","alarms","notes"]');
      return JSON.parse(raw);
    } catch {
      return ['timer', 'tasks', 'alarms', 'notes'];
    }
  });
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);

  const toggleWidget = (widgetId: string) => {
    setActiveWidgets((prev) => {
      const next = prev.includes(widgetId) ? prev.filter((id) => id !== widgetId) : [...prev, widgetId];
      StoreService.setPreference('alarmer_dashboard_widgets', JSON.stringify(next));
      return next;
    });
  };
  const subModule = activeSubModule ?? localSubModule;
  const setSubModule = (mod: SubModule) => {
    setLocalSubModule(mod);
    onSubModuleChange?.(mod);
  };



  return (
    <div className="flex flex-col items-center w-full h-full space-y-4">


      {/* Main Module Content.
          Every module stays mounted and inactive ones are hidden: unmounting
          used to destroy component-owned state, so leaving the Timer tab reset
          the countdown. */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <div className={`w-full flex-1 flex flex-col items-center justify-start overflow-y-auto ${subModule === 'today' ? '' : 'hidden'}`}>
          {/* Dashboard Header with Add Widget button */}
          <div className="w-full max-w-4xl flex items-center justify-between px-6 pt-4 pb-2">
            <div className="flex items-center space-x-2">
              <LayoutGrid size={18} style={{ color: theme.accent }} />
              <h2 className="text-base font-bold tracking-tight" style={{ color: theme.text }}>
                Доска виджетов
              </h2>
            </div>
            <button
              onClick={() => setShowWidgetPicker(!showWidgetPicker)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
              style={{
                backgroundColor: showWidgetPicker ? theme.accent : theme.surface,
                borderColor: theme.border,
                color: showWidgetPicker ? '#0a0a0a' : theme.text,
              }}
            >
              {showWidgetPicker ? <X size={14} /> : <Plus size={14} />}
              <span>{showWidgetPicker ? 'Закрыть' : 'Настроить виджеты'}</span>
            </button>
          </div>

          {/* Widget Picker Modal / Drawer */}
          {showWidgetPicker && (
            <div
              className="w-full max-w-4xl p-4 mb-4 rounded-2xl border flex flex-wrap gap-2.5 transition-all animate-in fade-in slide-in-from-top-2 duration-200"
              style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
            >
              {[
                { id: 'timer', label: 'Таймер', icon: <TimerIcon size={14} /> },
                { id: 'tasks', label: 'Задачи', icon: <ListTodo size={14} /> },
                { id: 'alarms', label: 'Будильники', icon: <Bell size={14} /> },
                { id: 'notes', label: 'Заметки', icon: <NotebookPen size={14} /> },
              ].map((w) => {
                const active = activeWidgets.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    className="flex items-center space-x-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all"
                    style={{
                      backgroundColor: active ? theme.surface : 'transparent',
                      borderColor: active ? theme.accent : theme.border,
                      color: active ? theme.accent : theme.subtext,
                    }}
                  >
                    {w.icon}
                    <span>{w.label}</span>
                    <span className="text-[10px] ml-1 opacity-70">
                      {active ? '✓ Включен' : '+ Добавить'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Today Overview Card */}
          <div className="w-full max-w-4xl px-6 pb-6">
            <TodayView
              theme={theme}
              schedules={schedules}
              onSession={onSession}
              directions={directions}
              sessions={sessions}
              onStartBlock={(dirId) => {
                void TimerService.setMode('block')
                  .then(() => TimerService.setDirection(dirId))
                  .then(() => TimerService.start())
                  .catch(() => {});
                onStartBlock?.(dirId);
                setSubModule('timer');
              }}
              blockSettings={blockSettings}
            />

            {/* Modular Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {activeWidgets.includes('timer') && (
                <div
                  className="rounded-3xl p-5 border flex flex-col items-center justify-center min-h-[320px] transition-all"
                  style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
                >
                  <div className="w-full flex items-center justify-between pb-3 mb-2 border-b" style={{ borderColor: theme.border }}>
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: theme.accent }}>
                      <TimerIcon size={14} /> Таймер
                    </span>
                    <button
                      onClick={() => toggleWidget('timer')}
                      className="p-1 rounded-lg hover:bg-white/10 opacity-50 hover:opacity-100 transition-colors"
                      title="Скрыть виджет"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <Timer
                    theme={theme}
                    dynamicUi={dynamicUi}
                    initialMinutes={timerMinutes}
                    directions={directions}
                    onRateQuality={onRateQuality}
                  />
                </div>
              )}

              {activeWidgets.includes('tasks') && (
                <div
                  className="rounded-3xl p-5 border flex flex-col min-h-[320px] transition-all"
                  style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
                >
                  <div className="w-full flex items-center justify-between pb-3 mb-2 border-b" style={{ borderColor: theme.border }}>
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: theme.accent }}>
                      <ListTodo size={14} /> Задачи
                    </span>
                    <button
                      onClick={() => toggleWidget('tasks')}
                      className="p-1 rounded-lg hover:bg-white/10 opacity-50 hover:opacity-100 transition-colors"
                      title="Скрыть виджет"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <TasksView
                    theme={theme}
                    tasks={tasks}
                    onUpdateTasks={onUpdateTasks}
                    schedules={schedules}
                  />
                </div>
              )}

              {activeWidgets.includes('alarms') && (
                <div
                  className="rounded-3xl p-5 border flex flex-col min-h-[320px] transition-all"
                  style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
                >
                  <div className="w-full flex items-center justify-between pb-3 mb-2 border-b" style={{ borderColor: theme.border }}>
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: theme.accent }}>
                      <Bell size={14} /> Будильники
                    </span>
                    <button
                      onClick={() => toggleWidget('alarms')}
                      className="p-1 rounded-lg hover:bg-white/10 opacity-50 hover:opacity-100 transition-colors"
                      title="Скрыть виджет"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <Alarms
                    theme={theme}
                    alarms={alarms}
                    schedules={schedules}
                    onUpdateSchedules={onUpdateSchedules}
                    aiSettings={aiSettings}
                    onUpdateAlarms={onUpdateAlarms}
                    onOpenAISettings={onOpenAISettings}
                    dynamicUi={dynamicUi}
                  />
                </div>
              )}

              {activeWidgets.includes('notes') && (
                <div
                  className="rounded-3xl p-5 border flex flex-col min-h-[320px] transition-all"
                  style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
                >
                  <div className="w-full flex items-center justify-between pb-3 mb-2 border-b" style={{ borderColor: theme.border }}>
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: theme.accent }}>
                      <NotebookPen size={14} /> Заметки
                    </span>
                    <button
                      onClick={() => toggleWidget('notes')}
                      className="p-1 rounded-lg hover:bg-white/10 opacity-50 hover:opacity-100 transition-colors"
                      title="Скрыть виджет"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <NotesView
                    theme={theme}
                    notes={notes}
                    onUpdateNotes={onUpdateNotes}
                    alarms={alarms}
                    schedules={schedules}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={`w-full flex-1 flex flex-col items-center justify-center ${subModule === 'timer' ? '' : 'hidden'}`}>
          <Timer
            theme={theme}
            dynamicUi={dynamicUi}
            initialMinutes={timerMinutes}
            directions={directions}
            onRateQuality={onRateQuality}
          />
        </div>
        <div className={`w-full flex-1 flex flex-col items-center justify-start overflow-y-auto ${subModule === 'tasks' ? '' : 'hidden'}`}>
          <TasksView
            theme={theme}
            tasks={tasks}
            onUpdateTasks={onUpdateTasks}
            schedules={schedules}
          />
        </div>
        <div className={`w-full flex-1 flex flex-col items-center justify-center ${subModule === 'alarms' ? '' : 'hidden'}`}>
          <Alarms
            theme={theme}
            alarms={alarms}
            schedules={schedules}
            onUpdateSchedules={onUpdateSchedules}
            aiSettings={aiSettings}
            onUpdateAlarms={onUpdateAlarms}
            onOpenAISettings={onOpenAISettings}
            dynamicUi={dynamicUi}
          />
        </div>
        <div className={`w-full flex-1 flex flex-col items-center justify-start overflow-y-auto ${subModule === 'notes' ? '' : 'hidden'}`}>
          <NotesView
            theme={theme}
            notes={notes}
            onUpdateNotes={onUpdateNotes}
            alarms={alarms}
            schedules={schedules}
          />
        </div>

      </div>
    </div>
  );
};
