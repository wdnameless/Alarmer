import React, { useState } from "react";
import { ThemeColors, DynamicUIConfig, AlarmItem, Schedule, AISettings, TaskItem, SessionRecord, NoteItem, Direction, BlockSettings } from "../types";
import { Timer } from "./Timer";
import { Alarms } from "./Alarms";
import { TodayView } from "./TodayView";
import { TasksView } from "./TasksView";
import { JournalView } from "./JournalView";
import { TimerService } from '../services/timer';
import { NotesView } from "./NotesView";
import { Timer as TimerIcon, Bell, CalendarDays, ListTodo, BookOpen, NotebookPen } from "lucide-react";
import { I18nService } from "../services/i18n";

/** Modules reachable from the dashboard. */
export type SubModule = 'today' | 'timer' | 'tasks' | 'alarms' | 'stats' | 'notes';

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
  onUpdateDirections?: (directions: Direction[]) => void;
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
  onUpdateDirections,
  onStartBlock,
  onRateQuality,
  blockSettings,
}) => {
  const [localSubModule, setLocalSubModule] = useState<SubModule>("today");
  const subModule = activeSubModule ?? localSubModule;
  const setSubModule = (mod: SubModule) => {
    setLocalSubModule(mod);
    onSubModuleChange?.(mod);
  };
  const t = I18nService.t();

  const tabs: Array<{ id: SubModule; label: string; title: string; icon: React.ReactNode }> = [
    { id: 'today', label: t.today, title: t.todayTitle, icon: <CalendarDays size={13} /> },
    { id: 'timer', label: t.timer, title: t.timerTitle, icon: <TimerIcon size={13} /> },
    { id: 'tasks', label: t.tasks, title: t.tasksTitle, icon: <ListTodo size={13} /> },
    { id: 'alarms', label: t.alarms, title: t.alarmsTitle, icon: <Bell size={13} /> },
    { id: 'stats', label: t.stats, title: t.statsTitle, icon: <BookOpen size={13} /> },
    { id: 'notes', label: 'Заметки', title: 'Заметки и описания', icon: <NotebookPen size={13} /> },
  ];

  return (
    <div className="flex flex-col items-center w-full h-full space-y-4">
      {/* Sub-selector Pills */}
      <div
        className="flex items-center w-full max-w-[340px] p-0.5 rounded-xl border text-xs font-semibold"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubModule(tab.id)}
            /* `min-w-0` is what lets a flex child shrink below its content
               width; without it the six labels pushed the row 24px past its own
               cap and the whole pane grew a horizontal scrollbar. */
            className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1 px-0.5 rounded-lg transition-all"
            style={{
              backgroundColor: subModule === tab.id ? "rgba(255,255,255,0.07)" : "transparent",
              color: subModule === tab.id ? theme.text : theme.subtext,
              fontWeight: subModule === tab.id ? 600 : 400,
            }}
            title={tab.title}
          >
            <span className="shrink-0 flex items-center">{tab.icon}</span>
            {/* The labels only fit once the pane is wide enough; below that the
                icons carry the meaning. */}
            <span className="hidden min-[380px]:inline text-[10px] truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Module Content.
          Every module stays mounted and inactive ones are hidden: unmounting
          used to destroy component-owned state, so leaving the Timer tab reset
          the countdown. */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <div className={`w-full flex-1 flex flex-col items-center justify-center ${subModule === 'today' ? '' : 'hidden'}`}>
          <TodayView
            theme={theme}
            schedules={schedules}
            onSession={onSession}
            directions={directions}
            sessions={sessions}
            onStartBlock={(dirId) => {
              // Arm the backend here as well as telling the parent: the parent
              // may not implement the callback at all, and a play button that
              // only switches tabs would look exactly like a broken block.
              void TimerService.setMode('block')
                .then(() => TimerService.setDirection(dirId))
                .then(() => TimerService.start())
                .catch(() => {
                  // Outside Tauri there is no backend to arm.
                });
              onStartBlock?.(dirId);
              setSubModule('timer');
            }}
            onNavigateToJournal={() => setSubModule('stats')}
            blockSettings={blockSettings}
          />
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
        <div className={`w-full flex-1 flex flex-col items-center justify-start overflow-y-auto ${subModule === 'stats' ? '' : 'hidden'}`}>
          <JournalView
            theme={theme}
            sessions={sessions}
            directions={directions}
            tasks={tasks}
            onUpdateDirections={onUpdateDirections}
          />
        </div>
      </div>
    </div>
  );
};
