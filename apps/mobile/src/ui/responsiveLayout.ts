import { useWindowDimensions } from 'react-native';
import { controlSizes, space } from './spacing';

/** Reference widths used in responsive layout tests. */
export const VIEWPORT_WIDTHS = {
  smallPhone: 320,
  largePhone: 414,
} as const;

const COMPACT_BREAKPOINT = 375;

const WAVE_BAR_WIDTH = 3.5;
const WAVE_BAR_GAP = 3;
const WAVE_MAX_BARS = 28;
const WAVE_MIN_BARS = 12;
const WAVE_HORIZONTAL_PAD = 24;

/** Side nav label + horizontal padding budget (conservative, for fit checks). */
const SIDE_PILL_MIN_ESTIMATE = { compact: 58, regular: 64 } as const;

export type ResponsiveLayoutMetrics = {
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

export function getResponsiveLayoutMetrics(screenWidth: number): ResponsiveLayoutMetrics {
  const compact = screenWidth < COMPACT_BREAKPOINT;
  const heroPadH = compact ? 20 : space.heroPadH;
  const dockPadH = compact ? space.md : space.lg;
  const topBarPadH = compact ? space.lg : space.xl;
  const textInputMarginH = compact ? space.md : space.xl;

  const waveformInner = Math.max(0, screenWidth - heroPadH * 2 - WAVE_HORIZONTAL_PAD);
  const waveformBarCount = Math.min(
    WAVE_MAX_BARS,
    Math.max(
      WAVE_MIN_BARS,
      Math.floor((waveformInner + WAVE_BAR_GAP) / (WAVE_BAR_WIDTH + WAVE_BAR_GAP))
    )
  );

  return {
    compact,
    heroPadH,
    dockPadH,
    topBarPadH,
    textInputMarginH,
    navAiMinWidth: compact ? 72 : 88,
    navLabelFontSize: compact ? 12 : 14,
    navGap: space.sm,
    waveformBarCount,
  };
}

/** True when nav pill row fits within the screen at estimated minimum widths. */
export function navPillsFitScreenWidth(screenWidth: number): boolean {
  const metrics = getResponsiveLayoutMetrics(screenWidth);
  const contentWidth = screenWidth - metrics.dockPadH * 2;
  const sideMin = metrics.compact ? SIDE_PILL_MIN_ESTIMATE.compact : SIDE_PILL_MIN_ESTIMATE.regular;
  const minRowWidth = sideMin * 2 + metrics.navAiMinWidth + metrics.navGap * 2;
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
  const { width } = useWindowDimensions();
  return getResponsiveLayoutMetrics(width);
}

/** Unchanged control heights on large phones; exported for tests. */
export const NAV_CONTROL_HEIGHT = controlSizes.navHeight;
