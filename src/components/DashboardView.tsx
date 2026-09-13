import React, { useState } from "react";
import { ThemeColors, DynamicUIConfig, AlarmItem, WorkoutRoutine, AISettings } from "../types";
import { Timer } from "./Timer";
import { Stopwatch } from "./Stopwatch";
import { WorkoutPlayer } from "./WorkoutPlayer";
import { Alarms } from "./Alarms";
import { Timer as TimerIcon, Watch, Flame, Bell } from "lucide-react";

interface DashboardViewProps {
  theme: ThemeColors;
  dynamicUi: DynamicUIConfig;
  alarms: AlarmItem[];
  routines: WorkoutRoutine[];
  selectedRoutine: WorkoutRoutine;
  aiSettings: AISettings;
  onUpdateAlarms: (alarms: AlarmItem[]) => void;
  onSelectRoutine: (routine: WorkoutRoutine) => void;
  onOpenAISettings: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  theme,
  dynamicUi,
  alarms,
  routines,
  selectedRoutine,
  aiSettings,
  onUpdateAlarms,
  onSelectRoutine,
  onOpenAISettings,
}) => {
  const [subModule, setSubModule] = useState<"timer" | "workout" | "stopwatch" | "alarms">("timer");

  return (
    <div className="flex flex-col items-center w-full h-full space-y-3">
      {/* Sub-selector Pills */}
      <div
        className="flex items-center p-1 rounded-xl border text-xs font-semibold space-x-1"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
        }}
      >
        <button
          onClick={() => setSubModule("timer")}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all"
          style={{
            backgroundColor: subModule === "timer" ? theme.accent : "transparent",
            color: subModule === "timer" ? "#000" : theme.text,
            fontWeight: subModule === "timer" ? 700 : 500,
          }}
        >
          <TimerIcon size={14} />
          <span>Таймер</span>
        </button>

        <button
          onClick={() => setSubModule("workout")}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all"
          style={{
            backgroundColor: subModule === "workout" ? theme.accent : "transparent",
            color: subModule === "workout" ? "#000" : theme.text,
            fontWeight: subModule === "workout" ? 700 : 500,
          }}
        >
          <Flame size={14} />
          <span>Тренировка</span>
        </button>

        <button
          onClick={() => setSubModule("stopwatch")}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all"
          style={{
            backgroundColor: subModule === "stopwatch" ? theme.accent : "transparent",
            color: subModule === "stopwatch" ? "#000" : theme.text,
            fontWeight: subModule === "stopwatch" ? 700 : 500,
          }}
        >
          <Watch size={14} />
          <span>Секундомер</span>
        </button>

        <button
          onClick={() => setSubModule("alarms")}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all"
          style={{
            backgroundColor: subModule === "alarms" ? theme.accent : "transparent",
            color: subModule === "alarms" ? "#000" : theme.text,
            fontWeight: subModule === "alarms" ? 700 : 500,
          }}
        >
          <Bell size={14} />
          <span>Будильники</span>
        </button>
      </div>

      {/* Main Module Content */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        {subModule === "timer" && <Timer theme={theme} dynamicUi={dynamicUi} />}
        {subModule === "workout" && (
          <div className="flex flex-col w-full space-y-3">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full">
              {routines.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelectRoutine(r)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border"
                  style={{
                    backgroundColor: selectedRoutine.id === r.id ? theme.accent : theme.cardBg,
                    color: selectedRoutine.id === r.id ? "#000" : theme.text,
                    borderColor: theme.border,
                  }}
                >
                  {r.name}
                </button>
              ))}
            </div>
            <WorkoutPlayer theme={theme} routine={selectedRoutine} />
          </div>
        )}
        {subModule === "stopwatch" && <Stopwatch theme={theme} />}
        {subModule === "alarms" && (
          <Alarms
            theme={theme}
            alarms={alarms}
            aiSettings={aiSettings}
            onUpdateAlarms={onUpdateAlarms}
            onOpenAISettings={onOpenAISettings}
          />
        )}
      </div>
    </div>
  );
};
