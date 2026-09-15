import React, { useState } from "react";
import { ThemeColors, DynamicUIConfig, AlarmItem, Schedule, AISettings } from "../types";
import { Timer } from "./Timer";
import { Alarms } from "./Alarms";
import { TodayView } from "./TodayView";
import { Timer as TimerIcon, Bell, CalendarDays } from "lucide-react";
import { I18nService } from "../services/i18n";

interface DashboardViewProps {
  theme: ThemeColors;
  dynamicUi: DynamicUIConfig;
  alarms: AlarmItem[];
  schedules: Schedule[];
  onUpdateSchedules: (schedules: Schedule[]) => void;
  aiSettings: AISettings;
  onUpdateAlarms: (alarms: AlarmItem[]) => void;
  onOpenAISettings: () => void;
  timerMinutes?: number;
  activeSubModule?: "today" | "timer" | "alarms";
  onSubModuleChange?: (sub: "today" | "timer" | "alarms") => void;
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
  timerMinutes,
  activeSubModule,
  onSubModuleChange,
}) => {
  const [localSubModule, setLocalSubModule] = useState<"today" | "timer" | "alarms">("today");
  const subModule = activeSubModule ?? localSubModule;
  const setSubModule = (mod: "today" | "timer" | "alarms") => {
    setLocalSubModule(mod);
    onSubModuleChange?.(mod);
  };
  const t = I18nService.t();

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
        <button
          onClick={() => setSubModule("today")}
          className="flex-1 flex items-center justify-center space-x-1 py-1 px-1 rounded-lg transition-all"
          style={{
            backgroundColor: subModule === "today" ? "rgba(255,255,255,0.07)" : "transparent",
            color: subModule === "today" ? theme.text : theme.subtext,
            fontWeight: subModule === "today" ? 600 : 400,
          }}
          title="Что сейчас и что дальше"
        >
          <CalendarDays size={13} />
          <span className="hidden min-[290px]:inline text-[11px]">Сегодня</span>
        </button>

        <button
          onClick={() => setSubModule("timer")}
          className="flex-1 flex items-center justify-center space-x-1 py-1 px-1 rounded-lg transition-all"
          style={{
            backgroundColor: subModule === "timer" ? "rgba(255,255,255,0.07)" : "transparent",
            color: subModule === "timer" ? theme.text : theme.subtext,
            fontWeight: subModule === "timer" ? 600 : 400,
          }}
          title="Таймер"
        >
          <TimerIcon size={13} />
          <span className="hidden min-[290px]:inline text-[11px]">{t.timer}</span>
        </button>

        <button
          onClick={() => setSubModule("alarms")}
          className="flex-1 flex items-center justify-center space-x-1 py-1 px-1 rounded-lg transition-all"
          style={{
            backgroundColor: subModule === "alarms" ? "rgba(255,255,255,0.07)" : "transparent",
            color: subModule === "alarms" ? theme.text : theme.subtext,
            fontWeight: subModule === "alarms" ? 600 : 400,
          }}
          title="Будильники"
        >
          <Bell size={13} />
          <span className="hidden min-[290px]:inline text-[11px]">{t.alarms}</span>
        </button>
      </div>

      {/* Main Module Content */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        {subModule === "today" && <TodayView theme={theme} schedules={schedules} />}
        {subModule === "timer" && <Timer theme={theme} dynamicUi={dynamicUi} initialMinutes={timerMinutes} />}
        {subModule === "alarms" && (
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
        )}
      </div>
    </div>
  );
};
