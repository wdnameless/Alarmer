import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

/**
 * The Timer view must be a pure renderer of backend state. The regression it
 * guards is that the countdown used to be React state: leaving the sub-tab
 * unmounted the component and silently reset the clock, and the mini overlay
 * had nothing to display.
 */

const listeners = new Map<string, (event: { payload: unknown }) => void>();

vi.mock('@tauri-apps/api/event', () => ({
  listen: (event: string, handler: (e: { payload: unknown }) => void) => {
    listeners.set(event, handler);
    return Promise.resolve(() => listeners.delete(event));
  },
  emit: vi.fn(() => Promise.resolve()),
}));

let backend: Record<string, unknown> = {
  total_secs: 1500,
  remaining_secs: 900,
  running: true,
  mode: 'countdown',
  phase: 'focus',
  block_index: 0,
  direction_id: null,
  overtime_secs: 0,
  overtime: false,
};

const invokeMock = vi.fn((cmd: string, args?: { mode?: string }) => {
  switch (cmd) {
    case 'timer_get_state':
      return Promise.resolve(backend);
    case 'timer_start':
      return Promise.resolve((backend = { ...backend, running: true }));
    case 'timer_pause':
      return Promise.resolve((backend = { ...backend, running: false }));
    case 'timer_reset':
      return Promise.resolve(
        (backend = {
          ...backend,
          running: false,
          remaining_secs: backend.total_secs,
        }),
      );
    case 'timer_set_mode':
      if (args && args.mode) {
        backend = { ...backend, mode: args.mode };
      }
      return Promise.resolve(backend);
    default:
      return Promise.resolve(undefined);
  }
});

vi.mock('@tauri-apps/api/core', () => ({ invoke: (cmd: string, args?: { mode?: string }) => invokeMock(cmd, args) }));

vi.mock('../services/sound', () => ({
  soundService: {
    playCountdownTick: vi.fn(),
    playUiClick: vi.fn(),
    playFinishAlarm: vi.fn(),
    speak: vi.fn(),
  },
}));

vi.mock('../services/music', () => ({
  MusicService: {
    play: vi.fn(),
    stop: vi.fn(),
  },
}));

Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });

import { Timer } from '../Timer';
import { StoreService } from '../../services/store';

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

describe('Timer view', () => {
  beforeEach(() => {
    listeners.clear();
    invokeMock.mockClear();
    cleanup();
    StoreService.setPreference('alarmer_timer_mode', 'countdown');
    backend = {
      mode: 'countdown',
      phase: 'focus',
      overtime: false,
      total_secs: 1500,
      remaining_secs: 900,
      running: true,
      overtime_secs: 0,
    };
  });

  it('renders the countdown it reads from the backend', async () => {
    render(<Timer theme={theme} />);

    // 900 s remaining = 15:00.
    await waitFor(() => expect(screen.getAllByText('15:00')[0]).toBeDefined());
  });

  it('re-renders from a backend tick without owning the clock', async () => {
    render(<Timer theme={theme} />);
    await waitFor(() => expect(screen.getAllByText('15:00')[0]).toBeDefined());

    // The backend broadcasts a new snapshot, exactly as timer::spawn does.
    listeners.get('timer://tick')?.({
      payload: { ...backend, remaining_secs: 840 },
    });

    await waitFor(() => expect(screen.getAllByText('14:00')[0]).toBeDefined());
  });

  it('survives being unmounted and remounted with the countdown intact', async () => {
    const first = render(<Timer theme={theme} />);
    await waitFor(() => expect(screen.getAllByText('15:00')[0]).toBeDefined());
    first.unmount();

    backend = { ...backend, remaining_secs: 600 };
    render(<Timer theme={theme} />);

    await waitFor(() => expect(screen.getAllByText('10:00')[0]).toBeDefined());
  });

  it('shows the armed duration on the minutes control', async () => {
    render(<Timer theme={theme} />);

    await waitFor(() => expect(screen.getByText('25 мин')).toBeDefined());
  });

  it('exposes the overtime state in flow mode instead of hiding it', async () => {
    backend = {
      mode: 'flow',
      phase: 'focus',
      overtime: true,
      total_secs: 60,
      remaining_secs: 0,
      running: true,
      overtime_secs: 65,
    };

    render(<Timer theme={theme} />);

    await waitFor(() => expect(screen.getByText('OVERTIME')).toBeDefined());
    expect(screen.getByText('+1:05')).toBeDefined();
  });

  it('renders block mode with phase (Фокус), counter, and direction badge', async () => {
    StoreService.setPreference('alarmer_timer_mode', 'block');
    backend = {
      mode: 'block',
      phase: 'focus',
      overtime: false,
      total_secs: 3000,
      remaining_secs: 3000,
      running: true,
      overtime_secs: 0,
      block_index: 2,
      direction_id: 'dir-1',
    };

    const directions = [
      { id: 'dir-1', name: 'Программирование', color: '#10b981', weeklyBlockBudget: 15, archived: false },
    ];

    render(<Timer theme={theme} directions={directions} />);

    await waitFor(() => {
      expect(screen.getByText('Блок 2')).toBeDefined();
      expect(screen.getAllByText('Фокус').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Программирование')).toBeDefined();
      expect(screen.getByText('БЛОКИ')).toBeDefined();
    });
  });

  it('renders rest phase correctly in block mode (Отдых)', async () => {
    StoreService.setPreference('alarmer_timer_mode', 'block');
    backend = {
      mode: 'block',
      phase: 'rest',
      overtime: false,
      total_secs: 600,
      remaining_secs: 600,
      running: true,
      overtime_secs: 0,
      block_index: 3,
      direction_id: 'dir-1',
    };

    render(<Timer theme={theme} />);

    await waitFor(() => {
      expect(screen.getAllByText('Отдых').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Блок 3')).toBeDefined();
    });
  });

  it('shows quality prompt when focus completes in block mode and calls onRateQuality', async () => {
    backend = {
      mode: 'block',
      phase: 'focus',
      overtime: false,
      total_secs: 3000,
      remaining_secs: 3000,
      running: true,
      overtime_secs: 0,
    };

    const onRateQuality = vi.fn();
    const directions = [
      { id: 'dir-1', name: 'Дизайн', color: '#8b5cf6', weeklyBlockBudget: 10, archived: false },
    ];

    StoreService.setPreference('alarmer_timer_mode', 'block');
    backend = { ...backend, block_index: 1, direction_id: 'dir-1' };
    render(<Timer theme={theme} directions={directions} onRateQuality={onRateQuality} />);

    // In focus, the prompt is not shown — it belongs to the end of a block.
    await waitFor(() => expect(screen.getAllByText('Фокус').length).toBeGreaterThanOrEqual(1));
    expect(screen.queryByText('Блок фокуса завершён')).toBeNull();

    // Transition to rest phase (focus phase ended, auto-rest started)
    listeners.get('timer://tick')?.({
      payload: {
        ...backend,
        remaining_secs: 600,
        phase: 'rest',
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Блок (фокуса )?завершён|Блок завершён/)).toBeDefined();
      expect(screen.getByText('Дизайн')).toBeDefined();
    });

    // Rate 8
    fireEvent.click(screen.getByText('8'));
    expect(onRateQuality).toHaveBeenCalledWith(8);

    // Prompt disappears after rating
    await waitFor(() => {
      expect(screen.queryByText('Блок фокуса завершён')).toBeNull();
    });
  });

  it('allows skipping the quality prompt without storing quality value', async () => {
    backend = {
      mode: 'block',
      phase: 'focus',
      overtime: false,
      total_secs: 3000,
      remaining_secs: 3000,
      running: true,
      overtime_secs: 0,
    };

    const onRateQuality = vi.fn();

    StoreService.setPreference('alarmer_timer_mode', 'block');
    backend = { ...backend, block_index: 1, direction_id: 'dir-1' };
    render(<Timer theme={theme} onRateQuality={onRateQuality} />);

    // Wait for the component to adopt the backend's block mode before nudging it.
    await waitFor(() => expect(screen.getAllByText('Фокус').length).toBeGreaterThanOrEqual(1));

    // Trigger transition to rest
    listeners.get('timer://tick')?.({
      payload: {
        ...backend,
        remaining_secs: 600,
        phase: 'rest',
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Блок (фокуса )?завершён|Блок завершён/)).toBeDefined();
    });

    // Click "Пропустить"
    fireEvent.click(screen.getByText('Пропустить'));

    // onRateQuality was NEVER called!
    expect(onRateQuality).not.toHaveBeenCalled();

    // Prompt is closed
    await waitFor(() => {
      expect(screen.queryByText('Блок фокуса завершён')).toBeNull();
    });
  });

  it('proves quality prompt does NOT appear outside block mode (R6)', async () => {
    // Mode is countdown
    backend = {
      mode: 'countdown',
      phase: 'focus',
      overtime: false,
      total_secs: 1500,
      remaining_secs: 0,
      running: false,
      overtime_secs: 0,
    };

    render(<Timer theme={theme} />);

    // Tick at 0
    listeners.get('timer://tick')?.({
      payload: { ...backend, remaining_secs: 0, remainingSeconds: 0 },
    });

    // Session event in countdown mode
    listeners.get('timer://session')?.({
      payload: {
        elapsedSeconds: 1500,
        targetSeconds: 1500,
        completedAt: new Date().toISOString(),
        completed: true,
        mode: 'countdown',
      },
    });

    // Verify quality prompt is completely absent
    expect(screen.queryByText('Блок фокуса завершён')).toBeNull();

    // In flow mode
    listeners.get('timer://tick')?.({
      payload: {
        ...backend,
        mode: 'flow',
        remaining_secs: 0,
        overtime: true,
      },
    });

    expect(screen.queryByText('Блок фокуса завершён')).toBeNull();
  });
});
