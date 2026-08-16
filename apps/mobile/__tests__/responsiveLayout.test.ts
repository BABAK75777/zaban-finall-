import {
  getResponsiveLayoutMetrics,
  VIEWPORT_WIDTHS,
} from '../src/ui/responsiveLayout';
import { REFERENCE_SCREEN_WIDTH } from '../src/ui/referenceLayout';

describe('responsiveLayout', () => {
  it('returns identical metrics on narrow, reference, and large phones', () => {
    const narrow = getResponsiveLayoutMetrics(VIEWPORT_WIDTHS.smallPhone);
    const reference = getResponsiveLayoutMetrics(VIEWPORT_WIDTHS.referencePhone);
    const large = getResponsiveLayoutMetrics(VIEWPORT_WIDTHS.largePhone);

    expect(narrow).toEqual(reference);
    expect(large).toEqual(reference);
    expect(reference.compact).toBe(false);
    expect(reference.heroPadH).toBe(32);
    expect(reference.dockPadH).toBe(16);
    expect(reference.navAiMinWidth).toBe(88);
    expect(reference.navLabelFontSize).toBe(14);
  });

  it('anchors waveform density to the reference handset width', () => {
    const metrics = getResponsiveLayoutMetrics(REFERENCE_SCREEN_WIDTH);
    expect(metrics.waveformBarCount).toBe(28);
  });
});
