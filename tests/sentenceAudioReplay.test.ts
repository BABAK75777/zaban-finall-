import { beforeEach, describe, it, expect } from 'vitest';
import { resolveSentenceAudio } from '../packages/tts-mobile/src/resolveSentenceAudio';
import { asyncStore } from './mocks/async-storage';
import {
  CACHE_IDLE_TTL_MS,
  touchLastActivityAt,
  getLastActivityAt,
  clearSentenceCacheIfIdleExpired,
  setActiveSentenceRing,
  getCachedSentenceAudio,
  getSentenceCacheStats,
  getRetentionWindowSize,
  isSentenceGenerated,
  putCachedSentenceAudio,
} from '../packages/tts-mobile/src/sentenceAudioCache';
import { deletedPaths } from './mocks/expo-file-system';
import {
  shouldTouchLastActivityOn,
  shouldRunIdleCacheCheckOnAppState,
} from '../packages/tts-mobile/src/cacheActivityPolicy';
import { InFlightTtsFetch } from '../packages/tts-mobile/src/inFlightTtsFetch';
import { allowNetworkForSource } from '../packages/tts-mobile/src/cacheFirstPolicy';
import { buildKeepSentenceIds } from '../packages/tts-mobile/src/buildKeepSentenceIds';
import { uint8ArrayToBase64 } from '../packages/tts-mobile/src/uint8ArrayToBase64';

describe('sentence audio replay (Phase 2)', () => {
  it('first play: 1 network fetch; 10 replays: 0 additional fetches', async () => {
    let fetchCount = 0;
    const store = new Map<string, string>();

    const deps = {
      getCached: async (id: string) => store.get(id) ?? null,
      fetchAudio: async () => {
        fetchCount += 1;
        return new Uint8Array([0xff, 0xfb]);
      },
      putCached: async (id: string) => {
        const path = `/cache/${id}.mp3`;
        store.set(id, path);
        return path;
      },
    };

    const sentenceId = 'abc123';

    const first = await resolveSentenceAudio(sentenceId, deps, { allowNetwork: true });
    expect(first).toEqual({ audioPath: '/cache/abc123.mp3', fromCache: false });
    expect(fetchCount).toBe(1);

    for (let i = 0; i < 10; i++) {
      const replay = await resolveSentenceAudio(sentenceId, deps, { allowNetwork: false });
      expect(replay).toEqual({ audioPath: '/cache/abc123.mp3', fromCache: true });
    }

    expect(fetchCount).toBe(1);
  });

  it('replay on cache miss does not fetch', async () => {
    let fetchCount = 0;
    const deps = {
      getCached: async () => null,
      fetchAudio: async () => {
        fetchCount += 1;
        return new Uint8Array([1]);
      },
      putCached: async (id: string) => `/cache/${id}.mp3`,
    };

    expect(allowNetworkForSource('replay', null)).toBe(false);
    const result = await resolveSentenceAudio('missing', deps, {
      allowNetwork: allowNetworkForSource('replay', null),
    });
    expect(result).toBeNull();
    expect(fetchCount).toBe(0);
  });
});

describe('sentence cache idle TTL (Step A)', () => {
  const LAST_ACTIVITY_KEY = '@zaban/sentence_cache_last_activity';
  const META_KEY = '@zaban/sentence_audio_cache_v1';

  beforeEach(() => {
    asyncStore.clear();
  });

  it('touchLastActivityAt saves timestamp', async () => {
    await touchLastActivityAt(1_700_000_000_000);
    expect(asyncStore.get(LAST_ACTIVITY_KEY)).toBe('1700000000000');
  });

  it('getLastActivityAt reads timestamp', async () => {
    await touchLastActivityAt(1_700_000_123_456);
    expect(await getLastActivityAt()).toBe(1_700_000_123_456);
  });

  it('clearSentenceCacheIfIdleExpired returns false before 10 minutes', async () => {
    const t0 = 1_000_000_000_000;
    await touchLastActivityAt(t0);
    const cleared = await clearSentenceCacheIfIdleExpired(t0 + CACHE_IDLE_TTL_MS - 60_000);
    expect(cleared).toBe(false);
  });

  it('clearSentenceCacheIfIdleExpired clears after 10 minutes', async () => {
    const t0 = 2_000_000_000_000;
    await touchLastActivityAt(t0);
    asyncStore.set(
      META_KEY,
      JSON.stringify({
        entries: {
          s1: { sentenceId: 's1', audioPath: '/x.mp3', hash: 'h', createdAt: t0 },
        },
        currentSentenceId: 's1',
        previousSentenceId: null,
      })
    );
    const cleared = await clearSentenceCacheIfIdleExpired(t0 + CACHE_IDLE_TTL_MS + 1);
    expect(cleared).toBe(true);
    expect(asyncStore.has(META_KEY)).toBe(false);
    expect(asyncStore.has(LAST_ACTIVITY_KEY)).toBe(false);
  });

  it('invalid/missing lastActivityAt returns false safely', async () => {
    expect(await getLastActivityAt()).toBeNull();
    expect(await clearSentenceCacheIfIdleExpired(Date.now())).toBe(false);

    asyncStore.set(LAST_ACTIVITY_KEY, 'not-a-number');
    expect(await getLastActivityAt()).toBeNull();
    expect(await clearSentenceCacheIfIdleExpired(Date.now())).toBe(false);

    asyncStore.set(LAST_ACTIVITY_KEY, '');
    expect(await getLastActivityAt()).toBeNull();
    expect(await clearSentenceCacheIfIdleExpired(Date.now())).toBe(false);
  });
});

describe('sentence cache ring (Step E)', () => {
  const META_KEY = '@zaban/sentence_audio_cache_v1';

  beforeEach(() => {
    asyncStore.clear();
    deletedPaths.length = 0;
  });

  it('getRetentionWindowSize full = 2', () => {
    expect(getRetentionWindowSize('full')).toBe(2);
  });

  it('getRetentionWindowSize half = 3', () => {
    expect(getRetentionWindowSize('half')).toBe(3);
    expect(getRetentionWindowSize('quarter')).toBe(3);
    expect(getRetentionWindowSize('eighth')).toBe(3);
  });

  it('full mode evicts outside 2-ID window', async () => {
    const t0 = 1_700_000_000_000;
    asyncStore.set(
      META_KEY,
      JSON.stringify({
        entries: {
          s1: {
            sentenceId: 's1',
            audioPath: '/mock/doc/tts_sentences/s1.mp3',
            hash: 'h1',
            createdAt: t0,
          },
          s2: {
            sentenceId: 's2',
            audioPath: '/mock/doc/tts_sentences/s2.mp3',
            hash: 'h2',
            createdAt: t0,
          },
          s3: {
            sentenceId: 's3',
            audioPath: '/mock/doc/tts_sentences/s3.mp3',
            hash: 'h3',
            createdAt: t0,
          },
          s4: {
            sentenceId: 's4',
            audioPath: '/mock/doc/tts_sentences/s4.mp3',
            hash: 'h4',
            createdAt: t0,
          },
        },
        currentSentenceId: 's3',
        previousSentenceId: 's2',
      })
    );

    const result = await setActiveSentenceRing(['s3', 's4']);
    expect(result.evictedCount).toBe(2);
    expect(deletedPaths).toContain('/mock/doc/tts_sentences/s1.mp3');
    expect(deletedPaths).toContain('/mock/doc/tts_sentences/s2.mp3');

    const stats = await getSentenceCacheStats();
    expect(stats.entryCount).toBe(2);
    expect(await getCachedSentenceAudio('s1')).toBeNull();
    expect(await getCachedSentenceAudio('s2')).toBeNull();
    expect(await getCachedSentenceAudio('s3')).toBe('/mock/doc/tts_sentences/s3.mp3');
    expect(await getCachedSentenceAudio('s4')).toBe('/mock/doc/tts_sentences/s4.mp3');
  });

  it('half mode evicts outside 3-ID window', async () => {
    const t0 = 1_700_000_000_000;
    asyncStore.set(
      META_KEY,
      JSON.stringify({
        entries: {
          s1: {
            sentenceId: 's1',
            audioPath: '/mock/doc/tts_sentences/s1.mp3',
            hash: 'h1',
            createdAt: t0,
          },
          s2: {
            sentenceId: 's2',
            audioPath: '/mock/doc/tts_sentences/s2.mp3',
            hash: 'h2',
            createdAt: t0,
          },
          s3: {
            sentenceId: 's3',
            audioPath: '/mock/doc/tts_sentences/s3.mp3',
            hash: 'h3',
            createdAt: t0,
          },
          s4: {
            sentenceId: 's4',
            audioPath: '/mock/doc/tts_sentences/s4.mp3',
            hash: 'h4',
            createdAt: t0,
          },
          s5: {
            sentenceId: 's5',
            audioPath: '/mock/doc/tts_sentences/s5.mp3',
            hash: 'h5',
            createdAt: t0,
          },
        },
        currentSentenceId: 's4',
        previousSentenceId: 's3',
      })
    );

    const result = await setActiveSentenceRing(['s3', 's4', 's5']);
    expect(result.evictedCount).toBe(2);
    expect(deletedPaths).toContain('/mock/doc/tts_sentences/s1.mp3');
    expect(deletedPaths).toContain('/mock/doc/tts_sentences/s2.mp3');

    const stats = await getSentenceCacheStats();
    expect(stats.entryCount).toBe(3);
    expect(await getCachedSentenceAudio('s1')).toBeNull();
    expect(await getCachedSentenceAudio('s2')).toBeNull();
    expect(await getCachedSentenceAudio('s3')).toBe('/mock/doc/tts_sentences/s3.mp3');
    expect(await getCachedSentenceAudio('s4')).toBe('/mock/doc/tts_sentences/s4.mp3');
    expect(await getCachedSentenceAudio('s5')).toBe('/mock/doc/tts_sentences/s5.mp3');
  });

  it('in-use path is not deleted', async () => {
    const t0 = 1_700_000_000_000;
    const inUsePath = '/mock/doc/tts_sentences/s1.mp3';
    asyncStore.set(
      META_KEY,
      JSON.stringify({
        entries: {
          s1: {
            sentenceId: 's1',
            audioPath: inUsePath,
            hash: 'h1',
            createdAt: t0,
          },
          s2: {
            sentenceId: 's2',
            audioPath: '/mock/doc/tts_sentences/s2.mp3',
            hash: 'h2',
            createdAt: t0,
          },
          s3: {
            sentenceId: 's3',
            audioPath: '/mock/doc/tts_sentences/s3.mp3',
            hash: 'h3',
            createdAt: t0,
          },
        },
        currentSentenceId: 's3',
        previousSentenceId: 's2',
      })
    );

    const result = await setActiveSentenceRing(['s3'], inUsePath);
    expect(result.evictedCount).toBe(1);
    expect(deletedPaths).toContain('/mock/doc/tts_sentences/s2.mp3');
    expect(deletedPaths).not.toContain(inUsePath);

    expect(await getCachedSentenceAudio('s1')).toBe(inUsePath);
    expect(await getCachedSentenceAudio('s2')).toBeNull();
    expect(await getCachedSentenceAudio('s3')).toBe('/mock/doc/tts_sentences/s3.mp3');
  });
});

describe('cache activity policy (Step B)', () => {
  it('activity touch policy: playback_start touches last activity', () => {
    expect(shouldTouchLastActivityOn('playback_start')).toBe(true);
  });

  it('activity touch policy: playback_stop touches last activity', () => {
    expect(shouldTouchLastActivityOn('playback_stop')).toBe(true);
  });

  it('foreground idle-clear policy: active runs idle expiry check', () => {
    expect(shouldRunIdleCacheCheckOnAppState('active')).toBe(true);
  });

  it('foreground idle-clear policy: background/inactive do not run idle check', () => {
    expect(shouldRunIdleCacheCheckOnAppState('background')).toBe(false);
    expect(shouldRunIdleCacheCheckOnAppState('inactive')).toBe(false);
  });
});

describe('in-flight TTS dedup (Step C)', () => {
  it('same sentenceId concurrent fetch calls factory once', async () => {
    const dedup = new InFlightTtsFetch<Uint8Array>();
    let factoryCalls = 0;

    const p1 = dedup.getOrFetch('id1', async () => {
      factoryCalls += 1;
      await new Promise((r) => setTimeout(r, 10));
      return new Uint8Array([1]);
    });
    const p2 = dedup.getOrFetch('id1', async () => {
      factoryCalls += 1;
      return new Uint8Array([2]);
    });

    const [a, b] = await Promise.all([p1, p2]);
    expect(factoryCalls).toBe(1);
    expect(a).toEqual(b);
  });

  it('duplicate fetch is blocked while first request is in flight', async () => {
    const dedup = new InFlightTtsFetch<number>();
    let factoryCalls = 0;
    let unblock!: () => void;
    const gate = new Promise<void>((resolve) => {
      unblock = resolve;
    });

    const first = dedup.getOrFetch('id1', async () => {
      factoryCalls += 1;
      await gate;
      return 99;
    });
    expect(dedup.hasInFlight('id1')).toBe(true);

    const second = dedup.getOrFetch('id1', async () => {
      factoryCalls += 1;
      return 0;
    });
    expect(dedup.hasInFlight('id1')).toBe(true);

    unblock();
    const [a, b] = await Promise.all([first, second]);
    expect(factoryCalls).toBe(1);
    expect(a).toBe(99);
    expect(b).toBe(99);
  });

  it('map clears after finally when fetch settles', async () => {
    const dedup = new InFlightTtsFetch<number>();
    expect(dedup.hasInFlight('id1')).toBe(false);

    const pending = dedup.getOrFetch('id1', async () => {
      await new Promise((r) => setTimeout(r, 5));
      return 1;
    });
    expect(dedup.hasInFlight('id1')).toBe(true);
    await pending;
    expect(dedup.hasInFlight('id1')).toBe(false);
  });

  it('different sentenceIds fetch independently', async () => {
    const dedup = new InFlightTtsFetch<number>();
    let factoryCalls = 0;

    await Promise.all([
      dedup.getOrFetch('a', async () => {
        factoryCalls += 1;
        return 1;
      }),
      dedup.getOrFetch('b', async () => {
        factoryCalls += 1;
        return 2;
      }),
    ]);

    expect(factoryCalls).toBe(2);
    expect(dedup.hasInFlight('a')).toBe(false);
    expect(dedup.hasInFlight('b')).toBe(false);
  });
});

describe('cache-first policy (Step D)', () => {
  const cachedDeps = (fetchCount: { n: number }) => ({
    getCached: async () => '/cache/hit.mp3',
    fetchAudio: async () => {
      fetchCount.n += 1;
      return new Uint8Array([1]);
    },
    putCached: async () => '/cache/hit.mp3',
  });

  it('cache HIT never calls fetch for hear, replay, and nav', async () => {
    for (const source of ['hear', 'replay', 'nav'] as const) {
      const fetchCount = { n: 0 };
      const result = await resolveSentenceAudio(
        'hit',
        cachedDeps(fetchCount),
        { allowNetwork: allowNetworkForSource(source, '/cache/hit.mp3') }
      );
      expect(result).toEqual({ audioPath: '/cache/hit.mp3', fromCache: true });
      expect(fetchCount.n).toBe(0);
    }
  });

  it('cache HIT: allowNetwork is false for hear, replay, and nav', () => {
    for (const source of ['hear', 'replay', 'nav'] as const) {
      expect(allowNetworkForSource(source, '/cache/x.mp3')).toBe(false);
    }
  });

  it('replay/nav HIT local-only: resolve does not fetch', async () => {
    for (const source of ['replay', 'nav'] as const) {
      const fetchCount = { n: 0 };
      const result = await resolveSentenceAudio(
        'hit',
        cachedDeps(fetchCount),
        { allowNetwork: allowNetworkForSource(source, '/cache/hit.mp3') }
      );
      expect(result?.fromCache).toBe(true);
      expect(fetchCount.n).toBe(0);
    }
  });

  it('replay MISS does not fetch; nav MISS fetches when cache empty', async () => {
    expect(allowNetworkForSource('replay', null)).toBe(false);
    let replayFetch = 0;
    const replayResult = await resolveSentenceAudio(
      'miss',
      {
        getCached: async () => null,
        fetchAudio: async () => {
          replayFetch += 1;
          return new Uint8Array([1]);
        },
        putCached: async () => '/cache/miss.mp3',
      },
      { allowNetwork: allowNetworkForSource('replay', null) }
    );
    expect(replayResult).toBeNull();
    expect(replayFetch).toBe(0);

    expect(allowNetworkForSource('nav', null)).toBe(true);
    let navFetch = 0;
    const navResult = await resolveSentenceAudio(
      'miss',
      {
        getCached: async () => null,
        fetchAudio: async () => {
          navFetch += 1;
          return new Uint8Array([1]);
        },
        putCached: async () => '/cache/miss.mp3',
      },
      { allowNetwork: allowNetworkForSource('nav', null) }
    );
    expect(navResult).toEqual({ audioPath: '/cache/miss.mp3', fromCache: false });
    expect(navFetch).toBe(1);
  });

  it('generated lock blocks hear/nav refetch on cache miss', () => {
    expect(allowNetworkForSource('hear', null, true)).toBe(false);
    expect(allowNetworkForSource('nav', null, true)).toBe(false);
    expect(allowNetworkForSource('replay', null, true)).toBe(false);
    expect(allowNetworkForSource('hear', null, false)).toBe(true);
  });

  it('hear MISS can fetch once', async () => {
    let fetchCount = 0;
    const result = await resolveSentenceAudio(
      'miss',
      {
        getCached: async () => null,
        fetchAudio: async () => {
          fetchCount += 1;
          return new Uint8Array([0xff, 0xfb]);
        },
        putCached: async () => '/cache/miss.mp3',
      },
      { allowNetwork: allowNetworkForSource('hear', null) }
    );
    expect(result).toEqual({ audioPath: '/cache/miss.mp3', fromCache: false });
    expect(fetchCount).toBe(1);
  });
});

describe('sentence generation lock', () => {
  const META_KEY = '@zaban/sentence_audio_cache_v1';

  beforeEach(() => {
    asyncStore.clear();
    deletedPaths.length = 0;
  });

  it('locks after putCached and unlocks on ring eviction', async () => {
    await putCachedSentenceAudio('s1', 'h1', new Uint8Array([1, 2]));
    expect(await isSentenceGenerated('s1')).toBe(true);

    await setActiveSentenceRing([], null);
    expect(await isSentenceGenerated('s1')).toBe(false);
    expect(await getCachedSentenceAudio('s1')).toBeNull();
  });

  it('second hear resolve does not fetch when locked and cached', async () => {
    await putCachedSentenceAudio('s2', 'h2', new Uint8Array([3]));
    let fetchCount = 0;
    const result = await resolveSentenceAudio(
      's2',
      {
        getCached: getCachedSentenceAudio,
        fetchAudio: async () => {
          fetchCount += 1;
          return new Uint8Array([9]);
        },
        putCached: putCachedSentenceAudio,
      },
      {
        allowNetwork: allowNetworkForSource('hear', null, true),
        trigger: 'hear',
      }
    );
    expect(result?.fromCache).toBe(true);
    expect(fetchCount).toBe(0);
  });
});

describe('buildKeepSentenceIds (index cache window)', () => {
  const toId = async (sentence: string) => `id:${sentence}`;
  const sentences = ['S0.', 'S1.', 'S2.', 'S3.', 'S4.'];

  it('full mode at index 0 returns 1 ID', async () => {
    const ids = await buildKeepSentenceIds(0, sentences, 'full', toId);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe('id:S0.');
  });

  it('full mode at index 3 returns max 2 IDs', async () => {
    const ids = await buildKeepSentenceIds(3, sentences, 'full', toId);
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(['id:S2.', 'id:S3.']);
  });

  it('half mode at index 0 returns 1 ID', async () => {
    const ids = await buildKeepSentenceIds(0, sentences, 'half', toId);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe('id:S0.');
  });

  it('half/quarter/eighth at index 4 returns max 3 IDs', async () => {
    const half = await buildKeepSentenceIds(4, sentences, 'half', toId);
    expect(half).toHaveLength(3);
    expect(half).toEqual(['id:S2.', 'id:S3.', 'id:S4.']);

    const quarter = await buildKeepSentenceIds(4, sentences, 'quarter', toId);
    expect(quarter).toHaveLength(3);
    expect(quarter).toEqual(['id:S2.', 'id:S3.', 'id:S4.']);

    const eighth = await buildKeepSentenceIds(4, sentences, 'eighth', toId);
    expect(eighth).toHaveLength(3);
    expect(eighth).toEqual(['id:S2.', 'id:S3.', 'id:S4.']);
  });

  it('IDs are ordered oldest → newest', async () => {
    const ids = await buildKeepSentenceIds(4, sentences, 'half', toId);
    const indices = ids.map((id) => Number(id.replace('id:S', '').replace('.', '')));
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
    expect(ids[0]).toBe('id:S2.');
    expect(ids[ids.length - 1]).toBe('id:S4.');
  });
});

describe('Uint8Array → Base64 (RN Blob ArrayBuffer regression)', () => {
  beforeEach(() => {
    asyncStore.clear();
    deletedPaths.length = 0;
  });

  it('encodes TTS-like binary without constructing a Blob from ArrayBufferView', () => {
    const bytes = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 1, 2, 3, 250, 251]);
    const expected = Buffer.from(bytes).toString('base64');
    expect(uint8ArrayToBase64(bytes)).toBe(expected);
  });

  it('still encodes when RN Blob throws ArrayBufferView error', async () => {
    const OriginalBlob = globalThis.Blob;
    globalThis.Blob = class {
      constructor() {
        throw new Error(
          "Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported"
        );
      }
    } as unknown as typeof Blob;

    try {
      const bytes = new Uint8Array([0xff, 0xfb, 9, 8, 7]);
      expect(uint8ArrayToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
      const stored = await putCachedSentenceAudio('rn-blob-reg', 'h-reg', bytes);
      expect(stored).toContain('rn-blob-reg');
      expect(await isSentenceGenerated('rn-blob-reg')).toBe(true);
    } finally {
      globalThis.Blob = OriginalBlob;
    }
  });
});
