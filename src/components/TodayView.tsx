import React, { useEffect, useState } from 'react';
import { CalendarDays, Play, Clock } from 'lucide-react';
import type { Schedule, ScheduleStep, ThemeColors } from '../types';
import { blockDurationSec, findNextUp, schedulesForToday } from '../services/scheduleEngine';
import { BlockPlayer } from './BlockPlayer';
import { soundService } from '../services/sound';

interface TodayViewProps {
  theme: ThemeColors;
  schedules: Schedule[];
}

type BlockStep = Extract<ScheduleStep, { kind: 'block' }>;

/** "45 мин" / "1 ч 05 мин". */
function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} мин`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} ч` : `${hours} ч ${minutes} мин`;
}

/** "через 2 ч 15 мин" / "сейчас". */
function formatUntil(minutes: number): string {
  if (minutes <= 0) return 'сейчас';
  if (minutes < 60) return `через ${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `через ${hours} ч` : `через ${hours} ч ${rest} мин`;
}

/**
 * The default screen: what is happening now and what comes next.
 *
 * A bare list of times cannot answer "what should I be doing right now", which
 * is the question this product exists to answer.
 */
export const TodayView: React.FC<TodayViewProps> = ({ theme, schedules }) => {
  const [now, setNow] = useState(() => new Date());
  const [runningBlock, setRunningBlock] = useState<BlockStep | null>(null);

  // Keep "in 12 minutes" honest without a full re-render loop.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (runningBlock) {
    return (
      <BlockPlayer theme={theme} block={runningBlock} onClose={() => setRunningBlock(null)} />
    );
  }

  const active = schedulesForToday(schedules, now);
  const next = findNextUp(schedules, now);

  if (active.length === 0) {
    return (
      <div
        className="w-full rounded-3xl border backdrop-blur-2xl px-5 py-8 flex flex-col items-center text-center"
        style={{
          backgroundColor: 'rgba(255,255,255,0.035)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.4)',
        }}
      >
        <CalendarDays size={22} className="mb-3 opacity-40" style={{ color: theme.subtext }} />
        <span className="text-sm font-medium mb-1" style={{ color: theme.text }}>
          Сегодня программ нет
        </span>
        <span className="text-[11px] leading-relaxed max-w-[260px]" style={{ color: theme.subtext }}>
          Включите расписание во вкладке «Алармы» или создайте новое через ИИ-ассистента.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[340px] space-y-3">
      {/* What is next — the headline answer. */}
      {next ? (
        <div
          className="w-full rounded-3xl border backdrop-blur-2xl px-5 py-6"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.10)',
            boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
          }}
        >
          <span
            className="text-[10px] uppercase tracking-[0.18em] block mb-2"
            style={{ color: theme.subtext }}
          >
            Далее
          </span>

          <div className="flex items-baseline gap-3 mb-1">
            <span
              className="font-mono tabular-nums font-bold leading-none"
              style={{ color: theme.text, fontSize: '38px' }}
            >
              {next.step.time}
            </span>
            <span className="text-[11px]" style={{ color: theme.subtext }}>
              {formatUntil(next.minutesUntil)}
            </span>
          </div>

          <span className="block text-sm font-medium mb-0.5" style={{ color: theme.text }}>
            {next.step.label}
          </span>
          <span className="block text-[11px] mb-4" style={{ color: theme.subtext }}>
            {next.schedule.name}
            {next.step.kind === 'block' && ` · ${formatDuration(blockDurationSec(next.step))}`}
          </span>

          {next.step.kind === 'block' && (
            <button
              onClick={() => {
                soundService.playUiClick();
                setRunningBlock(next.step as BlockStep);
              }}
              className="w-full py-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: '#fafafa', color: '#0a0a0a' }}
            >
              <Play size={12} />
              Начать блок
            </button>
          )}
        </div>
      ) : (
        <div
          className="w-full rounded-3xl border px-5 py-5 text-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <span className="text-xs" style={{ color: theme.subtext }}>
            На сегодня всё выполнено
          </span>
        </div>
      )}

      {/* Today's programs, so the day is visible at a glance. */}
      <div className="flex flex-col space-y-2">
        {active.map((schedule) => (
          <div
            key={schedule.id}
            className="w-full rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: 'rgba(255,255,255,0.025)',
              borderColor: 'rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock size={12} style={{ color: theme.subtext }} />
              <span className="text-[11px] font-medium truncate" style={{ color: theme.text }}>
                {schedule.name}
              </span>
              <span className="ml-auto text-[10px] shrink-0" style={{ color: theme.subtext }}>
                {schedule.steps.length} шаг(ов)
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              {schedule.steps.map((step) => (
                <div key={step.id} className="flex items-center gap-2 text-[10px]">
                  <span
                    className="font-mono tabular-nums shrink-0"
                    style={{ color: theme.subtext }}
                  >
                    {step.time}
                  </span>
                  <span className="truncate" style={{ color: theme.subtext }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
