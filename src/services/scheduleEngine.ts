import type { AlarmItem, Schedule, ScheduleStep } from '../types';

/**
 * Projects saved schedules onto the firing model the scheduler consumes.
 *
 * The scheduler only knows about single moments (`AlarmItem`), while the product
 * is built around schedules. This module is the single seam between the two:
 * schedules stay the user-facing object, and everything the scheduler needs is
 * derived here rather than duplicated in UI code.
 */

/** Stable id for the alarm produced by a given schedule step. */
export function firingIdForStep(scheduleId: string, stepId: string): string {
  return `sched:${scheduleId}:${stepId}`;
}

function voiceForStep(step: ScheduleStep): string {
  if (step.voicePrompt) return step.voicePrompt;
  return step.kind === 'moment' ? step.label : `Начинаем: ${step.label}`;
}

/** Total running time of a block, in seconds. */
export function blockDurationSec(step: Extract<ScheduleStep, { kind: 'block' }>): number {
  return step.exercises.reduce((sum, e) => sum + e.durationSec, 0);
}

/**
 * Expands one schedule into the alarms that should exist for it.
 *
 * A disabled schedule expands to nothing — that is how whole-schedule toggling
 * works without deleting the definition. Step days inherit the schedule's days
 * so a weekday program only rings on weekdays.
 */
export function expandSchedule(schedule: Schedule): AlarmItem[] {
  if (!schedule.enabled) return [];

  return schedule.steps.map((step) => ({
    id: firingIdForStep(schedule.id, step.id),
    title: step.label,
    label: step.label,
    time: step.time,
    days: schedule.days,
    // A schedule is a recurring routine, so its firings are weekday-driven
    // even when the day list is empty ("every day").
    repeat: 'days' as const,
    enabled: true,
    sound: step.kind === 'moment' ? (step.sound ?? 'gentle') : 'gentle',
    voicePrompt: voiceForStep(step),
    voiceAnnouncement: voiceForStep(step),
    scheduleId: schedule.id,
  }));
}

/**
 * Combines schedule-derived firings with standalone alarms.
 *
 * Schedule-derived entries are recomputed from scratch every time, so edits and
 * toggles take effect immediately and no stale firings linger.
 */
export function buildFirings(schedules: Schedule[], standaloneAlarms: AlarmItem[]): AlarmItem[] {
  // Anything tagged with a scheduleId is derived data: it is recomputed below,
  // so tagged entries are dropped here rather than carried over. This also
  // clears orphans left behind by a schedule that has since been deleted.
  const manual = standaloneAlarms.filter((a) => !a.scheduleId);
  const expanded = schedules.flatMap(expandSchedule);
  return [...manual, ...expanded];
}

/** The next step to run today across all enabled schedules, or null. */
export interface NextUp {
  schedule: Schedule;
  step: ScheduleStep;
  /** Minutes from now until the step starts; 0 when it is due now. */
  minutesUntil: number;
}

/**
 * Finds the schedule step behind a scheduler firing id.
 *
 * The scheduler identifies firings by `sched:<schedule>:<step>`; the ringing UI
 * needs the step itself, so that a block alarm can offer to start its player
 * instead of leaving the user to go find it.
 */
export function findStepByFiringId(
  schedules: Schedule[],
  firingId: string,
): { schedule: Schedule; step: ScheduleStep } | null {
  const prefix = 'sched:';
  if (!firingId.startsWith(prefix)) return null;

  const rest = firingId.slice(prefix.length);
  const separator = rest.lastIndexOf(':');
  if (separator < 0) return null;

  const scheduleId = rest.slice(0, separator);
  const stepId = rest.slice(separator + 1);

  const schedule = schedules.find((s) => s.id === scheduleId);
  const step = schedule?.steps.find((s) => s.id === stepId);
  return schedule && step ? { schedule, step } : null;
}

/**
 * Finds the soonest upcoming step among enabled schedules that run today.
 *
 * Used by the Today screen to answer "what is next" without duplicating the
 * scheduler's matching rules.
 */
export function findNextUp(schedules: Schedule[], now: Date = new Date()): NextUp | null {
  const weekday = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let best: NextUp | null = null;

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;
    if (schedule.days.length > 0 && !schedule.days.includes(weekday)) continue;

    for (const step of schedule.steps) {
      const [h, m] = step.time.split(':').map(Number);
      const stepMinutes = h * 60 + m;
      if (stepMinutes < nowMinutes) continue;

      const minutesUntil = stepMinutes - nowMinutes;
      if (!best || minutesUntil < best.minutesUntil) {
        best = { schedule, step, minutesUntil };
      }
    }
  }

  return best;
}

/** Schedules that run on the given weekday. */
export function schedulesForToday(schedules: Schedule[], now: Date = new Date()): Schedule[] {
  const weekday = now.getDay();
  return schedules.filter(
    (s) => s.enabled && (s.days.length === 0 || s.days.includes(weekday)),
  );
}

/** Human label for a set of weekdays. */
export function describeDays(days: number[]): string {
  if (days.length === 0 || days.length === 7) return 'Каждый день';
  const names = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const sorted = [...days].sort((a, b) => a - b);
  const weekdays = [1, 2, 3, 4, 5];
  if (sorted.length === 5 && weekdays.every((d) => sorted.includes(d))) return 'По будням';
  if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) return 'По выходным';
  return sorted.map((d) => names[d]).join(', ');
}

/** Human label for how often an alarm rings, covering every repeat mode. */
export function describeRepeat(alarm: Pick<AlarmItem, 'repeat' | 'days'>): string {
  switch (alarm.repeat) {
    case 'once':
      return 'Один раз';
    case 'daily':
      return 'Каждый день';
    case 'days':
      return describeDays(alarm.days);
  }
}
