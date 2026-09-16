import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import type { SessionRecord, ScheduleStep } from '../../types';
import { StatsView } from '../StatsView';
import { TasksView } from '../TasksView';
import { BlockPlayer } from '../BlockPlayer';

vi.mock('../services/sound', () => ({
  soundService: { playCountdownTick: vi.fn(), playUiClick: vi.fn(), playFinishAlarm: vi.fn(), speak: vi.fn() },
}));

const theme = {
  id: 'winter' as const,
  name: 'Winter',
  bg: '#050505',
  surface: '#0a0a0a',
  cardBg: '#0f0f0f',
  border: '#27272a',
  text: '#fafafa',
  subtext: '#a1a1aa',
  accent: '#ff7a1a',
  accentGlow: 'rgba(255,122,26,0.28)',
  ringTrack: '#1c1c1f',
  ringProgress: '#ff7a1a',
  ticks: '#3f3f46',
};

const block: Extract<ScheduleStep, { kind: 'block' }> = {
  id: 'st1',
  kind: 'block',
  time: '07:15',
  label: 'Разминка',
  exercises: [
    { id: 'e1', name: 'Шея', durationSec: 2, kind: 'prepare' },
    { id: 'e2', name: 'Плечи', durationSec: 1, kind: 'work' },
  ],
};

/**
 * Advances the fake clock one second at a time.
 *
 * The countdown reads its current second from a ref that is refreshed on every
 * render, so a batch advance would run every tick against the same stale value.
 * Real time lets React render between ticks; this reproduces that.
 */
function advanceSeconds(seconds: number) {
  for (let i = 0; i < seconds; i += 1) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

describe('session recording from the block player', () => {
  beforeEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('reports a finished block with the time actually spent', () => {
    vi.useFakeTimers();
    const recorded: SessionRecord[] = [];

    render(
      <BlockPlayer
        theme={theme}
        block={block}
        scheduleId="sched-1"
        onSession={(s) => recorded.push(s)}
        onClose={() => {}}
      />,
    );

    // Run the block to its end: 2 s + 1 s.
    advanceSeconds(4);

    expect(recorded).toHaveLength(1);
    expect(recorded[0].focusedSec).toBeGreaterThan(0);
    expect(recorded[0].completed).toBe(true);
    expect(recorded[0].scheduleId).toBe('sched-1');
    expect(recorded[0].stepId).toBe('st1');
    expect(recorded[0].label).toBe('Разминка');
  });

  it('does not double-report when the block finishes and is then closed', () => {
    vi.useFakeTimers();
    const recorded: SessionRecord[] = [];

    render(
      <BlockPlayer
        theme={theme}
        block={block}
        scheduleId="sched-1"
        onSession={(s) => recorded.push(s)}
        onClose={() => {}}
      />,
    );

    advanceSeconds(4);
    act(() => {
      screen.getByTitle('Закрыть блок').click();
    });

    // One block is one session; closing afterwards must not append a duplicate.
    expect(recorded).toHaveLength(1);
  });

  it('counts a partially completed block but marks it unfinished', () => {
    vi.useFakeTimers();
    const recorded: SessionRecord[] = [];

    render(
      <BlockPlayer
        theme={theme}
        block={block}
        scheduleId="sched-1"
        onSession={(s) => recorded.push(s)}
        onClose={() => {}}
      />,
    );

    advanceSeconds(1);
    act(() => {
      screen.getByTitle('Закрыть блок').click();
    });

    expect(recorded).toHaveLength(1);
    expect(recorded[0].completed).toBe(false);
    expect(recorded[0].focusedSec).toBeGreaterThan(0);
  });
});

describe('statistics view', () => {
  beforeEach(cleanup);

  it('explains the empty state instead of showing zeros', () => {
    render(<StatsView theme={theme} sessions={[]} tasks={[]} />);

    expect(screen.getByText('Пока нечего считать')).toBeDefined();
  });

  it('shows the week total, the streak and the session history', () => {
    const today = new Date();
    const session: SessionRecord = {
      id: 's1',
      label: 'Разминка',
      focusedSec: 30 * 60,
      startedAt: new Date(today.getTime() - 1800_000).toISOString(),
      endedAt: today.toISOString(),
      completed: true,
    };

    render(<StatsView theme={theme} sessions={[session]} tasks={[]} />);

    expect(screen.getByText('За 7 дней')).toBeDefined();
    // Today has focus, so the streak reads one day.
    expect(screen.getByText('день')).toBeDefined();
    // 30 мин appears twice by design: as the week total and in the history row.
    expect(screen.getAllByText('30 мин').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Последние сессии')).toBeDefined();
    expect(screen.getByText('Разминка')).toBeDefined();
  });

  it('marks an interrupted session as unfinished in the history', () => {
    const session: SessionRecord = {
      id: 's1',
      label: 'Таймер',
      focusedSec: 120,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      completed: false,
    };

    render(<StatsView theme={theme} sessions={[session]} tasks={[]} />);

    expect(screen.getByText('не завершена')).toBeDefined();
  });
});

describe('tasks view', () => {
  beforeEach(cleanup);

  it('adds a task and shows progress', () => {
    function Harness() {
      const [tasks, setTasks] = useState<Parameters<typeof TasksView>[0]['tasks']>([]);
      return <TasksView theme={theme} tasks={tasks} onUpdateTasks={setTasks} schedules={[]} />;
    }

    render(<Harness />);
    expect(screen.getByText(/Пока пусто/)).toBeDefined();

    const input = screen.getByLabelText('Новая задача');
    fireEvent.change(input, { target: { value: 'Написать отчёт' } });
    act(() => {
      screen.getByTitle('Добавить задачу').click();
    });

    expect(screen.getByText('Написать отчёт')).toBeDefined();
    expect(screen.getByText('0 / 1')).toBeDefined();
  });

  it('marks a task done and moves it under the completed heading', () => {
    function Harness() {
      const [tasks, setTasks] = useState<Parameters<typeof TasksView>[0]['tasks']>([
        { id: 't1', title: 'Задача', done: false, createdAt: new Date().toISOString() },
      ]);
      return <TasksView theme={theme} tasks={tasks} onUpdateTasks={setTasks} schedules={[]} />;
    }

    render(<Harness />);
    act(() => {
      screen.getByLabelText('Отметить «Задача» выполненной').click();
    });

    expect(screen.getByText('1 / 1')).toBeDefined();
    expect(screen.getByText('Выполнено')).toBeDefined();
  });

  it('turns a schedule step into a task that keeps the link back to it', () => {
    const schedule: Parameters<typeof TasksView>[0]['schedules'][number] = {
      id: 'sched-1',
      name: 'Утренняя программа',
      days: [1, 2, 3, 4, 5],
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      steps: [{ id: 'st1', kind: 'moment', time: '07:00', label: 'Подъём' }],
    };

    let latest: Parameters<typeof TasksView>[0]['tasks'] = [];

    function Harness() {
      const [tasks, setTasks] = useState<Parameters<typeof TasksView>[0]['tasks']>([]);
      latest = tasks;
      return (
        <TasksView theme={theme} tasks={tasks} onUpdateTasks={setTasks} schedules={[schedule]} />
      );
    }

    render(<Harness />);
    expect(screen.getByText('Из расписания')).toBeDefined();

    act(() => {
      screen.getByTitle('Добавить «Подъём» из «Утренняя программа»').click();
    });

    // The link is the whole point: a task that knows its program can be shown
    // beside it on the Today screen and counted against it.
    expect(latest).toHaveLength(1);
    expect(latest[0]).toMatchObject({ title: 'Подъём', scheduleId: 'sched-1', stepId: 'st1' });
  });

  it('stops offering a step once it has become a task', () => {
    const schedule: Parameters<typeof TasksView>[0]['schedules'][number] = {
      id: 'sched-1',
      name: 'Программа',
      days: [],
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      steps: [{ id: 'st1', kind: 'moment', time: '07:00', label: 'Подъём' }],
    };

    render(
      <TasksView
        theme={theme}
        tasks={[{ id: 't1', title: 'Подъём', done: false, createdAt: '', stepId: 'st1' }]}
        onUpdateTasks={() => {}}
        schedules={[schedule]}
      />,
    );

    expect(screen.queryByText('Из расписания')).toBeNull();
  });

  it('ignores disabled schedules when offering steps', () => {
    const schedule: Parameters<typeof TasksView>[0]['schedules'][number] = {
      id: 'sched-1',
      name: 'Выключенная',
      days: [],
      enabled: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      steps: [{ id: 'st1', kind: 'moment', time: '07:00', label: 'Подъём' }],
    };

    render(<TasksView theme={theme} tasks={[]} onUpdateTasks={() => {}} schedules={[schedule]} />);

    expect(screen.queryByText('Из расписания')).toBeNull();
  });
});
