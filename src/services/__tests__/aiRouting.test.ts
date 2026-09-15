import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AICompilerService } from '../aiCompiler';
import { DEFAULT_DYNAMIC_UI } from '../../types/dynamicUi';
import type { AISettings } from '../../types';

/**
 * With a key present the model is the thing that answers, except for the narrow
 * set of local UI toggles. The regression these guard: ANY prompt containing
 * "покажи", "верни" or "тему" used to be hijacked by the offline keyword map, so
 * a real request like "покажи расписание на завтра" never reached the model.
 */

const gatewayMock = vi.fn();

vi.mock('../aiGateway', () => ({
  AIGateway: {
    hasKey: () => Promise.resolve(true),
    requestJson: (...args: unknown[]) => gatewayMock(...args),
  },
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: () => Promise.resolve(undefined) }));
vi.mock('../platform', () => ({ isTauri: () => false }));

const settings: AISettings = {
  apiKey: 'sk-test',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

const compile = (prompt: string) =>
  AICompilerService.compileUserIntent(prompt, DEFAULT_DYNAMIC_UI, settings);

describe('routing between the model and the local keyword map', () => {
  beforeEach(() => gatewayMock.mockClear());

  it('sends a request that merely mentions a UI word to the model', async () => {
    gatewayMock.mockResolvedValue({ value: {}, error: null });

    await compile('покажи расписание на завтра');

    expect(gatewayMock).toHaveBeenCalledTimes(1);
  });

  it('sends a scheduling request that shares a verb with UI commands to the model', async () => {
    gatewayMock.mockResolvedValue({ value: {}, error: null });

    await compile('верни будильник на 7 утра');

    expect(gatewayMock).toHaveBeenCalledTimes(1);
  });

  it('keeps an unambiguous local toggle local', async () => {
    await compile('убери засечки');

    expect(gatewayMock).not.toHaveBeenCalled();
  });

  it('reports the failure instead of passing the local edit off as the model', async () => {
    gatewayMock.mockResolvedValue({ value: {}, error: 'Не удалось подключиться к http://x' });

    const result = await compile('сделай красиво');

    expect(result.explanation).toContain('модель недоступна');
    expect(result.explanation).toContain('Не удалось подключиться');
  });

  it('adopts whatever the model returned when it answered', async () => {
    gatewayMock.mockResolvedValue({
      value: { type: 'ui', explanation: 'Готово', autoApply: true },
      error: null,
    });

    const result = await compile('сделай интерфейс похожим на терминал');

    expect(result.explanation).toBe('Готово');
  });
});

describe('validating model-produced alarms', () => {
  beforeEach(() => gatewayMock.mockClear());

  it('keeps a valid repeat mode and drops an invalid one to the default', async () => {
    gatewayMock.mockResolvedValue({
      value: {
        type: 'alarm',
        explanation: 'Расставил',
        alarms: [
          { title: 'Разовый', time: '09:00', repeat: 'once', days: [] },
          { title: 'Странный', time: '10:00', repeat: 'hourly', days: [] },
        ],
      },
      error: null,
    });

    const result = await compile('поставь будильники');

    expect(result.alarms?.[0].repeat).toBe('once');
    // An unrecognised mode must not become "once" and then fire forever.
    expect(result.alarms?.[1].repeat).toBe('days');
  });

  it('discards weekdays a model invented out of range', async () => {
    gatewayMock.mockResolvedValue({
      value: {
        type: 'alarm',
        explanation: 'Расставил',
        alarms: [{ title: 'A', time: '09:00', repeat: 'days', days: [1, 9, -1, 3] }],
      },
      error: null,
    });

    const result = await compile('поставь будильники');

    expect(result.alarms?.[0].days).toEqual([1, 3]);
  });

  it('reports no alarms rather than an empty array when there are none', async () => {
    gatewayMock.mockResolvedValue({
      value: { type: 'ui', explanation: 'Только интерфейс' },
      error: null,
    });

    const result = await compile('измени интерфейс');

    expect(result.alarms).toBeUndefined();
  });
});
