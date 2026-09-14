import React, { useState } from "react";
import { ThemeColors, DynamicUIConfig, AlarmItem, AISettings } from "../types";
import { Timer } from "./Timer";
import { Alarms } from "./Alarms";
import { Timer as TimerIcon, Bell } from "lucide-react";
import { I18nService } from "../services/i18n";

interface DashboardViewProps {
  theme: ThemeColors;
  dynamicUi: DynamicUIConfig;
  alarms: AlarmItem[];
  aiSettings: AISettings;
  onUpdateAlarms: (alarms: AlarmItem[]) => void;
  onOpenAISettings: () => void;
  timerMinutes?: number;
  activeSubModule?: "timer" | "workout" | "stopwatch" | "alarms";
  onSubModuleChange?: (sub: "timer" | "workout" | "stopwatch" | "alarms") => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  theme,
  dynamicUi,
  alarms,
  aiSettings,
  onUpdateAlarms,
  onOpenAISettings,
  timerMinutes,
  activeSubModule,
  onSubModuleChange,
}) => {
  const [localSubModule, setLocalSubModule] = useState<"timer" | "workout" | "stopwatch" | "alarms">("timer");
  const subModule = activeSubModule ?? localSubModule;
  const setSubModule = (mod: "timer" | "workout" | "stopwatch" | "alarms") => {
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
          onClick={() => setSubModule("timer")}
          className="flex-1 flex items-center justify-center space-x-1 py-1 px-1 rounded-lg transition-all"
          style={{
            backgroundColor: subModule === "timer" ? theme.accent : "transparent",
            color: subModule === "timer" ? "#000" : theme.text,
            fontWeight: subModule === "timer" ? 700 : 500,
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
            backgroundColor: subModule === "alarms" ? theme.accent : "transparent",
            color: subModule === "alarms" ? "#000" : theme.text,
            fontWeight: subModule === "alarms" ? 700 : 500,
          }}
          title="Будильники"
        >
          <Bell size={13} />
          <span className="hidden min-[290px]:inline text-[11px]">{t.alarms}</span>
        </button>
      </div>

      {/* Main Module Content */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        {subModule === "timer" && <Timer theme={theme} dynamicUi={dynamicUi} initialMinutes={timerMinutes} />}
        {subModule === "alarms" && (
          <Alarms
            theme={theme}
            alarms={alarms}
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
