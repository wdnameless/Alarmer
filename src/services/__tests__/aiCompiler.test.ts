import { describe, it, expect } from 'vitest';
import { AICompilerService } from '../aiCompiler';
import { DEFAULT_DYNAMIC_UI } from '../../types/dynamicUi';
import type { AISettings } from '../../types';

/**
 * All cases run on the offline compiler path (no API key), which is the
 * deterministic path the app uses when the user has not configured BYOK.
 * The compiled mutation carries the full next DynamicUIConfig in `ui`.
 */
const offlineSettings: AISettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

const compile = (prompt: string, ui = DEFAULT_DYNAMIC_UI) =>
  AICompilerService.compileUserIntent(prompt, ui, offlineSettings);

describe('AICompilerService offline intent compilation', () => {
  it('hides both sleep and AI buttons on request', async () => {
    const result = await compile('убери кнопки ко сну и ИИ');

    expect(result.ui?.layout?.showSleepButton).toBe(false);
    expect(result.ui?.layout?.showAiScheduleButton).toBe(false);
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it('restores the sleep button when asked to bring it back', async () => {
    const hidden = {
      ...DEFAULT_DYNAMIC_UI,
      layout: { ...DEFAULT_DYNAMIC_UI.layout, showSleepButton: false },
    };

    const result = await compile('верни кнопки ко сну', hidden);

    expect(result.ui?.layout?.showSleepButton).toBe(true);
  });

  it('hides the current time badge on request', async () => {
    const result = await compile('убери текущее время');

    expect(result.ui?.layout?.showCurrentTimeBadge).toBe(false);
  });

  it('hides dial ticks on request', async () => {
    const result = await compile('убери засечки');

    expect(result.ui?.dial?.showTicks).toBe(false);
  });

  it('changes the accent colour for a cyberpunk request', async () => {
    const result = await compile('сделай киберпанк стиль');

    expect(result.ui?.colors?.accent).toBeDefined();
    expect(result.ui?.colors?.accent).not.toBe(DEFAULT_DYNAMIC_UI.colors.accent);
  });

  it('returns a usable explanation for text with no recognised command', async () => {
    const result = await compile('просто произвольный текст без совпадений шаблонов');

    expect(result).toBeDefined();
    expect(result.ui).toBeDefined();
    expect(typeof result.explanation).toBe('string');
    expect(result.explanation.length).toBeGreaterThan(0);
  });
});
