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
  };
}

export const DEFAULT_DYNAMIC_UI: DynamicUIConfig = {
  themeName: 'Dark Neon AI',
  colors: {
    bg: '#121418',
    surface: '#1c1f26',
    cardBg: '#1c1f26',
    border: '#2a2f3d',
    text: '#ffffff',
    subtext: '#9ca3af',
    accent: '#00e676',
    accentGlow: '#00e67680',
    ringTrack: '#1e232d',
    ringProgress: '#00e676',
    ticks: '#ffffff',
  },
  typography: {
    fontFamily: 'system-ui',
    timeScale: 1.0,
  },
  dial: {
    size: 180,
    showTicks: true,
    tickLength: 'normal',
    glowIntensity: 'subtle',
    stylePreset: 'neon',
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
