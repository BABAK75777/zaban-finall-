import { resolveFallbackUpdateUrl, resolveUpdateCheckUrl } from '../config/updateCheck';
import type { ResolvedUpdatePrompt, UpdateConfigResponse } from './types';
import { DEFAULT_UPDATE_MESSAGE } from './types';

const FETCH_TIMEOUT_MS = 12_000;

function isValidUpdateResponse(data: unknown): data is UpdateConfigResponse {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  return typeof record.latestVersion === 'string' && record.latestVersion.trim().length > 0;
}

export async function fetchUpdateConfig(signal?: AbortSignal): Promise<ResolvedUpdatePrompt | null> {
  const url = resolveUpdateCheckUrl();
  if (!url) {
    console.log('[UPDATE_CHECK] failed reason=no EXPO_PUBLIC_UPDATE_CHECK_URL configured');
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.log(`[UPDATE_CHECK] failed reason=http_${response.status}`);
      return null;
    }

    const data: unknown = await response.json();
    if (!isValidUpdateResponse(data)) {
      console.log('[UPDATE_CHECK] failed reason=invalid_response');
      return null;
    }

    const updateUrl =
      typeof data.updateUrl === 'string' && data.updateUrl.trim()
        ? data.updateUrl.trim()
        : resolveFallbackUpdateUrl();

    const message =
      typeof data.message === 'string' && data.message.trim()
        ? data.message.trim()
        : DEFAULT_UPDATE_MESSAGE;

    return {
      latestVersion: data.latestVersion.trim(),
      updateUrl,
      message,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    console.log(`[UPDATE_CHECK] failed reason=${reason}`);
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}
