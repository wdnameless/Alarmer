import { describe, expect, it } from 'vitest';
import { ScheduleParserService, parseScheduleHeuristically } from '../scheduleParser';
import type { AISettings } from '../../types';

const offline: AISettings = { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' };

describe('detecting schedule text', () => {
  it('treats a pasted multi-line plan as a schedule', () => {
    const plan = 'Пн-Пт:\n07:00 подъём\n07:15 разминка 15 минут\n22:30 отход ко сну';
    expect(ScheduleParserService.looksLikeSchedule(plan)).toBe(true);
  });

  it('does not treat a bare time command as a schedule', () => {
    expect(ScheduleParserService.looksLikeSchedule('будильник на 07:30')).toBe(false);
  });

  it('does not treat text without any time as a schedule', () => {
    expect(ScheduleParserService.looksLikeSchedule('сделай тему амолед')).toBe(false);
  });
});

describe('heuristic parsing', () => {
  it('extracts each timed line as a step', () => {
    const result = parseScheduleHeuristically('07:00 Подъём\n21:30 Отбой');

    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].time).toBe('07:00');
    expect(result.steps[0].label).toBe('Подъём');
    expect(result.steps[1].time).toBe('21:30');
  });

  it('sorts steps by time even when the text is unordered', () => {
    const result = parseScheduleHeuristically('19:00 Вечерняя растяжка\n07:00 Подъём');

    expect(result.steps.map((s) => s.time)).toEqual(['07:00', '19:00']);
  });

  it('understands weekday phrases', () => {
    expect(parseScheduleHeuristically('по будням 07:00 подъём').days).toEqual([1, 2, 3, 4, 5]);
    expect(parseScheduleHeuristically('каждый день 07:00 подъём').days).toEqual([]);
    expect(parseScheduleHeuristically('Пн, Ср, Пт 07:00 подъём').days).toEqual([1, 3, 5]);
  });

  it('turns a timed training with a duration into a runnable block', () => {
    const result = parseScheduleHeuristically('07:15 разминка 15 минут');
    const step = result.steps[0];

    expect(step.kind).toBe('block');
    if (step.kind !== 'block') throw new Error('expected block');
    expect(step.exercises.length).toBeGreaterThan(1);
    const total = step.exercises.reduce((sum, e) => sum + e.durationSec, 0);
    // Total should land near the stated 15 minutes, not wildly off.
    expect(total).toBeGreaterThanOrEqual(600);
    expect(total).toBeLessThanOrEqual(1080);
  });

  it('keeps a plain reminder as a moment rather than inventing exercises', () => {
    const result = parseScheduleHeuristically('14:00 принять витамины');
    expect(result.steps[0].kind).toBe('moment');
  });

  it('reports honestly when the text has no usable time', () => {
    const result = parseScheduleHeuristically('просто текст без времени');

    expect(result.steps).toEqual([]);
    expect(result.note).toContain('Не нашёл время');
  });

  it('ignores impossible clock values', () => {
    const result = parseScheduleHeuristically('99:99 не время');
    expect(result.steps).toEqual([]);
  });
});

describe('parsing service', () => {
  it('falls back to heuristics when no API key is configured', async () => {
    const result = await ScheduleParserService.parse('07:00 Подъём', offline);

    expect(result.steps).toHaveLength(1);
    expect(result.note).toContain('без ИИ');
  });

  it('handles empty input without throwing', async () => {
    const result = await ScheduleParserService.parse('   ', offline);
    expect(result.steps).toEqual([]);
  });

  it('promotes a draft into a schedule that keeps the source text', () => {
    const source = '07:00 Подъём';
    const draft = parseScheduleHeuristically(source);
    const schedule = ScheduleParserService.toSchedule(draft, source);

    expect(schedule.enabled).toBe(true);
    expect(schedule.sourceText).toBe(source);
    expect(schedule.id).toMatch(/^sched_/);
    expect(schedule.steps).toHaveLength(1);
  });

  it('starts parsed schedules enabled so they work immediately', () => {
    const draft = parseScheduleHeuristically('07:00 Подъём');
    expect(ScheduleParserService.toSchedule(draft, 'x').enabled).toBe(true);
  });
});

describe('run-on sentences', () => {
  it('splits a single-line plan joined by commas into separate steps', () => {
    const plan =
      'Ср, Пт: в 06:45 подъём и душ, в 07:00 зарядка 20 минут, в 19:30 силовая тренировка 45 минут, в 23:00 отход ко сну';
    const result = parseScheduleHeuristically(plan);

    expect(result.steps.map((s) => s.time)).toEqual(['06:45', '07:00', '19:30', '23:00']);
    expect(result.days).toEqual([3, 5]);
  });

  it('still splits line-separated plans correctly', () => {
    const result = parseScheduleHeuristically('07:00 Подъём\n19:00 Тренировка');
    expect(result.steps).toHaveLength(2);
  });

  it('turns a timed training inside a run-on sentence into a block', () => {
    const result = parseScheduleHeuristically('в 07:00 зарядка 20 минут, в 23:00 сон');
    const training = result.steps.find((s) => s.time === '07:00');

    expect(training?.kind).toBe('block');
  });
});
