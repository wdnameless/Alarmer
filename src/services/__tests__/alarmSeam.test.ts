import { describe, expect, it } from 'vitest';
import { buildFirings, expandSchedule } from '../scheduleEngine';
import type { AlarmItem, Schedule } from '../../types';

/**
 * Schedules and alarms meet at one seam, and the two must not blur.
 *
 * Live testing surfaced the consequence of blurring them: the alarm list renders
 * the expanded firing list, so anything that writes back through the same setter
 * persists a schedule step as if the user had created it. `buildFirings` hides
 * the damage on read, which is exactly why it went unnoticed — the file keeps
 * stale copies the UI never shows.
 */

function schedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 's1',
    name: 'Утро',
    days: [1, 2, 3, 4, 5],
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    steps: [{ id: 'st1', kind: 'moment', time: '07:00', label: 'Подъём' }],
    ...overrides,
  };
}

const standalone: AlarmItem = {
  id: 'a1',
  title: 'Пробежка',
  time: '06:15',
  days: [1, 2, 3],
  repeat: 'days',
  enabled: true,
  sound: 'gentle',
};

describe('the schedule/alarm seam', () => {
  it('marks every firing it derives with its schedule', () => {
    for (const firing of expandSchedule(schedule())) {
      expect(firing.scheduleId).toBe('s1');
    }
  });

  it('leaves a standalone alarm untagged', () => {
    expect(standalone.scheduleId).toBeUndefined();
  });

  it('recomputes derived firings instead of carrying them over', () => {
    // A schedule edit must not leave the previous firing behind as a stray.
    const before = buildFirings([schedule()], [standalone]);
    const after = buildFirings(
      [schedule({ steps: [{ id: 'st1', kind: 'moment', time: '09:00', label: 'Позже' }] })],
      [standalone],
    );

    expect(before).toHaveLength(2);
    expect(after).toHaveLength(2);
    expect(after.find((f) => f.scheduleId)?.time).toBe('09:00');
  });

  it('drops a derived entry that reached the standalone list', () => {
    // What the write boundary must prevent: a copy of a schedule firing stored
    // as if the user had made it. On read it is discarded rather than shown.
    const leaked: AlarmItem = {
      ...standalone,
      id: 'sched:s1:st1',
      scheduleId: 's1',
      title: 'Подъём',
    };

    const firings = buildFirings([schedule()], [standalone, leaked]);

    // Exactly one firing for the schedule step, plus the standalone alarm.
    expect(firings.filter((f) => f.title === 'Подъём')).toHaveLength(1);
    expect(firings.find((f) => f.id === 'a1')).toBeDefined();
  });
});
