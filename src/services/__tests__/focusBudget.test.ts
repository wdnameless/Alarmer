import { describe, expect, it } from 'vitest';
import {
  averageQuality,
  blocksOnDay,
  directionProgress,
  formatBlocks,
  monthGrid,
  paceLight,
  sessionBlocks,
  unattributedBlocks,
  weekKey,
  weekStart,
  weekSummaries,
} from '../focusBudget';
import type { Direction, SessionRecord } from '../../types';

const dir = (id: string, budget: number, archived = false): Direction => ({
  id,
  name: id,
  color: '#ff7a1a',
  weeklyBlockBudget: budget,
  archived,
});

/** A session at a local time, with whatever extra fields the case needs. */
function session(at: string, extras: Partial<SessionRecord> = {}): SessionRecord {
  const start = new Date(at);
  return {
    id: `s_${at}`,
    label: 'Блок',
    focusedSec: 50 * 60,
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + 50 * 60_000).toISOString(),
    completed: true,
    ...extras,
  };
}

// 2026-09-16 is a Wednesday; the week containing it begins Monday 2026-09-14.
const WED = new Date('2026-09-16T12:00:00');
const MON = new Date('2026-09-14T09:00:00');
const SUN = new Date('2026-09-20T22:00:00');

describe('week boundaries', () => {
  it('starts the week on Monday', () => {
    expect(weekStart(WED).getDay()).toBe(1);
    expect(weekStart(WED).getDate()).toBe(14);
  });

  it('keeps Sunday in the week that began six days earlier', () => {
    // Sunday is the trap: getDay() calls it 0, which naive code treats as the start.
    const start = weekStart(SUN);
    expect(start.getDate()).toBe(14);
    expect(start.getDay()).toBe(1);
  });

  it('puts Monday and the following Sunday in the same week', () => {
    expect(weekKey(MON)).toBe(weekKey(SUN));
  });

  it('puts a Sunday and the next Monday in different weeks', () => {
    const nextMon = new Date('2026-09-21T09:00:00');
    expect(weekKey(SUN)).not.toBe(weekKey(nextMon));
  });
});

describe('block accounting', () => {
  it('counts a full block as one', () => {
    expect(sessionBlocks(session('2026-09-16T09:00:00'), 50)).toBe(1);
  });

  it('counts a half session as half a block', () => {
    // «Потратил бюджет — переключайся» only works if a serious 25-minute session
    // is worth something.
    const half = session('2026-09-16T09:00:00', { focusedSec: 25 * 60 });
    expect(sessionBlocks(half, 50)).toBe(0.5);
  });

  it('prefers a stored value over re-deriving it', () => {
    // Changing the block length later must not rewrite what past sessions were worth.
    const stored = session('2026-09-16T09:00:00', { focusedSec: 50 * 60, blocks: 2 });
    expect(sessionBlocks(stored, 25)).toBe(2);
  });

  it('counts a day against the days own sessions only', () => {
    const sessions = [
      session('2026-09-16T09:00:00'),
      session('2026-09-16T14:00:00'),
      session('2026-09-15T09:00:00'),
    ];
    expect(blocksOnDay(sessions, WED)).toBe(2);
  });
});

describe('pace light', () => {
  it('is green early in a correctly paced week', () => {
    // Monday morning, nothing done yet: nothing is wrong, so this must not be red or yellow.
    expect(paceLight(0, 30, MON)).toBe('on');
  });

  it('is behind when the week has run but the blocks have not', () => {
    const sundayNight = new Date('2026-09-20T20:00:00');
    expect(paceLight(3, 30, sundayNight)).toBe('behind');
  });

  it('is over once the allowance is passed', () => {
    expect(paceLight(31, 30, WED)).toBe('over');
  });

  it('stays on pace when tracking the elapsed week', () => {
    // Wednesday noon is ~43% through the week; 13/30 is within a fifth of that.
    expect(paceLight(13, 30, WED)).toBe('on');
  });

  it('never reports over for a zero budget', () => {
    expect(paceLight(5, 0, WED)).toBe('on');
  });
});

describe('direction progress', () => {
  const directions = [dir('study', 30), dir('sport', 10)];

  it('adds only the work belonging to each direction', () => {
    const sessions = [
      session('2026-09-16T09:00:00', { directionId: 'study' }),
      session('2026-09-16T11:00:00', { directionId: 'study' }),
      session('2026-09-16T18:00:00', { directionId: 'sport' }),
    ];

    const progress = directionProgress(sessions, directions, WED);
    expect(progress.find((p) => p.direction.id === 'study')?.used).toBe(2);
    expect(progress.find((p) => p.direction.id === 'sport')?.used).toBe(1);
  });

  it('ignores a session pointing at a direction that no longer exists', () => {
    const sessions = [session('2026-09-16T09:00:00', { directionId: 'deleted' })];
    const progress = directionProgress(sessions, directions, WED);
    expect(progress.every((p) => p.used === 0)).toBe(true);
    expect(unattributedBlocks(sessions, directions, WED)).toBe(1);
  });

  it('leaves a direction with no work at zero', () => {
    const progress = directionProgress([], directions, WED);
    expect(progress.find((p) => p.direction.id === 'study')?.used).toBe(0);
  });

  it('ignores work from earlier weeks', () => {
    const lastWeek = [session('2026-09-09T09:00:00', { directionId: 'study' })];
    const progress = directionProgress(lastWeek, directions, WED);
    expect(progress.find((p) => p.direction.id === 'study')?.used).toBe(0);
  });

  it('flags over-budget and reports the ratio past one', () => {
    const sessions = Array.from({ length: 12 }, (_, i) =>
      session(`2026-09-1${4 + Math.floor(i / 4)}T0${i % 4}:00:00`, { directionId: 'sport' }),
    );
    const progress = directionProgress(sessions, directions, WED);
    const sport = progress.find((p) => p.direction.id === 'sport')!;
    expect(sport.over).toBe(true);
    expect(sport.ratio).toBeGreaterThan(1);
  });
});

describe('unattributed work', () => {
  it('counts sessions with no direction separately from every budget', () => {
    // Legacy history must stay visible without inflating a budget nobody chose.
    const sessions = [session('2026-09-16T09:00:00'), session('2026-09-16T11:00:00', { directionId: 'study' })];
    expect(unattributedBlocks(sessions, [dir('study', 30)], WED)).toBe(1);
  });
});

describe('week summaries', () => {
  it('returns the requested number of weeks, oldest first', () => {
    const weeks = weekSummaries([], [dir('study', 30)], 4, WED);
    expect(weeks).toHaveLength(4);
    expect(weeks[3].key).toBe(weekKey(WED));
    expect(weeks[0].start.getTime()).toBeLessThan(weeks[3].start.getTime());
  });

  it('marks a past week that exceeded its total budget', () => {
    const many = Array.from({ length: 35 }, (_, i) =>
      session(`2026-09-0${i % 6 + 1}T09:00:00`, { directionId: 'study' }),
    );
    const weeks = weekSummaries(many, [dir('study', 30)], 3, WED);
    expect(weeks.some((w) => w.over)).toBe(true);
  });
});

describe('month grid', () => {
  it('renders one row per week and one square per block', () => {
    const sessions = [
      session('2026-09-15T09:00:00', { directionId: 'study' }),
      session('2026-09-16T09:00:00', { directionId: 'study' }),
    ];
    const rows = monthGrid(sessions, [dir('study', 30)], new Date('2026-09-10T12:00:00'));

    expect(rows.length).toBeGreaterThanOrEqual(4);
    const total = rows.reduce((sum, r) => sum + r.blocks.length, 0);
    expect(total).toBe(2);
  });

  it('gives a half block a square rather than dropping it', () => {
    const half = [session('2026-09-16T09:00:00', { focusedSec: 25 * 60, directionId: 'study' })];
    const rows = monthGrid(half, [dir('study', 30)], new Date('2026-09-10T12:00:00'));
    expect(rows.reduce((sum, r) => sum + r.blocks.length, 0)).toBe(1);
  });

  it('marks blocks beyond the week budget', () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      session(`2026-09-1${4 + i}T09:00:00`, { directionId: 'study' }),
    );
    const rows = monthGrid(many, [dir('study', 3)], new Date('2026-09-10T12:00:00'));
    const flagged = rows.flatMap((r) => r.blocks).filter((b) => b.over);
    expect(flagged).toHaveLength(2);
  });
});

describe('block formatting', () => {
  it('rounds away float noise from a fractional block', () => {
    // 20 s of a 50-minute block is 0.0066…; nobody wants to read that.
    expect(formatBlocks(20 / 3000)).toBe('0');
  });

  it('keeps one decimal for a half block', () => {
    expect(formatBlocks(0.5)).toBe('0.5');
  });

  it('shows a whole block without a trailing zero', () => {
    expect(formatBlocks(3)).toBe('3');
  });

  it('rounds a long fraction to one decimal', () => {
    expect(formatBlocks(2.66666)).toBe('2.7');
  });
});

describe('average quality', () => {
  it('averages only the rated sessions', () => {
    const sessions = [
      session('2026-09-16T09:00:00', { quality: 8 }),
      session('2026-09-16T11:00:00', { quality: 6 }),
      session('2026-09-16T13:00:00'),
    ];
    expect(averageQuality(sessions)).toBe(7);
  });

  it('returns null rather than zero when nothing was rated', () => {
    // Zero would read as "quality was terrible"; nothing was asked.
    expect(averageQuality([session('2026-09-16T09:00:00')])).toBeNull();
  });
});
