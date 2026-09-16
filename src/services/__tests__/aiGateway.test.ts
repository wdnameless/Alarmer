import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AIGateway } from '../aiGateway';

/**
 * The one door to the model.
 *
 * These cover the contract every AI feature depends on: a request either yields
 * a parsed object or a reason, and a failure is never presented as a success.
 * The path used to be untested while three callers relied on it.
 */

const invokeMock = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

let tauri = true;
vi.mock('../platform', () => ({ isTauri: () => tauri }));

const request = {
  system: 'system',
  user: 'user',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

describe('AIGateway', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    tauri = true;
  });

  it('parses the object the model returned', async () => {
    invokeMock.mockResolvedValue({ content: '{"alarms":[],"note":"ок"}', error: null });

    const { value, error } = await AIGateway.requestJson(request);

    expect(error).toBeNull();
    expect(value.note).toBe('ок');
  });

  it('unwraps a fenced code block, which models add despite a JSON-only request', async () => {
    invokeMock.mockResolvedValue({ content: '```json\n{"a":1}\n```', error: null });

    const { value } = await AIGateway.requestJson(request);

    expect(value.a).toBe(1);
  });

  it('recovers an object wrapped in prose', async () => {
    invokeMock.mockResolvedValue({ content: 'Конечно! Вот результат: {"a":2} Готово.', error: null });

    const { value } = await AIGateway.requestJson(request);

    expect(value.a).toBe(2);
  });

  it('reports the backend failure rather than returning empty success', async () => {
    // The regression this guards: a blocked or dead endpoint used to be caught
    // and reported as a successful offline edit, so the model was never called
    // and nothing said so.
    invokeMock.mockResolvedValue({ content: '', error: 'Не удалось подключиться к http://x' });

    const { value, error } = await AIGateway.requestJson(request);

    expect(error).toBe('Не удалось подключиться к http://x');
    expect(value).toEqual({});
  });

  it('rejects a non-object answer instead of pretending it parsed', async () => {
    invokeMock.mockResolvedValue({ content: '[1,2,3]', error: null });

    const { error } = await AIGateway.requestJson(request);

    expect(error).toContain('неожиданном формате');
  });

  it('reports unparseable content rather than throwing', async () => {
    invokeMock.mockResolvedValue({ content: 'это не json', error: null });

    const { value, error } = await AIGateway.requestJson(request);

    expect(error).toContain('неожиданном формате');
    expect(value).toEqual({});
  });

  it('surfaces a thrown IPC error as a message', async () => {
    invokeMock.mockRejectedValue(new Error('ipc exploded'));

    const { error } = await AIGateway.requestJson(request);

    expect(error).toBe('ipc exploded');
  });

  it('refuses outside the app instead of failing silently', async () => {
    tauri = false;

    const { error } = await AIGateway.requestJson(request);

    expect(error).toContain('только в приложении');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('reports whether a key is stored, without reading it', async () => {
    invokeMock.mockResolvedValue(true);
    expect(await AIGateway.hasKey()).toBe(true);
    // The key itself is never returned to the webview.
    expect(invokeMock).toHaveBeenCalledWith('has_api_key');
  });

  it('reports no key outside the app', async () => {
    tauri = false;
    expect(await AIGateway.hasKey()).toBe(false);
  });

  it('sends the key to the credential store, never to the model request', async () => {
    invokeMock.mockResolvedValue(undefined);

    await AIGateway.setKey('sk-secret');

    expect(invokeMock).toHaveBeenCalledWith('set_api_key', { key: 'sk-secret' });
  });
});
