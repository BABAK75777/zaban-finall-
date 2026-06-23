import { describe, expect, it } from 'vitest';
import {
  VIEWPORT_WIDTHS,
  controlsDockFitsScreenWidth,
  getResponsiveLayoutMetrics,
  navPillsFitScreenWidth,
  waveformFitsScreenWidth,
} from '../apps/mobile/src/ui/responsiveLayout';

describe('responsive layout metrics', () => {
  it('uses compact spacing on a 320px-wide phone', () => {
    const metrics = getResponsiveLayoutMetrics(VIEWPORT_WIDTHS.smallPhone);
    expect(metrics.compact).toBe(true);
    expect(metrics.heroPadH).toBe(20);
    expect(metrics.dockPadH).toBe(12);
    expect(metrics.navAiMinWidth).toBe(72);
    expect(metrics.navLabelFontSize).toBe(12);
  });

  it('keeps the large-phone layout unchanged at 414px', () => {
    const metrics = getResponsiveLayoutMetrics(VIEWPORT_WIDTHS.largePhone);
    expect(metrics.compact).toBe(false);
    expect(metrics.heroPadH).toBe(32);
    expect(metrics.dockPadH).toBe(16);
    expect(metrics.navAiMinWidth).toBe(88);
    expect(metrics.navLabelFontSize).toBe(14);
    expect(metrics.waveformBarCount).toBe(28);
  });

  it('computes a smaller waveform on very narrow screens', () => {
    const veryNarrow = getResponsiveLayoutMetrics(240);
    const wide = getResponsiveLayoutMetrics(VIEWPORT_WIDTHS.largePhone);
    expect(veryNarrow.waveformBarCount).toBeLessThan(wide.waveformBarCount);
    expect(waveformFitsScreenWidth(240)).toBe(true);
  });
});

describe('responsive layout fit checks', () => {
  for (const width of [VIEWPORT_WIDTHS.smallPhone, VIEWPORT_WIDTHS.largePhone]) {
    it(`nav pills fit at ${width}px`, () => {
      expect(navPillsFitScreenWidth(width)).toBe(true);
    });

    it(`waveform fits at ${width}px`, () => {
      expect(waveformFitsScreenWidth(width)).toBe(true);
    });

    it(`controls dock fits at ${width}px`, () => {
      expect(controlsDockFitsScreenWidth(width)).toBe(true);
    });
  }
});
