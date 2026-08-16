import { useWindowDimensions } from 'react-native';
import { REFERENCE_SCREEN_WIDTH } from './referenceLayout';
import { controlSizes, space } from './spacing';

/** Reference widths used in layout tests. */
export const VIEWPORT_WIDTHS = {
  smallPhone: 320,
  referencePhone: REFERENCE_SCREEN_WIDTH,
  largePhone: 414,
  tabletPortrait: 768,
  tabletLandscape: 1024,
} as const;

/** Treat as tablet layout at this width and above. */
export const TABLET_MIN_WIDTH = 600;

/** Keep reading UI readable on large screens — centered column. */
export const MAX_CONTENT_WIDTH = 560;

export function isTabletWidth(screenWidth: number): boolean {
  return screenWidth >= TABLET_MIN_WIDTH;
}

export function getContentMaxWidth(screenWidth: number): number {
  return Math.min(Math.max(0, screenWidth), MAX_CONTENT_WIDTH);
}

const WAVE_BAR_WIDTH = 3.5;
const WAVE_BAR_GAP = 3;
const WAVE_MAX_BARS = 28;
const WAVE_MIN_BARS = 12;
const WAVE_HORIZONTAL_PAD = 24;

/** Side nav label + horizontal padding budget (conservative, for fit checks). */
const SIDE_PILL_MIN_ESTIMATE = 64;

/** Fixed reading layout — identical on every phone width. */
const FIXED_LAYOUT = {
  heroPadH: space.heroPadH,
  dockPadH: space.lg,
  topBarPadH: space.xl,
  textInputMarginH: space.xl,
  navAiMinWidth: 88,
  navLabelFontSize: 14,
  navGap: space.sm,
} as const;

const REFERENCE_WAVEFORM_INNER =
  REFERENCE_SCREEN_WIDTH - FIXED_LAYOUT.heroPadH * 2 - WAVE_HORIZONTAL_PAD;

const REFERENCE_WAVEFORM_BAR_COUNT = Math.min(
  WAVE_MAX_BARS,
  Math.max(
    WAVE_MIN_BARS,
    Math.floor(
      (REFERENCE_WAVEFORM_INNER + WAVE_BAR_GAP) / (WAVE_BAR_WIDTH + WAVE_BAR_GAP)
    )
  )
);

export type ResponsiveLayoutMetrics = {
  /** @deprecated Always false — layout no longer switches at narrow widths. */
  compact: boolean;
  heroPadH: number;
  dockPadH: number;
  topBarPadH: number;
  textInputMarginH: number;
  navAiMinWidth: number;
  navLabelFontSize: number;
  navGap: number;
  waveformBarCount: number;
};

export function getResponsiveLayoutMetrics(_screenWidth?: number): ResponsiveLayoutMetrics {
  return {
    compact: false,
    heroPadH: FIXED_LAYOUT.heroPadH,
    dockPadH: FIXED_LAYOUT.dockPadH,
    topBarPadH: FIXED_LAYOUT.topBarPadH,
    textInputMarginH: FIXED_LAYOUT.textInputMarginH,
    navAiMinWidth: FIXED_LAYOUT.navAiMinWidth,
    navLabelFontSize: FIXED_LAYOUT.navLabelFontSize,
    navGap: FIXED_LAYOUT.navGap,
    waveformBarCount: REFERENCE_WAVEFORM_BAR_COUNT,
  };
}

/** True when nav pill row fits within the screen at estimated minimum widths. */
export function navPillsFitScreenWidth(screenWidth: number): boolean {
  const metrics = getResponsiveLayoutMetrics(screenWidth);
  const contentWidth = screenWidth - metrics.dockPadH * 2;
  const minRowWidth =
    SIDE_PILL_MIN_ESTIMATE * 2 + metrics.navAiMinWidth + metrics.navGap * 2;
  return minRowWidth <= contentWidth;
}

/** True when the waveform strip fits inside the hero horizontal padding. */
export function waveformFitsScreenWidth(screenWidth: number): boolean {
  const metrics = getResponsiveLayoutMetrics(screenWidth);
  const innerWidth = screenWidth - metrics.heroPadH * 2 - WAVE_HORIZONTAL_PAD;
  const waveformWidth =
    metrics.waveformBarCount * WAVE_BAR_WIDTH +
    (metrics.waveformBarCount - 1) * WAVE_BAR_GAP;
  return waveformWidth <= innerWidth;
}

/** Dock + nav controls fit without clipping on narrow screens. */
export function controlsDockFitsScreenWidth(screenWidth: number): boolean {
  return navPillsFitScreenWidth(screenWidth);
}

export function useResponsiveLayoutMetrics(): ResponsiveLayoutMetrics {
  // Re-render on rotation; metrics stay on the reference handset scale.
  useWindowDimensions();
  return getResponsiveLayoutMetrics();
}

/** Unchanged control heights; exported for tests. */
export const NAV_CONTROL_HEIGHT = controlSizes.navHeight;
