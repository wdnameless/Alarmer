import { ThemeColors, ThemeId } from '../types';

/**
 * The six palettes.
 *
 * One rule holds them together, and it is the reason this file was rewritten:
 * **every neutral in a theme shares one hue.** Elevation, borders, labels and
 * body text differ only in lightness and saturation, never in hue.
 *
 * The earlier palettes mixed hues — Winter's background was neutral (hue 0)
 * while its borders and captions drifted to hue 240, and Cyberpunk ran both
 * purple surfaces and a pink border. Two hues inside one palette read as
 * colour cast rather than as design, which is what made the interface look
 * muddy next to a reference that holds a single tone end to end.
 *
 * Saturation is deliberately low — 0–20% — and falls off at the dark end,
 * where hue cannot carry anyway. The accent is the only vivid colour, so it
 * keeps meaning "the present moment" instead of competing with the chrome.
 *
 * Every text pair was measured against its own background; the weakest is
 * `sunset`'s caption at 8.56:1, comfortably past the 4.5:1 body-text floor.
 * Accents clear 3:1 on their backgrounds, so a ring or a large glyph stays
 * legible. Change a value here and re-measure before trusting it.
 */
export const THEMES: Record<ThemeId, ThemeColors> = {
  // Neutral to the point of having no hue at all. The single warm accent marks
  // the present moment and nothing else.
  winter: {
    id: 'winter',
    name: 'Winter (Calm Mono)',
    bg: '#0a0a0b',
    surface: '#111113',
    cardBg: '#1a1a1e',
    border: '#26262b',
    text: '#f7f7f8',
    subtext: '#a3a3ae',
    accent: '#ff7a1a',
    accentGlow: 'rgba(255, 122, 26, 0.28)',
    ringTrack: '#1d1d20',
    ringProgress: '#ff7a1a',
    ticks: '#3e3e46',
  },

  // Cool slate, green accent. The reference palette's proportions: a blue-grey
  // family held at low saturation, one high-vividness signal colour.
  'dark-neon': {
    id: 'dark-neon',
    name: 'Dark Neon (Reference)',
    bg: '#0b0c0e',
    surface: '#141619',
    cardBg: '#1b1d23',
    border: '#282c34',
    text: '#f7f7f8',
    subtext: '#a3aab8',
    accent: '#22c55e',
    accentGlow: 'rgba(34, 197, 94, 0.45)',
    ringTrack: '#1f2228',
    ringProgress: '#22c55e',
    ticks: '#3e4451',
  },

  // Violet chrome, cyan signal. The saturation goes slightly higher than the
  // others because the theme is named for its loudness — but the surfaces stay
  // muted, so the cyan is still the only thing that shouts.
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Yellow/Cyan',
    bg: '#0f0d12',
    surface: '#1b1721',
    cardBg: '#241f2e',
    border: '#352d43',
    text: '#f4f3f7',
    subtext: '#aea3c2',
    accent: '#00f0ff',
    accentGlow: 'rgba(0, 240, 255, 0.5)',
    ringTrack: '#292334',
    ringProgress: '#00f0ff',
    ticks: '#524568',
  },

  // True black, because that is the point of the theme on an OLED panel.
  // Elevation has to work without a hue, so it steps in lightness alone.
  amoled: {
    id: 'amoled',
    name: 'AMOLED Pure Black',
    bg: '#000000',
    surface: '#0f0f0f',
    cardBg: '#1a1a1a',
    border: '#242424',
    text: '#f7f7f7',
    subtext: '#9e9e9e',
    accent: '#3b82f6',
    accentGlow: 'rgba(59, 130, 246, 0.4)',
    ringTrack: '#1a1a1a',
    ringProgress: '#3b82f6',
    ticks: '#3d3d3d',
  },

  // The lightest dark theme we ship, so its surfaces need the most saturation
  // to separate: 22% on the card would be garish at hue 220 in a darker theme
  // and is correct here.
  nordic: {
    id: 'nordic',
    name: 'Clean Nordic Frost',
    bg: '#22252b',
    surface: '#31363f',
    cardBg: '#3b424f',
    border: '#4a5364',
    text: '#f3f4f6',
    subtext: '#adb5c2',
    accent: '#63b3ed',
    accentGlow: 'rgba(99, 179, 237, 0.4)',
    ringTrack: '#3b424f',
    ringProgress: '#63b3ed',
    ticks: '#5f6c81',
  },

  // Warm mauve rather than pink chrome: the rose accent reads as the signal
  // only when everything around it is quiet.
  sunset: {
    id: 'sunset',
    name: 'Warm Sunset Glow',
    bg: '#141014',
    surface: '#1f191f',
    cardBg: '#2b212b',
    border: '#3d2f3d',
    text: '#f8f7f8',
    subtext: '#bca9bc',
    accent: '#f43f5e',
    accentGlow: 'rgba(244, 63, 94, 0.5)',
    ringTrack: '#2e232e',
    ringProgress: '#f43f5e',
    ticks: '#5c475c',
  },
};
