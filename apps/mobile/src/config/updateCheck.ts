import { DEFAULT_PLAY_STORE_URL } from '../update/types';

/** Remote JSON endpoint for soft-update metadata. */
export function resolveUpdateCheckUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_UPDATE_CHECK_URL?.trim();
  return configured || null;
}

export function resolveFallbackUpdateUrl(): string {
  const configured = process.env.EXPO_PUBLIC_UPDATE_FALLBACK_URL?.trim();
  return configured || DEFAULT_PLAY_STORE_URL;
}
