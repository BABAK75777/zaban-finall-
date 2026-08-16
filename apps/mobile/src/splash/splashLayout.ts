/** Source splash art dimensions (assets/splash.png). */
export const SPLASH_IMAGE_SIZE = {
  width: 576,
  height: 1024,
} as const;

export const SPLASH_BACKGROUND = '#050A30';

/** Max time to keep native splash visible before showing the app anyway. */
export const SPLASH_READY_TIMEOUT_MS = 5000;

export type SplashContainFit = {
  renderedWidth: number;
  renderedHeight: number;
  fitsWithoutCrop: boolean;
  verticalLetterbox: number;
  horizontalLetterbox: number;
  scale: number;
};

/** How `resizeMode: contain` lays out the splash image on a given screen. */
export function computeSplashContainFit(
  screenWidth: number,
  screenHeight: number,
  imageWidth: number = SPLASH_IMAGE_SIZE.width,
  imageHeight: number = SPLASH_IMAGE_SIZE.height
): SplashContainFit {
  const scale = Math.min(screenWidth / imageWidth, screenHeight / imageHeight);
  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;

  return {
    renderedWidth,
    renderedHeight,
    fitsWithoutCrop: renderedWidth <= screenWidth + 0.01 && renderedHeight <= screenHeight + 0.01,
    verticalLetterbox: Math.max(0, (screenHeight - renderedHeight) / 2),
    horizontalLetterbox: Math.max(0, (screenWidth - renderedWidth) / 2),
    scale,
  };
}

/** Common Android phone sizes used for splash layout checks. */
export const SPLASH_TEST_VIEWPORTS = [
  { label: 'small', width: 320, height: 568 },
  { label: 'compact', width: 360, height: 640 },
  { label: 'pixel', width: 393, height: 851 },
  { label: 'large', width: 414, height: 896 },
  { label: 'tall-narrow', width: 360, height: 780 },
  { label: 'wide-short', width: 480, height: 854 },
  { label: 'xl', width: 430, height: 932 },
  { label: 'tablet-portrait', width: 768, height: 1024 },
  { label: 'tablet-landscape', width: 1024, height: 768 },
  { label: 'tablet-wide', width: 1280, height: 800 },
] as const;
