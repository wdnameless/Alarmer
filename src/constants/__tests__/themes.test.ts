import { describe, expect, it } from 'vitest';
import { THEMES } from '../themes';
import type { ThemeColors } from '../../types';

/**
 * The palettes are a system, not six lists of colours.
 *
 * The defect these guard against: Winter's background was neutral (hue 0) while
 * its borders and captions sat at hue 240, and Cyberpunk mixed purple surfaces
 * with a pink border. Two hues inside one palette read as a colour cast rather
 * than as design — the interface looks muddy beside anything disciplined.
 */

/** HSL hue of a hex or rgba colour, 0–360. */
function hueOf(value: string): number {
  let r: number;
  let g: number;
  let b: number;

  if (value.startsWith('rgba') || value.startsWith('rgb')) {
    const parts = value.match(/[\d.]+/g) ?? [];
    [r, g, b] = [Number(parts[0]) / 255, Number(parts[1]) / 255, Number(parts[2]) / 255];
  } else {
    r = parseInt(value.slice(1, 3), 16) / 255;
    g = parseInt(value.slice(3, 5), 16) / 255;
    b = parseInt(value.slice(5, 7), 16) / 255;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  // Achromatic in practice, not just in theory: below ~5% chroma, 8-bit colour
  // has no room for hue. Near-white text lands here — #f7f7f8 computes as hue
  // 240 but differs from pure grey by 1/255, which no display resolves.
  if (d / (max + min || 1) < 0.05) return -1;

  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;

  return ((h * 60) % 360 + 360) % 360;
}

/**
 * Chroma as a fraction of the maximum for this lightness, 0–1.
 *
 * Below `VISIBLE_HUE` a colour is grey to the eye whatever its hue computes to:
 * `#a1a1aa` reports hue 240 but differs from pure grey by 3/255.
 */
function chromaOf(value: string): number {
  let r: number;
  let g: number;
  let b: number;
  if (value.startsWith('rgba') || value.startsWith('rgb')) {
    const nums = value.match(/[\d.]+/g) ?? [];
    [r, g, b] = [Number(nums[0]) / 255, Number(nums[1]) / 255, Number(nums[2]) / 255];
  } else {
    r = parseInt(value.slice(1, 3), 16) / 255;
    g = parseInt(value.slice(3, 5), 16) / 255;
    b = parseInt(value.slice(5, 7), 16) / 255;
  }
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) / (max + min || 1);
}

/** Below this, an 8-bit colour cannot show its hue on any display. */
const VISIBLE_HUE = 0.05;

/** Saturation as a percentage. */
function saturationOf(value: string): number {
  const nums = value.match(/[\d.]+/g) ?? [];
  let r: number;
  let g: number;
  let b: number;
  if (value.startsWith('rgba') || value.startsWith('rgb')) {
    [r, g, b] = [Number(nums[0]) / 255, Number(nums[1]) / 255, Number(nums[2]) / 255];
  } else {
    r = parseInt(value.slice(1, 3), 16) / 255;
    g = parseInt(value.slice(3, 5), 16) / 255;
    b = parseInt(value.slice(5, 7), 16) / 255;
  }
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  return ((max - min) / (1 - Math.abs(2 * l - 1))) * 100;
}

/** Relative luminance, for the contrast check. */
function luminance(value: string): number {
  let r: number;
  let g: number;
  let b: number;
  if (value.startsWith('rgba') || value.startsWith('rgb')) {
    const nums = value.match(/[\d.]+/g) ?? [];
    [r, g, b] = [Number(nums[0]) / 255, Number(nums[1]) / 255, Number(nums[2]) / 255];
  } else {
    r = parseInt(value.slice(1, 3), 16) / 255;
    g = parseInt(value.slice(3, 5), 16) / 255;
    b = parseInt(value.slice(5, 7), 16) / 255;
  }
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Hues within this many degrees are the same colour to the eye. */
const SAME_HUE = 15;

const themes = Object.entries(THEMES) as Array<[string, ThemeColors]>;

/** The tokens that must share one hue. The accent is deliberately excluded. */
const NEUTRAL_TOKENS: Array<keyof ThemeColors> = [
  'bg',
  'surface',
  'cardBg',
  'border',
  'text',
  'subtext',
  'ringTrack',
  'ticks',
];

describe('theme palettes', () => {
  it.each(themes)('%s holds a single hue across its neutrals', (name, theme) => {
    // Only colours with enough chroma to show a hue can conflict. A near-grey
    // and a near-white carry no perceptible hue, so excluding them is correct
    // rather than a loophole — flagging them would be flagging 3/255 of colour.
    const hued = NEUTRAL_TOKENS.map((token) => theme[token] as string)
      .filter((value) => chromaOf(value) >= VISIBLE_HUE)
      .map((value) => hueOf(value));

    if (hued.length < 2) return; // a fully achromatic palette cannot conflict

    const raw = Math.max(...hued) - Math.min(...hued);
    // Hue wraps at 360, so 350° and 5° are neighbours.
    const spread = Math.min(raw, 360 - raw);
    expect(
      spread,
      `${name} spans ${spread.toFixed(0)}° of hue across its neutrals (${hued.map((h) => h.toFixed(0)).join(', ')}); the eye reads more than ${SAME_HUE}° as a different colour`,
    ).toBeLessThanOrEqual(SAME_HUE);
  });

  it.each(themes)('%s keeps its border quiet enough to read as a hairline', (name, theme) => {
    // Cyberpunk shipped a fully saturated pink border (#ff0055, 100%). A border
    // is chrome: at that vividness it competes with the accent, so the accent
    // stops meaning "the present moment" and every card looks outlined in red.
    const sat = saturationOf(theme.border);
    expect(sat, `${name}.border is ${sat.toFixed(0)}% saturated`).toBeLessThanOrEqual(30);
  });

  it.each(themes)('%s keeps its surfaces muted', (name, theme) => {
    // The accent is the only vivid colour; a loud surface competes with it and
    // the accent stops meaning anything.
    for (const token of ['bg', 'surface', 'cardBg', 'border'] as const) {
      const sat = saturationOf(theme[token] as string);
      expect(sat, `${name}.${token} is ${sat.toFixed(0)}% saturated`).toBeLessThanOrEqual(22);
    }
  });

  it.each(themes)('%s keeps body text and captions legible', (name, theme) => {
    expect(contrast(theme.text, theme.bg), `${name} body text`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.subtext, theme.bg), `${name} caption`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(themes)('%s keeps text legible on the card it renders in', (name, theme) => {
    // Measured against cardBg, not bg: most text in this app sits inside a card,
    // and a card is lighter than the page, so it is the harder pair.
    expect(contrast(theme.text, theme.cardBg), `${name} body text on card`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.subtext, theme.cardBg), `${name} caption on card`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(themes)('%s keeps its accent visible on its own background', (name, theme) => {
    // A ring, a large glyph or a focus outline: past 3:1 it stays readable even
    // when it is not body text.
    expect(contrast(theme.accent, theme.bg), `${name} accent`).toBeGreaterThanOrEqual(3);
  });

  it.each(themes)('%s steps its surfaces in lightness', (name, theme) => {
    // Elevation has to be readable as depth. Equal lightness on two surfaces is
    // a flat card, which is how a layout starts looking muddy.
    const levels = [theme.bg, theme.surface, theme.cardBg].map(luminance);
    expect(levels[1], `${name}: surface is not lighter than bg`).toBeGreaterThan(levels[0]);
    expect(levels[2], `${name}: cardBg is not lighter than surface`).toBeGreaterThan(levels[1]);

    // Cards carry no border now, so elevation alone has to separate them from
    // the page. Below ~1.08 the step reads as one flat surface.
    expect(contrast(theme.cardBg, theme.bg), `${name}: card does not lift off the page`).toBeGreaterThanOrEqual(1.08);
  });

  it('names every theme and keeps ids consistent with their keys', () => {
    for (const [key, theme] of themes) {
      expect(theme.id).toBe(key);
      expect(theme.name.length).toBeGreaterThan(0);
    }
  });
});
