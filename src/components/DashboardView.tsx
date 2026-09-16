import React, { useState } from "react";
import { ThemeColors, DynamicUIConfig, AlarmItem, Schedule, AISettings, TaskItem, SessionRecord } from "../types";
import { Timer } from "./Timer";
import { Alarms } from "./Alarms";
import { TodayView } from "./TodayView";
import { TasksView } from "./TasksView";
import { StatsView } from "./StatsView";
import { Timer as TimerIcon, Bell, CalendarDays, ListTodo, TrendingUp } from "lucide-react";
import { I18nService } from "../services/i18n";

/** Modules reachable from the dashboard. */
export type SubModule = 'today' | 'timer' | 'tasks' | 'alarms' | 'stats';

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
  timerMinutes,
  activeSubModule,
  onSubModuleChange,
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
    { id: 'stats', label: t.stats, title: t.statsTitle, icon: <TrendingUp size={13} /> },
  ];

  return (
    <div className="flex flex-col items-center w-full h-full space-y-4">
      {/* Sub-selector Pills */}
      <div
        className="flex items-center justify-between w-full max-w-[340px] p-0.5 rounded-xl border text-xs font-semibold overflow-hidden"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubModule(tab.id)}
            className="flex-1 flex items-center justify-center space-x-1 py-1 px-0.5 rounded-lg transition-all"
            style={{
              backgroundColor: subModule === tab.id ? "rgba(255,255,255,0.07)" : "transparent",
              color: subModule === tab.id ? theme.text : theme.subtext,
              fontWeight: subModule === tab.id ? 600 : 400,
            }}
            title={tab.title}
          >
            {tab.icon}
            {/* The labels only fit once the pane is wide enough; below that the
                icons carry the meaning. */}
            <span className="hidden min-[330px]:inline text-[10px] truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Module Content.
          Every module stays mounted and inactive ones are hidden: unmounting
          used to destroy component-owned state, so leaving the Timer tab reset
          the countdown. */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <div className={`w-full flex-1 flex flex-col items-center justify-center ${subModule === 'today' ? '' : 'hidden'}`}>
          <TodayView theme={theme} schedules={schedules} onSession={onSession} />
        </div>
        <div className={`w-full flex-1 flex flex-col items-center justify-center ${subModule === 'timer' ? '' : 'hidden'}`}>
          <Timer theme={theme} dynamicUi={dynamicUi} initialMinutes={timerMinutes} />
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
        <div className={`w-full flex-1 flex flex-col items-center justify-start overflow-y-auto ${subModule === 'stats' ? '' : 'hidden'}`}>
          <StatsView theme={theme} sessions={sessions} tasks={tasks} />
        </div>
      </div>
    </div>
  );
};
