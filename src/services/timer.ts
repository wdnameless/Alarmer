import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from './platform';

/**
 * The countdown timer, backed by the Rust `timer` module.
 *
 * The clock itself lives in the backend: a component-owned countdown was lost
 * the moment its sub-tab unmounted, the mini overlay had nothing to display
 * when that component was gone, and the global hotkeys drove a timer that was
 * not running. Here the frontend only issues commands and renders snapshots.
 */

export type TimerPhase = 'focus' | 'rest';
export type TimerMode = 'countdown' | 'flow' | 'block';

export interface TimerSnapshot {
  total_secs: number;
  remaining_secs: number;
  running: boolean;
  mode: TimerMode;
  overtime_secs: number;
  overtime: boolean;
  /** Which half of a block is running. Always `focus` outside block mode. */
  phase: TimerPhase;
  /** Completed focus phases today; the counter the user sees. */
  block_index: number;
  direction_id: string | null;
}

const IDLE: TimerSnapshot = {
  total_secs: 25 * 60,
  remaining_secs: 25 * 60,
  running: false,
  mode: 'countdown',
  overtime_secs: 0,
  overtime: false,
  phase: 'focus',
  block_index: 0,
  direction_id: null,
};

/** Mirrors the backend's clamp, so the UI never arms something it cannot set. */
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 180;

/**
 * A finished stretch of focus reported by the backend timer.
 *
 * The clock lives in Rust, so the measurement of how long the user actually
 * focused has to come from there: a webview that was hidden or unmounted never
 * saw the seconds go by.
 */
export interface TimerSessionEvent {
  focused_secs: number;
  started_at_ms: number;
  ended_at_ms: number;
  completed: boolean;
  /** Direction the finished block belonged to, when one was set. */
  direction_id: string | null;
  /** Phase that finished; only `focus` earns blocks. */
  phase: TimerPhase;
}

export class TimerService {
  /**
   * Snapshot of the current timer state.
   *
   * Outside Tauri there is no backend to ask, so the idle state is returned and
   * every command below becomes a no-op rather than a rejected promise.
   */
  static async getState(): Promise<TimerSnapshot> {
    if (!isTauri()) return IDLE;
    try {
      return await invoke<TimerSnapshot>('timer_get_state');
    } catch (e) {
      console.warn('timer_get_state failed:', e);
      return IDLE;
    }
  }

  static async setDuration(minutes: number): Promise<void> {
    if (!isTauri()) return;
    const clamped = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(minutes)));
    await invoke('timer_set_duration', { secs: clamped * 60 });
  }

  static async start(): Promise<void> {
    if (!isTauri()) return;
    await invoke('timer_start');
  }

  static async pause(): Promise<void> {
    if (!isTauri()) return;
    await invoke('timer_pause');
  }

  static async toggle(): Promise<void> {
    const state = await TimerService.getState();
    return state.running ? TimerService.pause() : TimerService.start();
  }

  static async reset(): Promise<void> {
    if (!isTauri()) return;
    await invoke('timer_reset');
  }

  static async setMode(mode: TimerMode): Promise<void> {
    if (!isTauri()) return;
    await invoke('timer_set_mode', { mode });
  }

  /** Arms the focus/rest cycle lengths for block mode. */
  static async setBlockSettings(focusMin: number, restMin: number): Promise<void> {
    if (!isTauri()) return;
    await invoke('timer_set_block_settings', { focusMin, restMin });
  }

  /** Points the timer at a direction, so finished blocks can be attributed. */
  static async setDirection(directionId: string | null): Promise<void> {
    if (!isTauri()) return;
    await invoke('timer_set_direction', { directionId });
  }

  /**
   * Subscribes to completed stretches of focus.
   *
   * Unlike the tick subscription this is keyed to the event itself, so the
   * recording of a session does not depend on any component being mounted.
   */
  static onSession(handler: (session: TimerSessionEvent) => void): () => void {
    if (!isTauri()) return () => {};

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listen<TimerSessionEvent>('timer://session', (e) => handler(e.payload)).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }

  /**
   * Subscribes to backend timer state.
   *
   * Both the once-a-second tick and the "something else changed it" nudge from
   * the global hotkeys land here, so a shortcut pressed while the window is
   * unfocused still updates the display.
   */
  static subscribe(handler: (state: TimerSnapshot) => void): () => void {
    if (!isTauri()) return () => {};

    const unlisteners: Array<() => void> = [];
    let cancelled = false;

    const bind = (event: string) => {
      void listen<TimerSnapshot>(event, (e) => handler(e.payload)).then((fn) => {
        if (cancelled) fn();
        else unlisteners.push(fn);
      });
    };

    bind('timer://tick');
    bind('timer://changed');

    return () => {
      cancelled = true;
      unlisteners.forEach((fn) => fn());
    };
  }
}
