import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import type { TimerSnapshot } from '../../services/timer';

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

let backend: TimerSnapshot = {
  total_secs: 1500,
  remaining_secs: 900,
  running: true,
  mode: 'countdown',
  overtime_secs: 0,
  overtime: false,
};

const invokeMock = vi.fn((cmd: string) => {
  switch (cmd) {
    case 'timer_get_state':
      return Promise.resolve(backend);
    case 'timer_start':
      return Promise.resolve((backend = { ...backend, running: true }));
    case 'timer_pause':
      return Promise.resolve((backend = { ...backend, running: false }));
    case 'timer_reset':
      return Promise.resolve(
        (backend = { ...backend, running: false, remaining_secs: backend.total_secs }),
      );
    default:
      return Promise.resolve(undefined);
  }
});

vi.mock('@tauri-apps/api/core', () => ({ invoke: (cmd: string) => invokeMock(cmd) }));

vi.mock('../services/sound', () => ({
  soundService: {
    playCountdownTick: vi.fn(),
    playUiClick: vi.fn(),
    playFinishAlarm: vi.fn(),
    speak: vi.fn(),
  },
}));

Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });

import { Timer } from '../Timer';

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
  });

  it('renders the countdown it reads from the backend', async () => {
    render(<Timer theme={theme} />);

    // 900 s remaining = 15:00.
    await waitFor(() => expect(screen.getByText('15:00')).toBeDefined());
  });

  it('re-renders from a backend tick without owning the clock', async () => {
    render(<Timer theme={theme} />);
    await waitFor(() => expect(screen.getByText('15:00')).toBeDefined());

    // The backend broadcasts a new snapshot, exactly as timer::spawn does.
    listeners.get('timer://tick')?.({
      payload: { ...backend, remaining_secs: 840 },
    });

    await waitFor(() => expect(screen.getByText('14:00')).toBeDefined());
  });

  it('survives being unmounted and remounted with the countdown intact', async () => {
    // Regression: this is the case that used to lose the timer. The component
    // has no clock, so a remount simply re-reads the backend.
    const first = render(<Timer theme={theme} />);
    await waitFor(() => expect(screen.getByText('15:00')).toBeDefined());
    first.unmount();

    backend = { ...backend, remaining_secs: 600 };
    render(<Timer theme={theme} />);

    await waitFor(() => expect(screen.getByText('10:00')).toBeDefined());
  });

  it('shows the armed duration on the minutes control', async () => {
    render(<Timer theme={theme} />);

    await waitFor(() => expect(screen.getByText('25')).toBeDefined());
  });

  it('exposes the overtime state in flow mode instead of hiding it', async () => {
    backend = {
      total_secs: 60,
      remaining_secs: 0,
      running: true,
      mode: 'flow',
      overtime_secs: 65,
      overtime: true,
    };

    render(<Timer theme={theme} />);

    await waitFor(() => expect(screen.getByText('OVERTIME')).toBeDefined());
    expect(screen.getByText('+1:05')).toBeDefined();
  });
});
