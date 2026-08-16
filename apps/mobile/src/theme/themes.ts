import { DARK_TOKENS } from './darkTokens';
import type { ThemeId, ThemePalette } from './themeTypes';
import { Platform } from 'react-native';

const D = DARK_TOKENS;

/** Playfair Display SemiBold — loaded in app/_layout.tsx */
const sentenceFont = Platform.select({
  ios: 'PlayfairDisplay_600SemiBold',
  android: 'PlayfairDisplay_600SemiBold',
  default: 'PlayfairDisplay_600SemiBold',
}) as string;

/** Inter — loaded in app/_layout.tsx; falls back to system sans-serif if unavailable */
const uiFont = Platform.select({
  ios: 'Inter_400Regular',
  android: 'Inter_400Regular',
  default: 'Inter_400Regular',
}) as string;
const uiFontSemibold = Platform.select({
  ios: 'Inter_600SemiBold',
  android: 'Inter_600SemiBold',
  default: 'Inter_600SemiBold',
}) as string;

/** Calligraphic script for the Shadow control label. */
export const SHADOW_LABEL_FONT = Platform.select({
  ios: 'GreatVibes_400Regular',
  android: 'GreatVibes_400Regular',
  default: 'GreatVibes_400Regular',
}) as string;

/** System fallbacks when custom fonts fail to load */
export const FALLBACK_SENTENCE_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
}) as string;

export const FALLBACK_UI_FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
}) as string;

const darkTheme: ThemePalette = {
  id: 'dark',
  label: 'Dark',
  mood: 'Immersion',
  bg: D.backgroundPrimary,
  surface: D.backgroundSecondary,
  tertiary: D.backgroundTertiary,
  surfaceElevated: D.backgroundTertiary,
  card: 'rgba(42, 51, 68, 0.88)',
  cardOpacity: 0.65,
  text: D.textPrimary,
  textMuted: D.textSecondary,
  textDim: D.textMuted,
  border: D.buttonBorder,
  accent: D.accentPrimary,
  accentGlow: D.accentGlow,
  accentSoft: D.accentSoft,
  shadow: 'rgba(0, 0, 0, 0.55)',
  glow: D.glowSoft,
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.16)',
  success: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  warning: '#FBBF24',
  inputBg: D.backgroundTertiary,
  inputText: D.textPrimary,
  inputPlaceholder: D.textMuted,
  inputBorder: D.buttonBorder,
  adSlotBackground: D.backgroundPrimary,
  statusBar: 'light',
  atmosphere: {
    gradientTop: D.backgroundPrimary,
    gradientMid: D.backgroundSecondary,
    gradientBottom: D.backgroundTertiary,
  },
  glass: {
    bg: 'rgba(21, 27, 40, 0.82)',
    border: D.buttonBorder,
    highlight: 'rgba(255, 255, 255, 0.05)',
    shadow: D.glowSoft,
  },
  waveform: {
    active: D.waveformPrimary,
    inactive: D.waveformDim,
    glow: D.glowPrimary,
  },
  buttons: {
    micBg: D.micBackground,
    micBorder: 'rgba(167, 149, 255, 0.42)',
    micGlow: D.micGlow,
    micText: D.accentPrimary,
    replayBg: D.backgroundTertiary,
    replayBorder: D.buttonBorder,
    replayGlow: D.glowSoft,
    replayText: D.textPrimary,
    navBg: D.navButtonBackground,
    navBorder: '#6B58B0',
    navText: D.textPrimary,
    hearBg: D.navButtonBackground,
    hearBorder: '#6B58B0',
    hearText: D.textSecondary,
    hearGlow: D.navButtonGlow,
  },
  slider: {
    track: 'rgba(255, 255, 255, 0.22)',
    fill: '#8F7FD4',
    thumb: '#8F7FD4',
    border: D.buttonBorder,
  },
  selection: {
    bg: '#6D5B9A',
    border: 'rgba(167, 149, 210, 0.45)',
    text: '#FFFFFF',
  },
  fontFamilySentence: sentenceFont,
  fontFamilyUI: uiFont,
};

const lightTheme: ThemePalette = {
  id: 'light',
  label: 'Light',
  mood: 'Clarity',
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  tertiary: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardOpacity: 0.82,
  text: '#141820',
  textMuted: 'rgba(20, 24, 32, 0.62)',
  textDim: 'rgba(20, 24, 32, 0.42)',
  border: 'rgba(20, 24, 32, 0.1)',
  accent: '#5E4B8B',
  accentGlow: 'rgba(94, 75, 139, 0.22)',
  accentSoft: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.06)',
  glow: 'rgba(94, 75, 139, 0.08)',
  danger: '#FF3B30',
  dangerSoft: 'rgba(255, 59, 48, 0.1)',
  success: '#34C759',
  successSoft: 'rgba(52, 199, 89, 0.1)',
  warning: '#FF9500',
  inputBg: '#FFFFFF',
  inputText: '#141820',
  inputPlaceholder: 'rgba(20, 24, 32, 0.42)',
  inputBorder: 'rgba(20, 24, 32, 0.12)',
  adSlotBackground: '#FFFFFF',
  statusBar: 'dark',
  atmosphere: {
    gradientTop: '#FFFFFF',
    gradientBottom: '#FFFFFF',
  },
  glass: {
    bg: '#FFFFFF',
    border: 'rgba(20, 24, 32, 0.08)',
    highlight: 'rgba(255, 255, 255, 1)',
    shadow: 'rgba(0, 0, 0, 0.06)',
  },
  waveform: {
    active: '#C8C0DC',
    inactive: 'rgba(108, 96, 140, 0.16)',
    glow: 'rgba(108, 96, 140, 0.1)',
  },
  buttons: {
    micBg: '#C4BBE4',
    micBorder: 'rgba(98, 84, 138, 0.22)',
    micGlow: 'rgba(98, 84, 138, 0.14)',
    micText: '#5E4B8B',
    replayBg: '#FFFFFF',
    replayBorder: 'rgba(20, 24, 32, 0.12)',
    replayGlow: 'rgba(20, 24, 32, 0.03)',
    replayText: '#141820',
    navBg: '#FFFFFF',
    navBorder: 'rgba(20, 24, 32, 0.2)',
    navText: '#141820',
    hearBg: '#FFFFFF',
    hearBorder: 'rgba(20, 24, 32, 0.2)',
    hearText: 'rgba(20, 24, 32, 0.62)',
    hearGlow: 'rgba(20, 24, 32, 0.04)',
  },
  slider: {
    track: '#F0F0F0',
    fill: '#A89BC8',
    thumb: '#A89BC8',
    border: 'rgba(20, 24, 32, 0.1)',
  },
  selection: {
    bg: '#A195C8',
    border: 'rgba(98, 84, 138, 0.22)',
    text: '#FFFFFF',
  },
  fontFamilySentence: sentenceFont,
  fontFamilyUI: uiFont,
};

const creamTheme: ThemePalette = {
  id: 'cream',
  label: 'Cream',
  mood: 'Warm',
  bg: '#DFD2B4',
  surface: '#EDE3C8',
  tertiary: '#D4C4A0',
  surfaceElevated: '#F2E9D0',
  card: '#D4C4A0',
  cardOpacity: 0.88,
  text: '#3A3024',
  textMuted: 'rgba(58, 48, 36, 0.68)',
  textDim: 'rgba(58, 48, 36, 0.46)',
  border: 'rgba(58, 48, 36, 0.14)',
  accent: '#9A7340',
  accentGlow: 'rgba(154, 115, 64, 0.24)',
  accentSoft: '#D4C4A0',
  shadow: 'rgba(58, 48, 36, 0.1)',
  glow: 'rgba(154, 115, 64, 0.1)',
  danger: '#B84A3A',
  dangerSoft: 'rgba(184, 74, 58, 0.14)',
  success: '#4F7A5E',
  successSoft: 'rgba(79, 122, 94, 0.12)',
  warning: '#B8860B',
  inputBg: '#F2E9D0',
  inputText: '#3A3024',
  inputPlaceholder: 'rgba(58, 48, 36, 0.46)',
  inputBorder: 'rgba(58, 48, 36, 0.16)',
  adSlotBackground: '#DFD2B4',
  statusBar: 'dark',
  atmosphere: {
    gradientTop: '#DFD2B4',
    gradientBottom: '#C9B896',
  },
  glass: {
    bg: 'rgba(242, 233, 208, 0.9)',
    border: 'rgba(58, 48, 36, 0.12)',
    highlight: 'rgba(255, 248, 232, 0.55)',
    shadow: 'rgba(58, 48, 36, 0.08)',
  },
  waveform: {
    active: '#7A8494',
    inactive: 'rgba(82, 68, 58, 0.18)',
    glow: 'rgba(58, 64, 74, 0.1)',
  },
  buttons: {
    micBg: '#8A94A4',
    micBorder: 'rgba(58, 64, 74, 0.22)',
    micGlow: 'rgba(58, 64, 74, 0.1)',
    micText: '#9A7340',
    replayBg: '#EDE3C8',
    replayBorder: 'rgba(58, 48, 36, 0.12)',
    replayGlow: 'rgba(58, 48, 36, 0.04)',
    replayText: '#3A3024',
    navBg: '#EDE3C8',
    navBorder: 'rgba(58, 48, 36, 0.18)',
    navText: '#3A3024',
    hearBg: '#EDE3C8',
    hearBorder: 'rgba(58, 48, 36, 0.18)',
    hearText: 'rgba(58, 48, 36, 0.68)',
    hearGlow: 'rgba(58, 48, 36, 0.05)',
  },
  slider: {
    track: '#D4C4A0',
    fill: '#B8A06C',
    thumb: '#B8A06C',
    border: 'rgba(58, 48, 36, 0.14)',
  },
  selection: {
    bg: '#5E6878',
    border: 'rgba(58, 64, 74, 0.25)',
    text: '#FFFFFF',
  },
  fontFamilySentence: sentenceFont,
  fontFamilyUI: uiFont,
};

export const THEMES: Record<ThemeId, ThemePalette> = {
  dark: darkTheme,
  light: lightTheme,
  cream: creamTheme,
};

export const DEFAULT_THEME_ID: ThemeId = 'dark';

export function getTheme(id: ThemeId): ThemePalette {
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
}

/** Semibold Inter for button labels and UI emphasis. */
export const UI_FONT_SEMIBOLD = uiFontSemibold;
