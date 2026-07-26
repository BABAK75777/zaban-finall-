import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  isStaleTtsResponse,
  recoverFromTtsFailure,
  shouldRetryTtsFailure,
} from '../apps/mobile/src/tts/ttsRequestLifecycle';
import {
  fetchWithTimeout,
  RequestTimeoutError,
} from '../apps/mobile/src/utils/fetchWithTimeout';

describe('TTS hang safety', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('ends loading and restores control after failure', () => {
    const recovery = recoverFromTtsFailure();
    expect(recovery.loading).toBe(false);
    expect(recovery.buttonsEnabled).toBe(true);
    expect(recovery.canRetry).toBe(true);
    expect(recovery.preserveText).toBe(true);
    expect(recovery.preserveLanguage).toBe(true);
    expect(recovery.preserveGender).toBe(true);
  });

  it('ignores stale responses after gender/language change', () => {
    let activeToken = 1;
    const oldToken = activeToken;
    activeToken += 1;
    expect(isStaleTtsResponse(activeToken, oldToken)).toBe(true);
    expect(isStaleTtsResponse(activeToken, activeToken)).toBe(false);
  });

  it('does not auto-retry timeout or invalid voice errors', () => {
    expect(shouldRetryTtsFailure('timeout')).toBe(false);
    expect(shouldRetryTtsFailure('invalid_voice')).toBe(false);
    expect(shouldRetryTtsFailure('provider')).toBe(false);
    expect(shouldRetryTtsFailure('network')).toBe(true);
  });

  it('fetchWithTimeout aborts and throws RequestTimeoutError (no hang)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal;
            if (!signal) return;
            signal.addEventListener('abort', () => {
              const err = new Error('Aborted');
              err.name = 'AbortError';
              reject(err);
            });
          })
      )
    );

    await expect(
      fetchWithTimeout('https://example.test/tts', { method: 'POST' }, 30, 'tts')
    ).rejects.toBeInstanceOf(RequestTimeoutError);
  });
});
