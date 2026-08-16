import {
  AD_BANNER_BLEND_HEIGHT,
  AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS,
  AD_BANNER_SLOT_HEIGHT,
  AD_SAFE_GAP_DP,
  BOTTOM_SAFE_PADDING_DP,
  getAdBannerReservedHeight,
  getResolvedBannerReservedHeight,
} from '../src/ads/adBannerLayout';

describe('adBannerLayout', () => {
  it('reserves fixed slot height without safe area inset', () => {
    expect(getAdBannerReservedHeight()).toBe(AD_BANNER_SLOT_HEIGHT);
    expect(getResolvedBannerReservedHeight()).toBe(AD_BANNER_SLOT_HEIGHT);
    expect(getAdBannerReservedHeight({ bottomInset: 34 })).toBe(AD_BANNER_SLOT_HEIGHT);
  });

  it('adds blend height when requested', () => {
    expect(getAdBannerReservedHeight({ includeBlend: true })).toBe(
      AD_BANNER_SLOT_HEIGHT + AD_BANNER_BLEND_HEIGHT
    );
  });

  it('defines a safe distance between controls and the banner', () => {
    expect(AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS).toBeGreaterThanOrEqual(16);
    expect(AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS).toBeLessThanOrEqual(32);
    expect(AD_SAFE_GAP_DP).toBeGreaterThanOrEqual(12);
    expect(BOTTOM_SAFE_PADDING_DP).toBe(8);
  });
});
