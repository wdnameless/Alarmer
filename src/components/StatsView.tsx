import React from 'react';
import { Flame, Clock, TrendingUp, History } from 'lucide-react';
import type { SessionRecord, TaskItem, ThemeColors } from '../types';
import {
  currentStreak,
  formatFocus,
  longestStreak,
  peakHour,
  taskProgress,
  totalFocusedSec,
  trailingDays,
} from '../services/stats';
import { recentSessions } from '../services/session';

interface StatsViewProps {
  theme: ThemeColors;
  sessions: SessionRecord[];
  tasks: TaskItem[];
}

/** How many days the chart shows. */
const WINDOW_DAYS = 14;

/**
 * What actually happened, as opposed to what was planned.
 *
 * The interval player already measured every block; before this, it threw the
 * result away. Recording it is what turns the app from a timer into a habit.
 */
export const StatsView: React.FC<StatsViewProps> = ({ theme, sessions, tasks }) => {
  const buckets = trailingDays(sessions, WINDOW_DAYS);
  const week = trailingDays(sessions, 7);

  const weekTotal = totalFocusedSec(week);
  const streak = currentStreak(sessions);
  const best = longestStreak(sessions);
  const peak = peakHour(sessions);
  const { done, total } = taskProgress(tasks);

  const busiest = buckets.reduce((max, b) => Math.max(max, b.focusedSec), 0);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col w-full max-w-[340px] px-1">
        <div
          className="rounded-3xl border backdrop-blur-2xl px-5 py-8 flex flex-col items-center text-center"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
        >
          <TrendingUp size={22} className="mb-3 opacity-40" style={{ color: theme.subtext }} />
          <span className="text-sm font-medium mb-1" style={{ color: theme.text }}>
            Пока нечего считать
          </span>
          <span className="text-[11px] leading-relaxed max-w-[260px]" style={{ color: theme.subtext }}>
            Запустите интервальный блок или таймер — каждая сессия попадёт сюда и сложится в статистику.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[340px] px-1 space-y-3">
      {/* Headline numbers: this week, the streak, and the best run. */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-2xl border px-4 py-3"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
        >
          <span className="text-[10px] uppercase tracking-[0.16em] block mb-1" style={{ color: theme.subtext }}>
            За 7 дней
          </span>
          <span className="font-mono font-bold tabular-nums" style={{ color: theme.text, fontSize: '22px' }}>
            {formatFocus(weekTotal)}
          </span>
        </div>

        <div
          className="rounded-2xl border px-4 py-3"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
        >
          <span className="text-[10px] uppercase tracking-[0.16em] flex items-center gap-1 mb-1" style={{ color: theme.subtext }}>
            <Flame size={10} /> Серия
          </span>
          <span className="font-mono font-bold tabular-nums" style={{ color: theme.text, fontSize: '22px' }}>
            {streak}
            <span className="text-[11px] font-normal ml-1" style={{ color: theme.subtext }}>
              {streak === 1 ? 'день' : 'дн.'}
            </span>
          </span>
        </div>
      </div>

      {/* Daily bars. Empty days are drawn, not skipped: the gaps are the point. */}
      <div
        className="rounded-2xl border px-4 py-3"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <span className="text-[10px] uppercase tracking-[0.16em] block mb-3" style={{ color: theme.subtext }}>
          Последние {WINDOW_DAYS} дней
        </span>
        <div className="flex items-end justify-between gap-[3px] h-[64px]">
          {buckets.map((bucket) => {
            const ratio = busiest > 0 ? bucket.focusedSec / busiest : 0;
            const isToday = bucket.key === buckets[buckets.length - 1].key;
            return (
              <div
                key={bucket.key}
                className="flex-1 rounded-sm transition-[height] duration-300"
                style={{
                  // A zero day still gets a hairline, so the axis stays readable.
                  height: `${Math.max(3, ratio * 100)}%`,
                  backgroundColor: bucket.focusedSec > 0
                    ? isToday ? theme.accent : theme.subtext
                    : theme.border,
                }}
                title={`${bucket.key}: ${formatFocus(bucket.focusedSec)}`}
              />
            );
          })}
        </div>
      </div>

      {/* Secondary facts, only when there is something to say. */}
      <div
        className="rounded-2xl border px-4 py-3 flex flex-col space-y-2"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        {best > 0 && (
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: theme.subtext }}>Лучшая серия</span>
            <span className="font-mono tabular-nums" style={{ color: theme.text }}>
              {best} дн.
            </span>
          </div>
        )}

        {peak !== null && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1" style={{ color: theme.subtext }}>
              <Clock size={10} /> Пик продуктивности
            </span>
            <span className="font-mono tabular-nums" style={{ color: theme.text }}>
              {String(peak).padStart(2, '0')}:00
            </span>
          </div>
        )}

        {total > 0 && (
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: theme.subtext }}>Задачи выполнены</span>
            <span className="font-mono tabular-nums" style={{ color: theme.text }}>
              {done} / {total}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px]">
          <span style={{ color: theme.subtext }}>Всего сессий</span>
          <span className="font-mono tabular-nums" style={{ color: theme.text }}>
            {sessions.length}
          </span>
        </div>
      </div>

      {/* What was actually done, newest first. The numbers above say how much;
          this says what — and it is the only place a mistyped session can be
          recognised for what it was. */}
      <div
        className="rounded-2xl border px-4 py-3 flex flex-col space-y-2"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <span className="text-[10px] uppercase tracking-[0.16em] flex items-center gap-1" style={{ color: theme.subtext }}>
          <History size={10} /> Последние сессии
        </span>
        {recentSessions(sessions, 8).map((session) => {
          const ended = new Date(session.endedAt);
          const when = `${String(ended.getDate()).padStart(2, '0')}.${String(ended.getMonth() + 1).padStart(2, '0')} ${String(ended.getHours()).padStart(2, '0')}:${String(ended.getMinutes()).padStart(2, '0')}`;
          return (
            <div key={session.id} className="flex items-center gap-2 text-[11px]">
              <span className="font-mono tabular-nums shrink-0" style={{ color: theme.subtext }}>
                {when}
              </span>
              <span className="truncate flex-1" style={{ color: theme.text }}>
                {session.label}
              </span>
              {!session.completed && (
                <span className="shrink-0 text-[9px] opacity-70" style={{ color: theme.subtext }}>
                  не завершена
                </span>
              )}
              <span className="font-mono tabular-nums shrink-0" style={{ color: theme.text }}>
                {formatFocus(session.focusedSec)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
