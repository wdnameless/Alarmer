import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Play, Clock, Target } from 'lucide-react';
import type {
  Schedule,
  ScheduleStep,
  SessionRecord,
  ThemeColors,
  Direction,
  BlockSettings,
} from '../types';
import { DEFAULT_BLOCK_SETTINGS } from '../types/focus';
import { blockDurationSec, findNextUp, schedulesForToday } from '../services/scheduleEngine';
import { formatBlocks, blocksOnDay, directionProgress } from '../services/focusBudget';
import { BlockPlayer } from './BlockPlayer';
import { soundService } from '../services/sound';
import { TimerService } from '../services/timer';

export interface TodayViewProps {
  theme: ThemeColors;
  schedules: Schedule[];
  /** A finished interval block, so its focus time can be recorded. */
  onSession?: (session: SessionRecord) => void;
  /** Focus budget directions. */
  directions?: Direction[];
  /** Completed sessions for block counting and progress. */
  sessions?: SessionRecord[];
  /** Block duration settings (50/10 by default). */
  blockSettings?: BlockSettings;
  /** Callback to start a block timer for a direction and navigate to timer. */
  onStartBlock?: (directionId: string) => void;
  /** Optional navigation to journal / stats view. */
  onNavigateToJournal?: () => void;
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
export const TodayView: React.FC<TodayViewProps> = ({
  theme,
  schedules,
  onSession,
  directions = [],
  sessions = [],
  blockSettings = DEFAULT_BLOCK_SETTINGS,
  onStartBlock,
  onNavigateToJournal,
}) => {
  const [now, setNow] = useState(() => new Date());
  const [runningBlock, setRunningBlock] = useState<{ step: BlockStep; scheduleId: string } | null>(null);

  const activeDirections = useMemo(
    () => directions.filter((d) => !d.archived),
    [directions]
  );

  const todayBlocks = useMemo(
    () => blocksOnDay(sessions, now, blockSettings),
    [sessions, now, blockSettings]
  );

  const dirProgressList = useMemo(() => {
    if (activeDirections.length === 0) return [];
    return directionProgress(sessions, activeDirections, now, blockSettings);
  }, [sessions, activeDirections, now, blockSettings]);

  const handleStartDirectionBlock = async (directionId: string) => {
    soundService.playUiClick();
    if (onStartBlock) {
      onStartBlock(directionId);
      return;
    }
    try {
      await TimerService.setMode('block');
      await TimerService.setDirection(directionId);
      await TimerService.start();
    } catch {
      // Outside Tauri environment
    }
  };
  // Keep "in 12 minutes" honest without a full re-render loop.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (runningBlock) {
    return (
      <BlockPlayer
        theme={theme}
        block={runningBlock.step}
        scheduleId={runningBlock.scheduleId}
        onSession={onSession}
        onClose={() => setRunningBlock(null)}
      />
    );
  }

  const active = schedulesForToday(schedules, now);
  const next = findNextUp(schedules, now);

  return (
    <div className="flex flex-col w-full max-w-[340px] space-y-4">
      {/* Day's completed blocks & Focus Block Card */}
      <div
        className="w-full rounded-3xl border backdrop-blur-2xl px-5 py-5"
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderColor: 'rgba(255,255,255,0.10)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={14} style={{ color: theme.accent }} />
            <span className="text-[11px] uppercase tracking-[0.18em] font-semibold" style={{ color: theme.text }}>
              Начать блок фокуса
            </span>
          </div>
          <div
            data-testid="today-blocks-counter"
            className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.08)',
              color: theme.subtext,
            }}
            title="Завершено блоков сегодня"
          >
            Сегодня: <span className="font-semibold" style={{ color: theme.text }}>{formatBlocks(todayBlocks)}</span> бл
          </div>
        </div>

        {activeDirections.length === 0 ? (
          <div className="py-3 px-3 rounded-2xl border border-dashed text-center" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <p className="text-[11px] leading-relaxed mb-1" style={{ color: theme.subtext }}>
              Нет активных направлений. Создайте направление в журнале, чтобы планировать бюджет фокуса.
            </p>
            {onNavigateToJournal && (
              <button
                onClick={onNavigateToJournal}
                className="mt-1 text-[11px] font-medium underline transition-opacity hover:opacity-80"
                style={{ color: theme.accent }}
              >
                Перейти в журнал
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 mt-2">
            {dirProgressList.map(({ direction, used, budget }) => (
              <button
                key={direction.id}
                data-testid={`start-block-${direction.id}`}
                onClick={() => handleStartDirectionBlock(direction.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-left group hover:scale-[1.01] active:scale-[0.98]"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: direction.color }}
                  />
                  <span className="text-xs font-medium truncate" style={{ color: theme.text }}>
                    {direction.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[11px] tabular-nums" style={{ color: theme.subtext }}>
                    {formatBlocks(used)}/{budget} бл
                  </span>
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: theme.text }}
                  >
                    <Play size={10} className="fill-current ml-0.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Schedules section */}
      {active.length === 0 ? (
        <div
          className="w-full rounded-3xl border backdrop-blur-2xl px-5 py-6 flex flex-col items-center justify-center text-center"
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
      ) : (
        <>
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

              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-xl font-semibold tracking-tight" style={{ color: theme.text }}>
                  {next.step.label}
                </span>
                <span className="text-xs font-mono tabular-nums" style={{ color: theme.subtext }}>
                  {next.step.time}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs mb-4" style={{ color: theme.accent }}>
                <Clock size={12} />
                <span>{formatUntil(next.minutesUntil)}</span>
                <span style={{ color: theme.subtext }}>· {next.schedule.name}</span>
              </div>

              {next.step.kind === 'block' && (
                <div
                  className="rounded-2xl p-3 mb-4 border space-y-1.5"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span style={{ color: theme.subtext }}>Длительность</span>
                    <span className="font-medium" style={{ color: theme.text }}>
                      {formatDuration(blockDurationSec(next.step))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span style={{ color: theme.subtext }}>Упражнений</span>
                    <span className="font-medium" style={{ color: theme.text }}>
                      {next.step.exercises.length}
                    </span>
                  </div>
                </div>
              )}

              {next.step.kind === 'block' && (
                <button
                  onClick={() => {
                    soundService.playUiClick();
                    setRunningBlock({
                      step: next.step as BlockStep,
                      scheduleId: next.schedule.id,
                    });
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
              className="w-full rounded-3xl border backdrop-blur-2xl px-5 py-6 text-center"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <span className="text-xs" style={{ color: theme.subtext }}>
                На сегодня шагов больше нет
              </span>
            </div>
          )}

          {/* Remaining steps list for today. */}
          <div
            className="w-full rounded-3xl border backdrop-blur-2xl p-4"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.07)',
            }}
          >
            <span
              className="text-[10px] uppercase tracking-[0.18em] block mb-3 px-1"
              style={{ color: theme.subtext }}
            >
              Сегодня
            </span>
            <div className="space-y-1">
              {active.map((sch) => (
                <div key={sch.id} className="space-y-1">
                  {sch.steps.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                        <span className="truncate font-medium" style={{ color: theme.text }}>
                          {st.label}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] tabular-nums" style={{ color: theme.subtext }}>
                        {st.time}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
