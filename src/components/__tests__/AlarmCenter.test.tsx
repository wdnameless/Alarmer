import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import type { AlarmItem } from '../../types';

/**
 * Handlers registered through the Tauri event bridge, so a test can deliver an
 * `alarm://fired` event the way the Rust scheduler does.
 */
const listeners = new Map<string, (event: { payload: unknown }) => void>();

vi.mock('@tauri-apps/api/event', () => ({
  listen: (event: string, handler: (e: { payload: unknown }) => void) => {
    listeners.set(event, handler);
    return Promise.resolve(() => listeners.delete(event));
  },
}));

const invokeMock = vi.fn((cmd: string, args?: Record<string, unknown>) =>
  Promise.resolve<void>(undefined).then(() => ({ cmd, args })),
);
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => invokeMock(cmd, args),
}));

vi.mock('../services/sound', () => ({
  soundService: {
    startAlarmRamp: vi.fn(),
    stopAlarmRamp: vi.fn(),
    playCountdownTick: vi.fn(),
    playUiClick: vi.fn(),
    speak: vi.fn(),
    stopSpeaking: vi.fn(),
  },
}));

// The Rust scheduler only exists inside the Tauri shell.
Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });

import { AlarmCenter } from '../AlarmCenter';

const alarm: AlarmItem = {
  id: 'a1',
  title: 'Подъём',
  label: 'Подъём',
  time: '07:00',
  days: [1, 2, 3, 4, 5],
  repeat: 'days',
  enabled: true,
  sound: 'gentle',
  voicePrompt: 'Доброе утро!',
};

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

/** Delivers a fire event exactly as `scheduler.rs` emits it. */
function fireAlarm(overrides: Partial<Record<string, unknown>> = {}) {
  act(() => {
    listeners.get('alarm://fired')?.({
      payload: {
        id: 'a1',
        label: 'Подъём',
        time: '07:00',
        voice_prompt: 'Доброе утро!',
        snoozed_for: 0,
        late_by_minutes: 0,
        consumed: false,
        ...overrides,
      },
    });
  });
}

describe('AlarmCenter', () => {
  beforeEach(() => {
    listeners.clear();
    invokeMock.mockClear();
    cleanup();
  });

  it('pushes the effective schedule to the backend', () => {
    render(
      <AlarmCenter theme={theme} firings={[alarm]} schedules={[]} alarmVolume={0.8} alarmEnabled>
        <div />
      </AlarmCenter>,
    );

    const syncCall = invokeMock.mock.calls.find(([cmd]) => cmd === 'sync_alarms');
    expect(syncCall).toBeDefined();
    const payload = syncCall?.[1] as { alarms: Array<Record<string, unknown>> } | undefined;
    expect(payload?.alarms[0]).toMatchObject({ id: 'a1', time: '07:00', repeat: 'days' });
  });

  it('shows the ringing takeover whichever screen is mounted underneath', () => {
    // Regression: ringing used to live inside the Alarms sub-tab, so an alarm
    // that fired while the user was on any other screen made no sound and no
    // visible takeover. Children here stand in for that other screen.
    render(
      <AlarmCenter theme={theme} firings={[alarm]} schedules={[]} alarmVolume={0.8} alarmEnabled>
        <div data-testid="other-screen">Сегодня</div>
      </AlarmCenter>,
    );

    expect(screen.queryByText('Остановить')).toBeNull();
    fireAlarm();

    expect(screen.getByText('Остановить')).toBeDefined();
    expect(screen.getByText('07:00')).toBeDefined();
    // The underlying screen stays mounted; ringing is an overlay, not a swap.
    expect(screen.getByTestId('other-screen')).toBeDefined();
  });

  it('tells the backend to dismiss and closes the takeover on Stop', () => {
    render(
      <AlarmCenter theme={theme} firings={[alarm]} schedules={[]} alarmVolume={0.8} alarmEnabled>
        <div />
      </AlarmCenter>,
    );
    fireAlarm();

    act(() => {
      screen.getByText('Остановить').click();
    });

    expect(invokeMock).toHaveBeenCalledWith('dismiss_alarm', { id: 'a1' });
    expect(screen.queryByText('Остановить')).toBeNull();
  });

  it('snoozes for the chosen number of minutes', () => {
    render(
      <AlarmCenter theme={theme} firings={[alarm]} schedules={[]} alarmVolume={0.8} alarmEnabled>
        <div />
      </AlarmCenter>,
    );
    fireAlarm();

    act(() => {
      screen.getByText('+10 мин').click();
    });

    expect(invokeMock).toHaveBeenCalledWith('snooze_alarm', { id: 'a1', minutes: 10 });
    expect(screen.queryByText('Остановить')).toBeNull();
  });

  it('mirrors a consumed one-shot alarm as switched off', () => {
    const onDisable = vi.fn();
    render(
      <AlarmCenter theme={theme} firings={[alarm]} schedules={[]} alarmVolume={0.8} alarmEnabled onDisableAlarm={onDisable}>
        <div />
      </AlarmCenter>,
    );

    fireAlarm({ consumed: true });

    expect(onDisable).toHaveBeenCalledWith('a1');
  });

  it('offers to run an interval block straight from its ring', () => {
    const blockAlarm: AlarmItem = { ...alarm, id: 'sched:s1:st2', label: 'Разминка' };
    const schedule = {
      id: 's1',
      name: 'Утро',
      days: [],
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      steps: [
        {
          id: 'st2',
          kind: 'block' as const,
          time: '07:15',
          label: 'Разминка',
          exercises: [
            { id: 'e1', name: 'Шея', durationSec: 60, kind: 'prepare' as const },
            { id: 'e2', name: 'Плечи', durationSec: 90, kind: 'work' as const },
          ],
        },
      ],
    };

    render(
      <AlarmCenter theme={theme} firings={[blockAlarm]} schedules={[schedule]} alarmVolume={0.8} alarmEnabled>
        <div />
      </AlarmCenter>,
    );

    fireAlarm({ id: 'sched:s1:st2', label: 'Разминка' });

    // The whole point of a block is that it is runnable; making the user go find
    // it while the alarm is ringing is how the feature gets missed.
    expect(screen.getByText('Начать блок')).toBeDefined();
  });

  it('does not offer a block player for a plain moment alarm', () => {
    render(
      <AlarmCenter theme={theme} firings={[alarm]} schedules={[]} alarmVolume={0.8} alarmEnabled>
        <div />
      </AlarmCenter>,
    );

    fireAlarm();

    expect(screen.queryByText('Начать блок')).toBeNull();
  });
});
