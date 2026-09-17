import type { Direction, SessionRecord } from '../types';
import { averageQuality, blocksByDirection, sessionBlocks, weekStart } from './focusBudget';
import { dayKey } from './stats';

/** Compact, label-free digest of the journal for the model. */
export interface HistoryDigest {
  /** Per day: "YYYY-MM-DD" -> { blocks, minutes, avgQuality }. */
  days: Record<string, { blocks: number; minutes: number; avgQuality: number | null }>;
  /** Per direction name: blocks and minutes this week. */
  directions: Array<{ name: string; blocks: number; budget: number }>;
  /** Hour-of-day histogram of focus minutes. */
  byHour: number[];
  totals: { sessions: number; blocks: number; minutes: number };
}

/**
 * Builds the digest. MUST NOT include session labels, ids or timestamps beyond the
 * day key — aggregates only.
 */
export function buildHistoryDigest(
  sessions: SessionRecord[],
  directions: Direction[],
  focusMin: number,
  now: Date,
): HistoryDigest {
  const days: Record<string, { blocks: number; minutes: number; avgQuality: number | null }> = {};
  const sessionsByDay = new Map<string, SessionRecord[]>();

  for (const session of sessions) {
    const key = dayKey(new Date(session.startedAt));
    const list = sessionsByDay.get(key) ?? [];
    list.push(session);
    sessionsByDay.set(key, list);
  }

  for (const [key, daySessions] of sessionsByDay.entries()) {
    const rawBlocks = daySessions.reduce((sum, s) => sum + sessionBlocks(s, focusMin), 0);
    const rawMinutes = daySessions.reduce((sum, s) => sum + s.focusedSec, 0) / 60;
    days[key] = {
      blocks: Math.round(rawBlocks * 100) / 100,
      minutes: Math.round(rawMinutes),
      avgQuality: averageQuality(daySessions),
    };
  }
  const start = weekStart(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const used = blocksByDirection(sessions, directions, focusMin, start, end);

  const dirList: Array<{ name: string; blocks: number; budget: number }> = directions.map((d) => ({
    name: d.name,
    blocks: Math.round((used.get(d.id) ?? 0) * 100) / 100,
    budget: d.weeklyBlockBudget,
  }));

  const unattributed = Math.round((used.get(undefined) ?? 0) * 100) / 100;
  if (unattributed > 0) {
    dirList.push({
      name: 'Без направления',
      blocks: unattributed,
      budget: 0,
    });
  }

  const byHourSec = new Array<number>(24).fill(0);
  for (const session of sessions) {
    const h = new Date(session.startedAt).getHours();
    if (h >= 0 && h < 24) {
      byHourSec[h] += session.focusedSec;
    }
  }
  const byHour = byHourSec.map((sec) => Math.round(sec / 60));

  const totalBlocks = sessions.reduce((sum, s) => sum + sessionBlocks(s, focusMin), 0);
  const totalSec = sessions.reduce((sum, s) => sum + s.focusedSec, 0);

  const totals = {
    sessions: sessions.length,
    blocks: Math.round(totalBlocks * 100) / 100,
    minutes: Math.round(totalSec / 60),
  };

  return {
    days,
    directions: dirList,
    byHour,
    totals,
  };
}
