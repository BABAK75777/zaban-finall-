/**
 * Emotional theme system — types for 3-mode reading themes.
 */

export type ThemeId = 'dark' | 'light' | 'cream';

export interface AtmosphereTokens {
  /** Subtle top / ambient wash */
  gradientTop: string;
  /** Mid horizon hue (dark theme) */
  gradientMid?: string;
  /** Base depth wash */
  gradientBottom: string;
}

export interface GlassTokens {
  bg: string;
  border: string;
  highlight: string;
  shadow: string;
}

export interface WaveformTokens {
  active: string;
  inactive: string;
  glow: string;
}

export interface ButtonTokens {
  micBg: string;
  micBorder: string;
  micGlow: string;
  micText: string;
  replayBg: string;
  replayBorder: string;
  replayGlow: string;
  replayText: string;
  navBg: string;
  navBorder: string;
  navText: string;
  hearBg: string;
  hearBorder: string;
  hearText: string;
  hearGlow: string;
}

export interface ThemePalette {
  id: ThemeId;
  label: string;
  mood: string;

  bg: string;
  surface: string;
  tertiary: string;
  surfaceElevated: string;
  card: string;
  cardOpacity: number;

  text: string;
  textMuted: string;
  textDim: string;

  border: string;
  accent: string;
  accentGlow: string;
  accentSoft: string;

  shadow: string;
  glow: string;

  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;

  inputBg: string;
  inputText: string;
  inputPlaceholder: string;
  inputBorder: string;

  statusBar: 'light' | 'dark';

  atmosphere: AtmosphereTokens;
  glass: GlassTokens;
  waveform: WaveformTokens;
  buttons: ButtonTokens;

  fontFamilySentence: string;
  fontFamilyUI: string;
}

export const THEME_STORAGE_KEY = '@zaban/emotional_theme';

export const THEME_ORDER: ThemeId[] = ['dark', 'light', 'cream'];
