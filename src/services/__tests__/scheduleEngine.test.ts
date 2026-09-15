import { describe, expect, it } from 'vitest';
import {
  blockDurationSec,
  buildFirings,
  describeDays,
  expandSchedule,
  findNextUp,
  firingIdForStep,
  schedulesForToday,
} from '../scheduleEngine';
import type { AlarmItem, Schedule } from '../../types';

function schedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 's1',
    name: 'Утренняя программа',
    days: [1, 2, 3, 4, 5],
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    steps: [
      { id: 'st1', kind: 'moment', time: '07:00', label: 'Подъём', voicePrompt: 'Встаём!' },
      {
        id: 'st2',
        kind: 'block',
        time: '07:15',
        label: 'Разминка',
        exercises: [
          { id: 'e1', name: 'Шея', durationSec: 60, kind: 'prepare' },
          { id: 'e2', name: 'Плечи', durationSec: 90, kind: 'work' },
        ],
      },
    ],
    ...overrides,
  };
}

describe('schedule expansion', () => {
  it('produces one firing per step with a stable, namespaced id', () => {
    const firings = expandSchedule(schedule());

    expect(firings).toHaveLength(2);
    expect(firings[0].id).toBe(firingIdForStep('s1', 'st1'));
    expect(firings[0].time).toBe('07:00');
    expect(firings[1].time).toBe('07:15');
  });

  it('inherits the schedule days so a weekday program only rings on weekdays', () => {
    const firings = expandSchedule(schedule({ days: [1, 2, 3, 4, 5] }));

    expect(firings.every((f) => f.days.join() === '1,2,3,4,5')).toBe(true);
  });

  it('expands to nothing when the schedule is disabled', () => {
    expect(expandSchedule(schedule({ enabled: false }))).toEqual([]);
  });

  it('marks each firing with its originating schedule', () => {
    expect(expandSchedule(schedule()).every((f) => f.scheduleId === 's1')).toBe(true);
  });

  it('falls back to the label when a step has no voice prompt', () => {
    const noVoice = schedule({
      steps: [{ id: 'only', kind: 'moment', time: '09:00', label: 'Почта' }],
    });

    expect(expandSchedule(noVoice)[0].voicePrompt).toBe('Почта');
  });
});

describe('building the firing list', () => {
  const manual: AlarmItem = {
    id: 'manual-1',
    title: 'Разовый',
    time: '12:00',
    days: [],
    enabled: true,
    sound: 'gentle',
  };

  it('keeps standalone alarms alongside schedule firings', () => {
    const firings = buildFirings([schedule()], [manual]);

    expect(firings.find((f) => f.id === 'manual-1')).toBeDefined();
    expect(firings).toHaveLength(3);
  });

  it('removes firings when their schedule is disabled, keeping the alarm list clean', () => {
    const firings = buildFirings([schedule({ enabled: false })], [manual]);

    expect(firings).toHaveLength(1);
    expect(firings[0].id).toBe('manual-1');
  });

  it('recomputes from scratch so edits do not leave stale firings behind', () => {
    const before = buildFirings([schedule()], []);
    const after = buildFirings([schedule({ steps: [schedule().steps[0]] })], []);

    expect(before).toHaveLength(2);
    expect(after).toHaveLength(1);
  });

  it('drops orphaned firings whose schedule no longer exists', () => {
    const orphan: AlarmItem = { ...manual, id: 'orphan', scheduleId: 'deleted-schedule' };
    const result = buildFirings([schedule()], [orphan]);

    expect(result.some((f) => f.id === 'orphan')).toBe(false);
    // The still-valid schedule keeps producing its own firings.
    expect(result).toHaveLength(2);
  });
});

describe('today views', () => {
  // Wednesday 06:30 local time.
  const wednesdayEarly = new Date(2026, 0, 7, 6, 30);

  it('reports the soonest upcoming step and how far away it is', () => {
    const next = findNextUp([schedule()], wednesdayEarly);

    expect(next?.step.label).toBe('Подъём');
    expect(next?.minutesUntil).toBe(30);
  });

  it('skips steps already past today', () => {
    // Wednesday 07:05 — the 07:00 moment has passed, 07:15 has not.
    const next = findNextUp([schedule()], new Date(2026, 0, 7, 7, 5));

    expect(next?.step.label).toBe('Разминка');
  });

  it('returns null when nothing is left today', () => {
    expect(findNextUp([schedule()], new Date(2026, 0, 7, 23, 0))).toBeNull();
  });

  it('ignores schedules that do not run today', () => {
    // Sunday, but the schedule runs Mon-Fri.
    expect(findNextUp([schedule()], new Date(2026, 0, 4, 6, 0))).toBeNull();
  });

  it('lists only the schedules that run today', () => {
    const weekend = schedule({ id: 's2', name: 'Выходные', days: [0, 6] });

    expect(schedulesForToday([schedule(), weekend], new Date(2026, 0, 4)).map((s) => s.id)).toEqual([
      's2',
    ]);
  });
});

describe('describing days', () => {
  it('recognises common patterns', () => {
    expect(describeDays([])).toBe('Каждый день');
    expect(describeDays([1, 2, 3, 4, 5])).toBe('По будням');
    expect(describeDays([0, 6])).toBe('По выходным');
    expect(describeDays([1, 3, 5])).toBe('Пн, Ср, Пт');
  });
});

describe('block duration', () => {
  it('sums the exercises', () => {
    const block = schedule().steps[1];
    if (block.kind !== 'block') throw new Error('expected a block step');

    expect(blockDurationSec(block)).toBe(150);
  });
});
