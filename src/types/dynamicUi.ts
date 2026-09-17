export interface DynamicUIConfig {
  /**
   * Colour *overrides* layered over the user's chosen base theme, not a palette
   * of its own.
   *
   * Every field is optional and empty by default, and empty means "use the
   * theme". Shipping a full palette here is what made all six theme buttons
   * dead: the values spread over the theme at render time and won every time.
   */
  colors: {
    bg?: string;
    surface?: string;
    cardBg?: string;
    border?: string;
    text?: string;
    subtext?: string;
    accent?: string;
    accentGlow?: string;
    ringTrack?: string;
    ringProgress?: string;
    ticks?: string;
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
    contentAlignment: 'center' | 'top' | 'compact';
    showSleepButton?: boolean;
    showAiScheduleButton?: boolean;
    showCurrentTimeBadge?: boolean;
  };
}

export const DEFAULT_DYNAMIC_UI: DynamicUIConfig = {
  // Empty on purpose: the base theme supplies the palette, and anything set here
  // would silently override every theme the user picks.
  colors: {},
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
    contentAlignment: 'center',
  },
};
