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
  card: 'rgba(44, 44, 46, 0.88)',
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
  statusBar: 'light',
  atmosphere: {
    gradientTop: D.backgroundPrimary,
    gradientMid: D.backgroundSecondary,
    gradientBottom: D.backgroundTertiary,
  },
  glass: {
    bg: 'rgba(28, 28, 30, 0.82)',
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
  surface: '#F8F7FC',
  tertiary: '#EFE9FF',
  surfaceElevated: '#FFFFFF',
  card: '#F8F7FC',
  cardOpacity: 0.82,
  text: '#17151F',
  textMuted: 'rgba(23, 21, 31, 0.62)',
  textDim: 'rgba(23, 21, 31, 0.42)',
  border: 'rgba(23, 21, 31, 0.1)',
  accent: '#5E4B8B',
  accentGlow: 'rgba(94, 75, 139, 0.22)',
  accentSoft: '#EFE9FF',
  shadow: 'rgba(0, 0, 0, 0.06)',
  glow: 'rgba(94, 75, 139, 0.08)',
  danger: '#FF3B30',
  dangerSoft: 'rgba(255, 59, 48, 0.1)',
  success: '#34C759',
  successSoft: 'rgba(52, 199, 89, 0.1)',
  warning: '#FF9500',
  inputBg: '#FFFFFF',
  inputText: '#17151F',
  inputPlaceholder: 'rgba(23, 21, 31, 0.42)',
  inputBorder: 'rgba(23, 21, 31, 0.12)',
  statusBar: 'dark',
  atmosphere: {
    gradientTop: '#FFFFFF',
    gradientBottom: '#F8F7FC',
  },
  glass: {
    bg: 'rgba(248, 247, 252, 0.92)',
    border: 'rgba(23, 21, 31, 0.08)',
    highlight: 'rgba(255, 255, 255, 1)',
    shadow: 'rgba(0, 0, 0, 0.06)',
  },
  waveform: {
    active: '#B5A6E8',
    inactive: 'rgba(181, 166, 232, 0.3)',
    glow: 'rgba(181, 166, 232, 0.2)',
  },
  buttons: {
    micBg: '#B8ABF2',
    micBorder: 'rgba(94, 75, 139, 0.28)',
    micGlow: 'rgba(167, 149, 255, 0.42)',
    micText: '#5E4B8B',
    replayBg: '#F8F7FC',
    replayBorder: 'rgba(23, 21, 31, 0.1)',
    replayGlow: 'rgba(23, 21, 31, 0.04)',
    replayText: '#17151F',
    navBg: '#F8F7FC',
    navBorder: '#7A65C4',
    navText: '#17151F',
    hearBg: '#F8F7FC',
    hearBorder: '#7A65C4',
    hearText: 'rgba(23, 21, 31, 0.62)',
    hearGlow: 'rgba(94, 75, 139, 0.06)',
  },
  slider: {
    track: '#F7F3FF',
    fill: '#8F7FD4',
    thumb: '#8F7FD4',
    border: 'rgba(23, 21, 31, 0.1)',
  },
  selection: {
    bg: '#8F7FD4',
    border: 'rgba(94, 75, 139, 0.28)',
    text: '#FFFFFF',
  },
  fontFamilySentence: sentenceFont,
  fontFamilyUI: uiFont,
};

const creamTheme: ThemePalette = {
  id: 'cream',
  label: 'Cream',
  mood: 'Warm',
  bg: '#F7F3EB',
  surface: '#FFFDF8',
  tertiary: '#EFE9DD',
  surfaceElevated: '#FFFDF8',
  card: '#EFE9DD',
  cardOpacity: 0.88,
  text: '#2E2A24',
  textMuted: 'rgba(46, 42, 36, 0.62)',
  textDim: 'rgba(46, 42, 36, 0.42)',
  border: 'rgba(46, 42, 36, 0.12)',
  accent: '#B08D57',
  accentGlow: 'rgba(176, 141, 87, 0.22)',
  accentSoft: '#EFE9DD',
  shadow: 'rgba(46, 42, 36, 0.08)',
  glow: 'rgba(176, 141, 87, 0.08)',
  danger: '#C45C4A',
  dangerSoft: 'rgba(196, 92, 74, 0.12)',
  success: '#5A8F6E',
  successSoft: 'rgba(90, 143, 110, 0.1)',
  warning: '#B08D57',
  inputBg: '#FFFDF8',
  inputText: '#2E2A24',
  inputPlaceholder: 'rgba(46, 42, 36, 0.42)',
  inputBorder: 'rgba(46, 42, 36, 0.14)',
  statusBar: 'dark',
  atmosphere: {
    gradientTop: '#F7F3EB',
    gradientBottom: '#FFFDF8',
  },
  glass: {
    bg: 'rgba(255, 253, 248, 0.9)',
    border: 'rgba(46, 42, 36, 0.1)',
    highlight: 'rgba(255, 255, 255, 0.65)',
    shadow: 'rgba(46, 42, 36, 0.06)',
  },
  waveform: {
    active: '#B5A6E8',
    inactive: 'rgba(181, 166, 232, 0.28)',
    glow: 'rgba(181, 166, 232, 0.16)',
  },
  buttons: {
    micBg: '#B8ABF2',
    micBorder: 'rgba(94, 75, 139, 0.26)',
    micGlow: 'rgba(167, 149, 255, 0.38)',
    micText: '#B08D57',
    replayBg: '#EFE9DD',
    replayBorder: 'rgba(46, 42, 36, 0.12)',
    replayGlow: 'rgba(46, 42, 36, 0.04)',
    replayText: '#2E2A24',
    navBg: '#FFFDF8',
    navBorder: '#7A65C4',
    navText: '#2E2A24',
    hearBg: '#FFFDF8',
    hearBorder: '#7A65C4',
    hearText: 'rgba(46, 42, 36, 0.62)',
    hearGlow: 'rgba(176, 141, 87, 0.06)',
  },
  slider: {
    track: '#F7F3EB',
    fill: '#9B8BC8',
    thumb: '#9B8BC8',
    border: 'rgba(46, 42, 36, 0.12)',
  },
  selection: {
    bg: '#9B8BC8',
    border: 'rgba(94, 75, 139, 0.24)',
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
