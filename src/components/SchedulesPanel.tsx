import React, { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Power, Trash2, Clock } from 'lucide-react';
import type { Schedule, ScheduleStep, ThemeColors } from '../types';
import { blockDurationSec, describeDays } from '../services/scheduleEngine';
import { soundService } from '../services/sound';

interface SchedulesPanelProps {
  theme: ThemeColors;
  schedules: Schedule[];
  onUpdateSchedules: (schedules: Schedule[]) => void;
}

/** "15 мин" / "1 ч 05 мин" — compact human duration. */
function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} мин`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} ч` : `${hours} ч ${minutes} мин`;
}

/** One-line summary of what a step does. */
function describeStep(step: ScheduleStep): string {
  if (step.kind === 'moment') return 'напоминание';
  return `${step.exercises.length} упражн. · ${formatDuration(blockDurationSec(step))}`;
}

/**
 * Saved schedules, each toggleable as a whole.
 *
 * A schedule is the primary object: it owns its steps, can be switched off
 * without losing the definition, and can be expanded to inspect what it does.
 */
export const SchedulesPanel: React.FC<SchedulesPanelProps> = ({
  theme,
  schedules,
  onUpdateSchedules,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleSchedule = (id: string) => {
    soundService.playCountdownTick();
    onUpdateSchedules(
      schedules.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  const deleteSchedule = (id: string) => {
    soundService.playCountdownTick();
    onUpdateSchedules(schedules.filter((s) => s.id !== id));
  };

  if (schedules.length === 0) {
    return (
      <div
        className="w-full rounded-2xl border p-5 text-center"
        style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <CalendarDays size={20} className="mx-auto mb-2 opacity-40" style={{ color: theme.subtext }} />
        <p className="text-xs leading-relaxed" style={{ color: theme.subtext }}>
          Пока нет сохранённых расписаний.
          <br />
          Вставьте свой план в чат с ИИ — он превратит его в программу.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2 w-full">
      {schedules.map((schedule) => {
        const isExpanded = expandedId === schedule.id;
        return (
          <div
            key={schedule.id}
            className="rounded-2xl border backdrop-blur-xl transition-opacity"
            style={{
              // Soft layer: translucent surface plus a soft shadow instead of a
              // hard border. An enabled program reads as raised, a disabled one
              // recedes.
              backgroundColor: schedule.enabled
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(255,255,255,0.02)',
              borderColor: schedule.enabled ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)',
              boxShadow: schedule.enabled ? '0 10px 30px rgba(0,0,0,0.38)' : 'none',
              opacity: schedule.enabled ? 1 : 0.6,
            }}
          >
            <div className="flex items-start justify-between gap-2 p-3">
              <button
                onClick={() => setExpandedId(isExpanded ? null : schedule.id)}
                className="flex-1 text-left min-w-0"
                title="Показать шаги"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xs font-semibold truncate"
                    style={{ color: theme.text }}
                  >
                    {schedule.name}
                  </span>
                  {isExpanded ? (
                    <ChevronUp size={12} style={{ color: theme.subtext }} />
                  ) : (
                    <ChevronDown size={12} style={{ color: theme.subtext }} />
                  )}
                </div>
                <span className="block text-[10px] mt-0.5" style={{ color: theme.subtext }}>
                  {describeDays(schedule.days)} · {schedule.steps.length} шаг(ов)
                </span>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleSchedule(schedule.id)}
                  title={schedule.enabled ? 'Выключить программу' : 'Включить программу'}
                  className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: schedule.enabled ? theme.text : theme.subtext }}
                >
                  <Power size={14} />
                </button>
                <button
                  onClick={() => deleteSchedule(schedule.id)}
                  title="Удалить программу"
                  className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20 text-red-400 opacity-60 hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {isExpanded && (
              <div
                className="px-3 pb-3 flex flex-col space-y-1.5 border-t pt-2.5"
                style={{ borderColor: theme.border }}
              >
                {schedule.steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 text-[11px]">
                    <Clock size={11} style={{ color: theme.subtext }} />
                    <span
                      className="font-mono tabular-nums shrink-0"
                      style={{ color: theme.text }}
                    >
                      {step.time}
                    </span>
                    <span className="truncate" style={{ color: theme.text }}>
                      {step.label}
                    </span>
                    <span className="ml-auto shrink-0" style={{ color: theme.subtext }}>
                      {describeStep(step)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
