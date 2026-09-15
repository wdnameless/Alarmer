import type { SessionRecord, TaskItem } from '../types';

/**
 * Turns the raw session log into the numbers a person actually asks about.
 *
 * "How much did I focus this week", "am I keeping this up", "when in the day do
 * I actually work" — all derived from `sessions`, so there is exactly one thing
 * to record and one place to change what a statistic means.
 */

/** Local calendar day key, `YYYY-MM-DD`. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Seconds focused on a given local day. */
export function focusedSecOn(sessions: SessionRecord[], date: Date): number {
  const key = dayKey(date);
  return sessions
    .filter((s) => dayKey(new Date(s.endedAt)) === key)
    .reduce((sum, s) => sum + s.focusedSec, 0);
}

/** One day of the trailing window, ready to render. */
export interface DayBucket {
  date: Date;
  key: string;
  focusedSec: number;
}

/**
 * The last `days` days, oldest first, including empty days.
 *
 * Empty days are kept: a chart with the gaps removed hides exactly the pattern
 * a person needs to see.
 */
export function trailingDays(
  sessions: SessionRecord[],
  days: number,
  today: Date = new Date(),
): DayBucket[] {
  const buckets: DayBucket[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    buckets.push({ date, key: dayKey(date), focusedSec: focusedSecOn(sessions, date) });
  }

  return buckets;
}

/** Total focused seconds across a bucket list. */
export function totalFocusedSec(buckets: DayBucket[]): number {
  return buckets.reduce((sum, b) => sum + b.focusedSec, 0);
}

/**
 * Consecutive days up to today with at least `minMinutes` of focus.
 *
 * Today only breaks the streak once it is over: an unstarted morning must not
 * read as a lost streak, which is the fastest way to make someone quit.
 */
export function currentStreak(
  sessions: SessionRecord[],
  minMinutes = 1,
  today: Date = new Date(),
): number {
  const threshold = minMinutes * 60;
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const focused = focusedSecOn(sessions, date);
    const isToday = offset === 0;

    if (focused >= threshold) {
      streak += 1;
      continue;
    }
    if (isToday) continue; // grace for a day that has not happened yet
    break;
  }

  return streak;
}

/** Longest run of consecutive qualifying days in the log. */
export function longestStreak(sessions: SessionRecord[], minMinutes = 1): number {
  const keys = new Set(sessions.map((s) => dayKey(new Date(s.endedAt))));
  const threshold = minMinutes * 60;
  const byKey = new Map<string, number>();
  for (const s of sessions) {
    const key = dayKey(new Date(s.endedAt));
    byKey.set(key, (byKey.get(key) ?? 0) + s.focusedSec);
  }

  let best = 0;
  for (const key of keys) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    // Only count a run from its start, so each run is measured once.
    const previous = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    if ((byKey.get(dayKey(previous)) ?? 0) >= threshold) continue;

    let run = 0;
    const cursor = new Date(date);
    while ((byKey.get(dayKey(cursor)) ?? 0) >= threshold) {
      run += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    best = Math.max(best, run);
  }

  return best;
}

/** Focus per hour of the local day, 0..23. */
export function focusByHour(sessions: SessionRecord[]): number[] {
  const hours = new Array<number>(24).fill(0);
  for (const session of sessions) {
    hours[new Date(session.startedAt).getHours()] += session.focusedSec;
  }
  return hours;
}

/** The hour with the most focus, or null when there is nothing to show. */
export function peakHour(sessions: SessionRecord[]): number | null {
  const hours = focusByHour(sessions);
  let best: number | null = null;
  for (let h = 0; h < hours.length; h += 1) {
    if (hours[h] > 0 && (best === null || hours[h] > hours[best])) best = h;
  }
  return best;
}

/** Completed and remaining task counts. */
export function taskProgress(tasks: TaskItem[]): { done: number; total: number } {
  return { done: tasks.filter((t) => t.done).length, total: tasks.length };
}

/** "0 мин" / "45 мин" / "2 ч 05 мин". */
export function formatFocus(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
}
