import Constants from 'expo-constants';

import { BRANDING } from './branding';

/** Fallback when bundled version metadata is unavailable (tests). */
export const APP_VERSION_FALLBACK = '1.3.3';

/** Release version from package.json — synced with app.json and android versionName. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PACKAGE_VERSION = require('../../package.json').version as string;

/**
 * Resolve semver used for About display.
 * Prefer package.json over embedded expo manifest (native assets can lag after renames).
 */
export function resolveAppVersionString(): string {
  if (typeof PACKAGE_VERSION === 'string' && PACKAGE_VERSION.trim()) {
    return PACKAGE_VERSION.trim();
  }
  return Constants.expoConfig?.version ?? APP_VERSION_FALLBACK;
}

/**
 * User-facing About label — "Mamlio v{semver}" (e.g. Mamlio v1.2.1).
 */
export function getAppVersionLabel(version: string = resolveAppVersionString()): string {
  const normalized = version.trim();
  return `${BRANDING.appName} v${normalized}`;
}

export function logAppVersionLoaded(label: string): void {
  console.log(`[SETTINGS] appVersion=${label}`);
}
