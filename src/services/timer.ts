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

export type TimerMode = 'countdown' | 'flow';

export interface TimerSnapshot {
  total_secs: number;
  remaining_secs: number;
  running: boolean;
  mode: TimerMode;
  overtime_secs: number;
  overtime: boolean;
}

const IDLE: TimerSnapshot = {
  total_secs: 25 * 60,
  remaining_secs: 25 * 60,
  running: false,
  mode: 'countdown',
  overtime_secs: 0,
  overtime: false,
};

/** Mirrors the backend's clamp, so the UI never arms something it cannot set. */
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 180;

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
