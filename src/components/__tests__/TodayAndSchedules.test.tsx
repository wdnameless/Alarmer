import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import type { Schedule } from '../../types';
import { TodayView } from '../TodayView';
import { SchedulesPanel } from '../SchedulesPanel';

/**
 * The default screen — the one that answers "what should I be doing now".
 *
 * It had no test at all, which is how it stayed mounted nowhere near the ringing
 * surface and left the app's own default screen with a silent alarm clock.
 */

vi.mock('../services/sound', () => ({
  soundService: {
    playUiClick: vi.fn(),
    playCountdownTick: vi.fn(),
    speak: vi.fn(),
    playFinishAlarm: vi.fn(),
  },
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

/** A program that runs every day and has both kinds of step. */
function program(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 's1',
    name: 'Утренняя программа',
    days: [],
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    steps: [
      { id: 'st1', kind: 'moment', time: '23:59', label: 'Подъём' },
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

/**
 * The view reads the clock itself, so the tests pin it. A step "90 minutes
 * ahead" would otherwise wrap past midnight in the late evening and stop being
 * ahead at all.
 */
const NOON = new Date(2026, 0, 7, 12, 0, 0);
function soonTime(minutesAhead: number): string {
  const soon = new Date(NOON.getTime() + minutesAhead * 60_000);
  return `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`;
}

/** A program with a single block step, at a time that is always still ahead. */
function blockProgram(exercises: Array<{ id: string; name: string; durationSec: number; kind: 'prepare' | 'work' }>): Schedule {
  return program({
    steps: [{ id: 'st2', kind: 'block', time: soonTime(90), label: 'Разминка', exercises }],
  });
}

describe('TodayView', () => {
  beforeEach(() => {
    cleanup();
    vi.useFakeTimers();
    vi.setSystemTime(NOON);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('says so plainly when nothing runs today', () => {
    render(<TodayView theme={theme} schedules={[]} />);

    expect(screen.getByText('Сегодня программ нет')).toBeDefined();
  });

  it('ignores a disabled program', () => {
    render(<TodayView theme={theme} schedules={[program({ enabled: false })]} />);

    expect(screen.getByText('Сегодня программ нет')).toBeDefined();
  });

  it('ignores a program that does not run on today', () => {
    // Pick a day this program does not cover, relative to today.
    const weekday = new Date().getDay();
    const otherDay = (weekday + 3) % 7;

    render(<TodayView theme={theme} schedules={[program({ days: [otherDay] })]} />);

    expect(screen.getByText('Сегодня программ нет')).toBeDefined();
  });

  it('leads with the next upcoming step and how far away it is', () => {
    const ahead = program({
      steps: [{ id: 'st1', kind: 'moment', time: soonTime(90), label: 'Подъём' }],
    });

    render(<TodayView theme={theme} schedules={[ahead]} />);

    expect(screen.getByText('Далее')).toBeDefined();
    // The label appears twice by design: as the headline answer, and in the
    // list of today's programs.
    expect(screen.getAllByText('Подъём').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/через /)).toBeDefined();
  });

  it('summarises a block with its total length rather than one exercise', () => {
    // 60 + 90 = 150 s, which reads as 3 min once rounded.
    const view = blockProgram([
      { id: 'e1', name: 'Шея', durationSec: 60, kind: 'prepare' },
      { id: 'e2', name: 'Плечи', durationSec: 90, kind: 'work' },
    ]);

    render(<TodayView theme={theme} schedules={[view]} />);

    expect(screen.getByText(/3 мин/)).toBeDefined();
    expect(screen.getByText('Начать блок')).toBeDefined();
  });

  it('offers to run the block straight from the card', () => {
    const view = blockProgram([{ id: 'e1', name: 'Шея', durationSec: 60, kind: 'work' }]);

    render(<TodayView theme={theme} schedules={[view]} />);

    act(() => {
      screen.getByText('Начать блок').click();
    });

    // Starting it swaps the card for the player.
    expect(screen.getByTitle('Закрыть блок')).toBeDefined();
  });

  it('does not offer a block player for a plain moment', () => {
    const momentOnly = program({
      steps: [{ id: 'st1', kind: 'moment', time: soonTime(90), label: 'Подъём' }],
    });

    render(<TodayView theme={theme} schedules={[momentOnly]} />);

    expect(screen.getAllByText('Подъём').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Начать блок')).toBeNull();
  });
});

describe('SchedulesPanel', () => {
  beforeEach(cleanup);

  it('invites the user to create one when there are none', () => {
    render(<SchedulesPanel theme={theme} schedules={[]} onUpdateSchedules={() => {}} />);

    expect(screen.getByText(/Пока нет сохранённых расписаний/)).toBeDefined();
  });

  it('toggles a whole program off and on', () => {
    const onUpdate = vi.fn();
    render(<SchedulesPanel theme={theme} schedules={[program()]} onUpdateSchedules={onUpdate} />);

    act(() => {
      screen.getByTitle('Выключить программу').click();
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0][0][0].enabled).toBe(false);
  });

  it('re-sorts steps by time after one is edited', () => {
    const onUpdate = vi.fn();
    render(<SchedulesPanel theme={theme} schedules={[program()]} onUpdateSchedules={onUpdate} />);

    act(() => {
      screen.getByTitle('Показать шаги').click();
    });

    const field = screen.getByLabelText('Время шага Подъём') as HTMLInputElement;
    // The step time is uncontrolled and commits on blur, so the DOM value and
    // the blur are the interaction — a change event alone would not fire it.
    field.value = '06:00';
    fireEvent.blur(field);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const steps = onUpdate.mock.calls[0][0][0].steps;
    expect(steps.map((s: { time: string }) => s.time)).toEqual(['06:00', '07:15']);
  });

  it('discards a malformed time rather than storing it', () => {
    const onUpdate = vi.fn();
    render(<SchedulesPanel theme={theme} schedules={[program()]} onUpdateSchedules={onUpdate} />);

    act(() => {
      screen.getByTitle('Показать шаги').click();
    });

    const field = screen.getByLabelText('Время шага Подъём') as HTMLInputElement;
    field.value = 'не время';
    fireEvent.blur(field);

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('drops the program when its last step is removed', () => {
    const onUpdate = vi.fn();
    const single = program({
      steps: [{ id: 'st1', kind: 'moment', time: '07:00', label: 'Единственный' }],
    });

    render(<SchedulesPanel theme={theme} schedules={[single]} onUpdateSchedules={onUpdate} />);

    act(() => {
      screen.getByTitle('Показать шаги').click();
    });
    act(() => {
      screen.getByTitle('Удалить шаг').click();
    });

    // A program with no steps would silently stop working; removing it says so.
    expect(onUpdate).toHaveBeenCalledWith([]);
  });
});
