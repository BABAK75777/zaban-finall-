import { beforeEach, describe, it, expect } from 'vitest';
import { OperationGuard } from '../packages/tts-mobile/src/operationGuard';
import {
  pruneSentenceCacheToKeepIds,
  putCachedSentenceAudio,
  getCachedSentenceAudio,
  isSentenceGenerated,
} from '../packages/tts-mobile/src/sentenceAudioCache';
import { allowNetworkForSource } from '../packages/tts-mobile/src/cacheFirstPolicy';
import { asyncStore } from './mocks/async-storage';
import { deletedPaths } from './mocks/expo-file-system';
import { THEMES, getTheme } from '../apps/mobile/src/theme/themes';
import { THEME_ORDER } from '../apps/mobile/src/theme/themeTypes';

/** Mirrors post-shadow AI follow-up in apps/mobile/app/index.tsx */
function shouldPlayAiAfterShadow(cachedPath: string | null): boolean {
  return cachedPath != null;
}

/** Mirrors allowNetworkForPlay in apps/mobile/app/index.tsx */
function allowNetworkForPlay(
  source: 'hear' | 'replay' | 'nav',
  cachedPath: string | null,
  sentenceGenerated: boolean
): boolean {
  if (source === 'replay') {
    return false;
  }
  return allowNetworkForSource(source, cachedPath, sentenceGenerated);
}

describe('post-shadow AI follow-up', () => {
  it('replays cached AI only when cache exists', () => {
    expect(shouldPlayAiAfterShadow('/cache/s1.mp3')).toBe(true);
    expect(shouldPlayAiAfterShadow(null)).toBe(false);
  });

  it('post-shadow uses replay path (no network)', () => {
    expect(allowNetworkForPlay('replay', '/cache/s1.mp3', true)).toBe(false);
    expect(allowNetworkForPlay('replay', null, false)).toBe(false);
  });

  it('first hear fetches once; second hear uses cache', () => {
    expect(allowNetworkForPlay('hear', null, false)).toBe(true);
    expect(allowNetworkForPlay('hear', '/cache/s1.mp3', true)).toBe(false);
  });
});

describe('pruneSentenceCacheToKeepIds (text change)', () => {
  beforeEach(() => {
    asyncStore.clear();
    deletedPaths.length = 0;
  });

  it('removes stale sentence audio when text changes', async () => {
    await putCachedSentenceAudio('old-a', 'h1', new Uint8Array([1]));
    await putCachedSentenceAudio('old-b', 'h2', new Uint8Array([2]));
    expect(await isSentenceGenerated('old-a')).toBe(true);
    expect(await isSentenceGenerated('old-b')).toBe(true);

    const pruned = await pruneSentenceCacheToKeepIds(['new-x']);
    expect(pruned).toBe(2);
    expect(await getCachedSentenceAudio('old-a')).toBeNull();
    expect(await getCachedSentenceAudio('old-b')).toBeNull();
    expect(await isSentenceGenerated('old-a')).toBe(false);
    expect(await isSentenceGenerated('old-b')).toBe(false);
  });

  it('keeps active sentence IDs intact', async () => {
    await putCachedSentenceAudio('keep-1', 'h1', new Uint8Array([1]));
    await putCachedSentenceAudio('drop-1', 'h2', new Uint8Array([2]));

    const pruned = await pruneSentenceCacheToKeepIds(['keep-1']);
    expect(pruned).toBe(1);
    expect(await getCachedSentenceAudio('keep-1')).not.toBeNull();
    expect(await getCachedSentenceAudio('drop-1')).toBeNull();
  });
});

describe('OperationGuard rapid button presses', () => {
  it('rejects overlapping ai_playback and recording', () => {
    const guard = new OperationGuard();
    const playToken = guard.tryAcquire('ai_playback');
    expect(playToken).toBe(1);

    const recordToken = guard.tryAcquire('recording');
    expect(recordToken).toBeNull();
    expect(guard.getActive()).toBe('ai_playback');

    guard.release(1, 'ai_playback');
    const recordAfter = guard.tryAcquire('recording');
    expect(recordAfter).toBe(2);
  });

  it('survives rapid cancel + re-acquire without stuck state', () => {
    const guard = new OperationGuard();

    for (let i = 0; i < 50; i++) {
      const token = guard.tryAcquire('ai_playback');
      if (token != null) {
        guard.cancel();
      } else {
        guard.cancel();
      }
    }

    expect(guard.getActive()).toBe('idle');
    const fresh = guard.tryAcquire('recording');
    expect(fresh).not.toBeNull();
    guard.release(fresh!, 'recording');
    expect(guard.getActive()).toBe('idle');
  });

  it('simulates AI playback blocking shadow until cancel', () => {
    const guard = new OperationGuard();

    const playToken = guard.tryAcquire('ai_playback');
    expect(playToken).not.toBeNull();
    expect(guard.tryAcquire('recording')).toBeNull();

    guard.cancel();
    const recordToken = guard.tryAcquire('recording');
    expect(recordToken).not.toBeNull();
    guard.release(recordToken!, 'recording');
    expect(guard.getActive()).toBe('idle');
  });

  it('handles rapid cancel cycles without stuck guard state', () => {
    const guard = new OperationGuard();

    for (let i = 0; i < 30; i++) {
      const token = guard.tryAcquire(i % 2 === 0 ? 'ai_playback' : 'recording');
      if (token != null) {
        guard.cancel();
      } else {
        guard.cancel();
      }
    }

    expect(guard.getActive()).toBe('idle');
    expect(guard.tryAcquire('ai_playback')).not.toBeNull();
  });
});

describe('theme palettes (all themes)', () => {
  const requiredKeys = [
    'bg',
    'text',
    'border',
    'accent',
    'buttons',
    'slider',
    'selection',
    'glass',
    'waveform',
  ] as const;

  const buttonKeys = [
    'micBg',
    'navBg',
    'navBorder',
    'micText',
  ] as const;

  it.each(THEME_ORDER)('theme %s has complete tokens', (themeId) => {
    const theme = getTheme(themeId);
    for (const key of requiredKeys) {
      expect(theme[key], `${themeId}.${key}`).toBeTruthy();
    }
    for (const key of buttonKeys) {
      expect(theme.buttons[key], `${themeId}.buttons.${key}`).toBeTruthy();
    }
    expect(theme.slider.track).toBeTruthy();
    expect(theme.slider.fill).toBeTruthy();
    expect(theme.selection.bg).toBeTruthy();
  });

  it('theme switch returns stable objects', () => {
    for (const id of THEME_ORDER) {
      expect(getTheme(id).id).toBe(id);
      expect(THEMES[id]).toBe(getTheme(id));
    }
  });

  it('unknown theme falls back to default dark', () => {
    // @ts-expect-error intentional invalid id
    const fallback = getTheme('invalid');
    expect(fallback.id).toBe('dark');
  });
});
