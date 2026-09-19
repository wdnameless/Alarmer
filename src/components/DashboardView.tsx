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

      </div>
    </div>
  );
};
