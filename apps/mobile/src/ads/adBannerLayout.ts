/** Anchored adaptive banner in the footer — not inline adaptive. */
export const AD_BANNER_TYPE = 'anchoredAdaptive' as const;

/** Safe initial min height for anchored adaptive before SDK reports exact height. */
export const AD_BANNER_SLOT_HEIGHT = 50;
export const BANNER_RESERVED_HEIGHT_DP = AD_BANNER_SLOT_HEIGHT;

/** Optional fade above the slot on themed screens (e.g. Home). */
export const AD_BANNER_BLEND_HEIGHT = 18;

/** Minimum dead zone between controls and the ad footer. */
export const AD_SAFE_GAP_DP = 12;

/** Minimum tappable control size (layout reference). */
export const MIN_TOUCH_TARGET_DP = 48;

/** Extra padding below the banner slot inside the screen safe area. */
export const BOTTOM_SAFE_PADDING_DP = 8;

/**
 * Minimum vertical gap between the bottom of tappable controls and the ad slot.
 * Prevents accidental taps on the banner when using AI / Shadow / Back / Next.
 */
export const AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS = 20;

export type AdBannerLayoutOptions = {
  /** @deprecated Safe area is handled by the screen SafeAreaView, not the ad slot. */
  bottomInset?: number;
  includeBlend?: boolean;
};

/**
 * Total vertical space reserved for the ad footer.
 * Height is device-independent; bottom safe area is applied by the parent screen.
 */
export function getAdBannerReservedHeight({
  includeBlend = false,
}: AdBannerLayoutOptions = {}): number {
  const blend = includeBlend ? AD_BANNER_BLEND_HEIGHT : 0;
  return blend + AD_BANNER_SLOT_HEIGHT;
}

/** Single source of truth for footer reserved height. */
export function getResolvedBannerReservedHeight(
  options: AdBannerLayoutOptions = {}
): number {
  return getAdBannerReservedHeight(options);
}
