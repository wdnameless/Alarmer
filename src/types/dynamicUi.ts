export interface DynamicUIConfig {
  themeName: string;
  colors: {
    bg: string;
    surface: string;
    cardBg: string;
    border: string;
    text: string;
    subtext: string;
    accent: string;
    accentGlow: string;
    ringTrack: string;
    ringProgress: string;
    ticks: string;
  };
  typography: {
    fontFamily: string; // 'system-ui' | 'mono' | 'cyber' | 'serif'
    timeScale: number; // 0.8 to 1.4
  };
  dial: {
    size: number; // 180 to 280
    showTicks: boolean;
    tickLength: 'short' | 'normal' | 'long';
    glowIntensity: 'none' | 'subtle' | 'high';
    stylePreset?: 'neon' | 'vintage' | 'chronograph' | 'minimal';
  };
  layout: {
    showPresetButtons: boolean;
    showSubtimer: boolean;
    buttonStyle: 'rounded' | 'square' | 'pill';
    glassmorphism: boolean;
    contentAlignment: 'center' | 'top' | 'compact';
    widgetsOrder: Array<'dial' | 'subtimer' | 'presets' | 'controls' | 'alarmsPreview'>;
    showSleepButton?: boolean;
    showAiScheduleButton?: boolean;
    showCurrentTimeBadge?: boolean;
  };
}

export const DEFAULT_DYNAMIC_UI: DynamicUIConfig = {
  themeName: 'Winter',
  colors: {
    bg: '#050505',
    surface: '#0a0a0a',
    cardBg: '#0f0f0f',
    border: '#27272a',
    text: '#fafafa',
    subtext: '#a1a1aa',
    accent: '#ff7a1a',
    accentGlow: 'rgba(255, 122, 26, 0.28)',
    ringTrack: '#1c1c1f',
    ringProgress: '#ff7a1a',
    ticks: '#3f3f46',
  },
  typography: {
    fontFamily: 'sans',
    timeScale: 1.0,
  },
  dial: {
    size: 180,
    showTicks: true,
    tickLength: 'normal',
    glowIntensity: 'none',
    stylePreset: 'minimal',
  },
  layout: {
    showPresetButtons: true,
    showSubtimer: true,
    buttonStyle: 'rounded',
    glassmorphism: true,
    contentAlignment: 'center',
    widgetsOrder: ['dial', 'subtimer', 'presets', 'controls'],
  },
};
