import { describe, expect, it } from 'vitest';
import type { Direction, SessionRecord } from '../../types';
import { buildHistoryDigest } from '../aiHistory';

describe('buildHistoryDigest', () => {
  const directions: Direction[] = [
    { id: 'dir-1', name: 'Код', color: '#ff0000', weeklyBlockBudget: 10, archived: false },
    { id: 'dir-2', name: 'Спорт', color: '#00ff00', weeklyBlockBudget: 5, archived: false },
  ];

  // Monday 2026-09-14 10:00:00 UTC
  const monday = new Date('2026-09-14T10:00:00.000Z');

  const sessions: SessionRecord[] = [
    {
      id: 's-1',
      startedAt: '2026-09-14T10:00:00.000Z',
      endedAt: '2026-09-14T10:50:00.000Z',
      focusedSec: 3000, // 50 min = 1 block
      completed: true,
      label: 'SECRET_LABEL_ALPHA',
      directionId: 'dir-1',
      quality: 9,
      blocks: 1,
    },
    {
      id: 's-2',
      startedAt: '2026-09-14T11:00:00.000Z',
      endedAt: '2026-09-14T11:50:00.000Z',
      focusedSec: 3000, // 50 min = 1 block
      completed: true,
      label: 'TOP_SECRET_FEATURE_BETA',
      directionId: 'dir-1',
      quality: 7,
      blocks: 1,
    },
    {
      id: 's-3',
      startedAt: '2026-09-15T14:00:00.000Z',
      endedAt: '2026-09-15T14:50:00.000Z',
      focusedSec: 3000, // 50 min = 1 block
      completed: true,
      label: 'CONFIDENTIAL_CUSTOMER_WORK',
      directionId: 'dir-2',
      quality: 10,
      blocks: 1,
    },
    {
      id: 's-4',
      startedAt: '2026-09-15T16:00:00.000Z',
      endedAt: '2026-09-15T16:25:00.000Z',
      focusedSec: 1500, // 25 min = 0.5 block
      completed: true,
      label: 'PRIVATE_NOTES_GAMMA',
      // unattributed
    },
  ];

  it('aggregates sessions correctly into per-day stats, direction budgets, byHour and totals', () => {
    const digest = buildHistoryDigest(sessions, directions, 50, monday);

    expect(digest.totals).toEqual({
      sessions: 4,
      blocks: 3.5,
      minutes: 175,
    });

    const day1Key = '2026-09-14';
    const day2Key = '2026-09-15';

    expect(digest.days[day1Key]).toBeDefined();
    expect(digest.days[day1Key].blocks).toBe(2);
    expect(digest.days[day1Key].minutes).toBe(100);
    expect(digest.days[day1Key].avgQuality).toBe(8); // (9 + 7) / 2

    expect(digest.days[day2Key]).toBeDefined();
    expect(digest.days[day2Key].blocks).toBe(1.5);
    expect(digest.days[day2Key].minutes).toBe(75);
    expect(digest.days[day2Key].avgQuality).toBe(10); // s-4 has no quality

    const dir1 = digest.directions.find((d) => d.name === 'Код');
    expect(dir1).toBeDefined();
    expect(dir1?.blocks).toBe(2);
    expect(dir1?.budget).toBe(10);

    const dir2 = digest.directions.find((d) => d.name === 'Спорт');
    expect(dir2).toBeDefined();
    expect(dir2?.blocks).toBe(1);
    expect(dir2?.budget).toBe(5);

    const unattributed = digest.directions.find((d) => d.name === 'Без направления');
    expect(unattributed).toBeDefined();
    expect(unattributed?.blocks).toBe(0.5);

    expect(digest.byHour).toHaveLength(24);
    const sumByHour = digest.byHour.reduce((a, b) => a + b, 0);
    expect(sumByHour).toBe(175);
  });

  it('serialised digest strictly contains NO session labels or session ids', () => {
    const digest = buildHistoryDigest(sessions, directions, 50, monday);
    const serialised = JSON.stringify(digest);

    expect(serialised).not.toContain('SECRET_LABEL_ALPHA');
    expect(serialised).not.toContain('TOP_SECRET_FEATURE_BETA');
    expect(serialised).not.toContain('CONFIDENTIAL_CUSTOMER_WORK');
    expect(serialised).not.toContain('PRIVATE_NOTES_GAMMA');
    expect(serialised).not.toContain('s-1');
    expect(serialised).not.toContain('s-2');
    expect(serialised).not.toContain('s-3');
    expect(serialised).not.toContain('s-4');
  });

  it('handles empty sessions gracefully with 0 totals and empty days', () => {
    const digest = buildHistoryDigest([], directions, 50, monday);
    expect(digest.totals).toEqual({
      sessions: 0,
      blocks: 0,
      minutes: 0,
    });
    expect(Object.keys(digest.days)).toHaveLength(0);
    expect(digest.directions.map((d) => d.blocks)).toEqual([0, 0]);
    expect(digest.byHour.every((h) => h === 0)).toBe(true);
  });
});
