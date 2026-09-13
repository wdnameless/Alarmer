import { DynamicUIConfig, DEFAULT_DYNAMIC_UI } from '../types/dynamicUi';
import { AISettings } from '../types';

export class AIDynamicUIService {
  private static cleanJson(raw: string): string {
    return raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
  }

  static async generateDynamicUI(
    prompt: string,
    currentConfig: DynamicUIConfig,
    settings: AISettings
  ): Promise<DynamicUIConfig> {
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      return this.localFallbackUI(prompt, currentConfig);
    }

    const systemPrompt = `You are an elite UI/UX generative engine for a sleek desktop Timer/Alarmer app.
The user wants to dynamically customize the interface using natural language.
Return ONLY a valid JSON matching this TypeScript type:
{
  "themeName": string,
  "colors": {
    "bg": string (hex e.g. #0a0b0e),
    "surface": string (hex),
    "cardBg": string (hex),
    "border": string (hex),
    "text": string (hex),
    "subtext": string (hex),
    "accent": string (hex bright neon/primary),
    "accentGlow": string (hex with alpha e.g. #ff005580),
    "ringTrack": string (hex),
    "ringProgress": string (hex),
    "ticks": string (hex)
  },
  "typography": {
    "fontFamily": string ("system-ui" | "mono" | "cyber" | "serif"),
    "timeScale": number (0.8 to 1.4)
  },
  "dial": {
    "size": number (180 to 260),
    "showTicks": boolean,
    "tickLength": "short" | "normal" | "long",
    "glowIntensity": "none" | "subtle" | "high"
  },
  "layout": {
    "showPresetButtons": boolean,
    "buttonStyle": "rounded" | "square" | "pill",
    "glassmorphism": boolean
  }
}
Do not write markdown formatting or explanations. Output pure JSON only.`;

    const userPrompt = `Current UI Theme: "${currentConfig.themeName}". User request: "${prompt}". Generate a stunning matching UI config.`;

    try {
      const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(this.cleanJson(content));

      return {
        ...DEFAULT_DYNAMIC_UI,
        ...parsed,
        colors: {
          ...DEFAULT_DYNAMIC_UI.colors,
          ...(parsed.colors || {}),
        },
        typography: {
          ...DEFAULT_DYNAMIC_UI.typography,
          ...(parsed.typography || {}),
        },
        dial: {
          ...DEFAULT_DYNAMIC_UI.dial,
          ...(parsed.dial || {}),
        },
        layout: {
          ...DEFAULT_DYNAMIC_UI.layout,
          ...(parsed.layout || {}),
        },
      };
    } catch (e) {
      console.warn('AI remote UI generation failed, fallback to local:', e);
      return this.localFallbackUI(prompt, currentConfig);
    }
  }

  private static localFallbackUI(prompt: string, current: DynamicUIConfig): DynamicUIConfig {
    const lower = prompt.toLowerCase();
    const config: DynamicUIConfig = JSON.parse(JSON.stringify(current || DEFAULT_DYNAMIC_UI));

    if (lower.includes('киберпанк') || lower.includes('cyberpunk') || lower.includes('неон') || lower.includes('розов')) {
      config.themeName = 'Cyberpunk Matrix';
      config.colors.bg = '#090a10';
      config.colors.surface = '#141724';
      config.colors.cardBg = '#141724';
      config.colors.border = '#ff0055';
      config.colors.text = '#fef08a';
      config.colors.subtext = '#f472b6';
      config.colors.accent = '#ff0055';
      config.colors.accentGlow = '#ff005580';
      config.colors.ringTrack = '#251025';
      config.colors.ringProgress = '#00f0ff';
      config.colors.ticks = '#00f0ff';
      config.typography.fontFamily = 'cyber';
      config.dial.glowIntensity = 'high';
      config.dial.size = 210;
    } else if (lower.includes('амолед') || lower.includes('amoled') || lower.includes('черн') || lower.includes('black')) {
      config.themeName = 'Pure AMOLED Dark';
      config.colors.bg = '#000000';
      config.colors.surface = '#0a0a0a';
      config.colors.cardBg = '#0a0a0a';
      config.colors.border = '#222222';
      config.colors.text = '#ffffff';
      config.colors.subtext = '#71717a';
      config.colors.accent = '#ffffff';
      config.colors.accentGlow = '#ffffff40';
      config.colors.ringTrack = '#111111';
      config.colors.ringProgress = '#ffffff';
      config.colors.ticks = '#52525b';
      config.typography.fontFamily = 'mono';
      config.dial.glowIntensity = 'none';
      config.dial.size = 200;
    } else if (lower.includes('золот') || lower.includes('gold') || lower.includes('желт') || lower.includes('янтар')) {
      config.themeName = 'Solar Amber Gold';
      config.colors.bg = '#14110b';
      config.colors.surface = '#221c12';
      config.colors.cardBg = '#221c12';
      config.colors.border = '#4a3b1f';
      config.colors.text = '#fffbeb';
      config.colors.subtext = '#d97706';
      config.colors.accent = '#fbbf24';
      config.colors.accentGlow = '#fbbf2480';
      config.colors.ringTrack = '#2e2515';
      config.colors.ringProgress = '#f59e0b';
      config.colors.ticks = '#fde68a';
      config.dial.glowIntensity = 'high';
    } else if (lower.includes('минимал') || lower.includes('минималист') || lower.includes('чист') || lower.includes('нордик')) {
      config.themeName = 'Nordic Minimal';
      config.colors.bg = '#0f172a';
      config.colors.surface = '#1e293b';
      config.colors.cardBg = '#1e293b';
      config.colors.border = '#334155';
      config.colors.text = '#f8fafc';
      config.colors.subtext = '#94a3b8';
      config.colors.accent = '#38bdf8';
      config.colors.accentGlow = '#38bdf860';
      config.colors.ringTrack = '#1e293b';
      config.colors.ringProgress = '#38bdf8';
      config.colors.ticks = '#cbd5e1';
      config.dial.tickLength = 'short';
      config.dial.glowIntensity = 'subtle';
    } else if (lower.includes('фиолет') || lower.includes('purple') || lower.includes('лаванд')) {
      config.themeName = 'Deep Lavender';
      config.colors.bg = '#110c1c';
      config.colors.surface = '#1e1430';
      config.colors.cardBg = '#1e1430';
      config.colors.border = '#3d2562';
      config.colors.text = '#faf5ff';
      config.colors.subtext = '#c084fc';
      config.colors.accent = '#a855f7';
      config.colors.accentGlow = '#a855f780';
      config.colors.ringTrack = '#261840';
      config.colors.ringProgress = '#c084fc';
      config.colors.ticks = '#e9d5ff';
    } else {
      // Default to Emerald Neon
      config.themeName = 'AI Emerald Glow';
      config.colors.accent = '#10b981';
      config.colors.accentGlow = '#10b98180';
      config.colors.ringProgress = '#10b981';
      config.colors.border = '#1f3d30';
    }

    if (lower.includes('крупн') || lower.includes('больш') || lower.includes('huge')) {
      config.dial.size = 230;
      config.typography.timeScale = 1.25;
    } else if (lower.includes('маленьк') || lower.includes('компакт') || lower.includes('small')) {
      config.dial.size = 180;
      config.typography.timeScale = 0.9;
    }

    if (lower.includes('без засечек') || lower.includes('убери засечки')) {
      config.dial.showTicks = false;
    } else if (lower.includes('длинные засечки')) {
      config.dial.tickLength = 'long';
    }

    return config;
  }
}
