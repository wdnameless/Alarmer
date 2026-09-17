import type { Direction, SessionRecord } from '../types';
import { DEFAULT_BLOCK_SETTINGS } from '../types/focus';

/**
 * The weekly budget: blocks worked against blocks allowed.
 *
 * The rules live here, away from React, so they can be stated once and tested
 * directly. Two of them carry the whole idea:
 *
 * - **Weeks start on Monday.** Every budget, counter and journal row is computed
 *   from that boundary, so a Sunday block belongs to the week that began six days
 *   earlier.
 * - **Pace, not totals.** Being "behind" is only meaningful against how much of
 *   the week has actually elapsed. Comparing raw totals would show red on a
 *   Tuesday for a week that is pacing perfectly.
 */

/** Monday 00:00 local for the week containing `date`. */
export function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // getDay(): 0 = Sunday. Sunday belongs to the week that started six days back.
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d;
}

/** ISO-ish week key, `YYYY-Www`, used to group and label weeks. */
export function weekKey(date: Date): string {
  const start = weekStart(date);
  // Key from the Monday itself, so two dates either side of a year boundary that
  // share a week share a key.
  const thursday = new Date(start);
  thursday.setDate(thursday.getDate() + 3);
  const year = thursday.getFullYear();

  const firstThursday = new Date(year, 0, 4);
  const firstMonday = weekStart(firstThursday);
  const weeks = Math.round((thursday.getTime() - firstMonday.getTime()) / (7 * 86_400_000)) + 1;

  return `${year}-W${String(weeks).padStart(2, '0')}`;
}

/** True when both dates fall in the same Monday-based week. */
export function sameWeek(a: Date, b: Date): boolean {
  return weekStart(a).getTime() === weekStart(b).getTime();
}

/**
 * Blocks a session earned.
 *
 * A stored value wins: past sessions were worth what the block length was at the
 * time, and re-deriving them after the user changes the setting would silently
 * rewrite history. Undefined stays undefined for sessions recorded before blocks
 * existed — the caller decides whether to derive or to ignore.
 */
export function sessionBlocks(session: SessionRecord, focusMin: number): number {
  if (typeof session.blocks === 'number' && session.blocks > 0) return session.blocks;
  if (focusMin <= 0) return 0;
  return session.focusedSec / (focusMin * 60);
}

/** Sessions recorded on a given local day. */
function onDay(session: SessionRecord, day: Date): boolean {
  const started = new Date(session.startedAt);
  return (
    started.getFullYear() === day.getFullYear() &&
    started.getMonth() === day.getMonth() &&
    started.getDate() === day.getDate()
  );
}

/** Blocks per direction for sessions inside `[from, to)`; `undefined` = «Без направления». */
export function blocksByDirection(
  sessions: SessionRecord[],
  directions: Direction[],
  focusMin: number,
  from: Date,
  to: Date,
): Map<string | undefined, number> {
  const known = new Set(directions.map((d) => d.id));
  const out = new Map<string | undefined, number>();

  for (const session of sessions) {
    const started = new Date(session.startedAt);
    if (started < from || started >= to) continue;
    // A session pointing at a direction that no longer exists is unattributed
    // rather than a phantom row.
    const key = session.directionId && known.has(session.directionId) ? session.directionId : undefined;
    out.set(key, (out.get(key) ?? 0) + sessionBlocks(session, focusMin));
  }

  return out;
}

export type TrafficLight = 'on' | 'behind' | 'over';

/**
 * How far the week has run, 0..1.
 *
 * Monday morning is 0 and the following Monday is 1, so "on pace" can mean
 * something honest in the middle of a week.
 */
export function weekElapsed(now: Date): number {
  const start = weekStart(now);
  const elapsedMs = now.getTime() - start.getTime();
  return Math.min(1, Math.max(0, elapsedMs / (7 * 86_400_000)));
}

/**
 * Pace signal for a direction.
 *
 * - `over` once the week's allowance is passed — the one case that is true
 *   regardless of when it is asked.
 * - `on` when the blocks worked are within a fifth of the elapsed share.
 * - `behind` otherwise.
 *
 * A week that has barely begun counts as `on`: with 2% of the week gone, being
 * below 2% of the budget is arithmetic, not a problem worth colouring yellow —
 * and a red-or-yellow Monday would teach the user to ignore the signal.
 */
export function paceLight(used: number, budget: number, now: Date, tolerance = 0.2): TrafficLight {
  if (budget <= 0) return 'on';
  if (used > budget) return 'over';

  const elapsed = weekElapsed(now);
  // Under a tenth of the week in (Monday up to ~17:00), pace says nothing yet.
  if (elapsed < 0.1) return 'on';

  const expected = budget * elapsed;
  if (used >= expected * (1 - tolerance)) return 'on';
  return 'behind';
}

export interface DirectionProgress {
  direction: Direction;
  /** Week-to-date blocks, fractional. */
  used: number;
  budget: number;
  /** `used / budget`; may exceed 1. */
  ratio: number;
  over: boolean;
  light: TrafficLight;
}

/** Week-to-date progress for every direction, archived ones included. */
export function directionProgress(
  sessions: SessionRecord[],
  directions: Direction[],
  now: Date,
  blockSettings = DEFAULT_BLOCK_SETTINGS,
): DirectionProgress[] {
  const start = weekStart(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const used = blocksByDirection(sessions, directions, blockSettings.focusMin, start, end);

  return directions.map((direction) => {
    const value = used.get(direction.id) ?? 0;
    const budget = direction.weeklyBlockBudget;
    return {
      direction,
      used: value,
      budget,
      ratio: budget > 0 ? value / budget : 0,
      over: value > budget,
      light: paceLight(value, budget, now),
    };
  });
}

/** Blocks worked this week that belong to no direction. */
export function unattributedBlocks(
  sessions: SessionRecord[],
  directions: Direction[],
  now: Date,
  blockSettings = DEFAULT_BLOCK_SETTINGS,
): number {
  const start = weekStart(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return blocksByDirection(sessions, directions, blockSettings.focusMin, start, end).get(undefined) ?? 0;
}

export interface WeekSummary {
  key: string;
  start: Date;
  /** Blocks worked that week across every direction. */
  blocks: number;
  /** Sum of every direction's budget at that time. */
  budgetTotal: number;
  /** Per-direction blocks; key `undefined` = «Без направления». */
  byDirection: Map<string | undefined, number>;
  /** True when the week worked more than every direction's budget combined. */
  over: boolean;
}

/**
 * The last `count` weeks, oldest first, each against the budgets in force now.
 *
 * Budgets are read from the directions as they currently stand: we do not keep a
 * history of budget edits, and pretending to would need a table of past budgets
 * that nothing else uses.
 */
export function weekSummaries(
  sessions: SessionRecord[],
  directions: Direction[],
  count: number,
  now: Date,
  blockSettings = DEFAULT_BLOCK_SETTINGS,
): WeekSummary[] {
  const thisMonday = weekStart(now);
  const budgetTotal = directions
    .filter((d) => !d.archived)
    .reduce((sum, d) => sum + d.weeklyBlockBudget, 0);

  const out: WeekSummary[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const byDirection = blocksByDirection(
      sessions,
      directions,
      blockSettings.focusMin,
      start,
      end,
    );
    let blocks = 0;
    for (const value of byDirection.values()) blocks += value;

    out.push({
      key: weekKey(start),
      start,
      blocks,
      budgetTotal,
      byDirection,
      over: budgetTotal > 0 && blocks > budgetTotal,
    });
  }
  return out;
}

export interface MonthBlock {
  /** Absent = «Без направления». */
  directionId?: string;
  color: string;
  /** Beyond the week's allowance: their model colours this tail red. */
  over: boolean;
}

export interface MonthRow {
  weekKey: string;
  start: Date;
  blocks: MonthBlock[];
  budgetTotal: number;
}

/**
 * The month as rows of weeks and squares of blocks.
 *
 * Only weeks that overlap the month appear, and a row is built from that week's
 * sessions in order — so the squares read as a shape of the week, with anything
 * past the budget marked.
 */
export function monthGrid(
  sessions: SessionRecord[],
  directions: Direction[],
  month: Date,
  blockSettings = DEFAULT_BLOCK_SETTINGS,
): MonthRow[] {
  const byId = new Map(directions.map((d) => [d.id, d]));
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const rows: MonthRow[] = [];
  for (let cursor = weekStart(first); cursor <= last; cursor.setDate(cursor.getDate() + 7)) {
    const start = new Date(cursor);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const budgetTotal = directions
      .filter((d) => !d.archived)
      .reduce((sum, d) => sum + d.weeklyBlockBudget, 0);

    const inWeek = sessions
      .filter((s) => {
        const started = new Date(s.startedAt);
        return started >= start && started < end;
      })
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

    // One square per whole block; a fractional remainder still earned a square,
    // otherwise a week of half-blocks would render as an empty row.
    const squares: MonthBlock[] = [];
    for (const session of inWeek) {
      const count = Math.ceil(sessionBlocks(session, blockSettings.focusMin));
      const direction = session.directionId ? byId.get(session.directionId) : undefined;
      for (let i = 0; i < count; i += 1) {
        squares.push({
          directionId: direction?.id,
          color: direction?.color ?? 'rgba(255,255,255,0.25)',
          over: budgetTotal > 0 && squares.length + 1 > budgetTotal,
        });
      }
    }

    rows.push({ weekKey: weekKey(start), start, blocks: squares, budgetTotal });
  }

  return rows;
}

/** Blocks worked on a single local day, for the dashboard counter. */
export function blocksOnDay(
  sessions: SessionRecord[],
  day: Date,
  blockSettings = DEFAULT_BLOCK_SETTINGS,
): number {
  return sessions
    .filter((s) => onDay(s, day))
    .reduce((sum, s) => sum + sessionBlocks(s, blockSettings.focusMin), 0);
}

/**
 * A block count as a person reads it: at most one decimal, trailing zero dropped.
 *
 * Blocks are fractional by design (25 of 50 minutes is half), but the raw float
 * of that division is not a number anyone wants to see — `0.0463…` of a budget
 * is arithmetic, not progress.
 */
export function formatBlocks(blocks: number): string {
  if (!Number.isFinite(blocks)) return '0';
  const rounded = Math.round(blocks * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Mean quality across rated sessions, or null when none were rated. */
export function averageQuality(sessions: SessionRecord[]): number | null {
  const rated = sessions.filter((s) => typeof s.quality === 'number');
  if (rated.length === 0) return null;
  return rated.reduce((sum, s) => sum + (s.quality ?? 0), 0) / rated.length;
}
