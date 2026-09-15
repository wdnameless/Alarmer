import type { SessionRecord } from '../types';

/**
 * Builds the session records the statistics are derived from.
 *
 * Kept separate from the UI so the rules — what counts as focus, what counts as
 * completed — are stated once and can be tested without rendering anything.
 */

let sequence = 0;

function nextId(): string {
  sequence += 1;
  return `session_${Date.now()}_${sequence}`;
}

/** What is known when a session starts. */
export interface SessionStart {
  label: string;
  scheduleId?: string;
  stepId?: string;
  startedAt: Date;
}

/**
 * A session in progress.
 *
 * Focus time accumulates from explicit increments rather than from
 * `endedAt - startedAt`, so paused time is excluded and a session left open
 * overnight does not report twelve hours of focus.
 */
export class SessionBuilder {
  private focusedSec = 0;
  private readonly start: SessionStart;

  constructor(start: SessionStart) {
    this.start = start;
  }

  /** Adds elapsed focus. Negative or zero increments are ignored. */
  addFocus(seconds: number): void {
    if (seconds > 0) this.focusedSec += seconds;
  }

  /** Seconds accumulated so far. */
  get focused(): number {
    return this.focusedSec;
  }

  /**
   * Finalises the session, or returns null when nothing was actually done.
   *
   * A block opened and closed immediately is not a session; recording it would
   * pad the statistics with noise the user never performed.
   */
  finish(endedAt: Date, completed: boolean): SessionRecord | null {
    if (this.focusedSec <= 0) return null;

    return {
      id: nextId(),
      scheduleId: this.start.scheduleId,
      stepId: this.start.stepId,
      label: this.start.label,
      focusedSec: Math.round(this.focusedSec),
      startedAt: this.start.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      completed,
    };
  }
}

/** Most recent sessions, newest first, capped for display. */
export function recentSessions(sessions: SessionRecord[], limit = 20): SessionRecord[] {
  return [...sessions]
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    .slice(0, limit);
}

/** Keeps the log bounded so the store file cannot grow without limit. */
export function trimSessions(sessions: SessionRecord[], keep = 2000): SessionRecord[] {
  if (sessions.length <= keep) return sessions;
  return [...sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt)).slice(0, keep);
}
