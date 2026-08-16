import {
  applyTtsSafeChunkLimits,
  createSafeReadingChunks,
  createUnitReadingChunks,
  MAX_TTS_CHUNK_CHARS,
  selectCacheKeepIds,
  splitOversizedForTts,
} from '../src/utils/longTextProcessing';

describe('longTextProcessing', () => {
  it('keeps short text as one chunk for sentence unit', () => {
    const chunks = createSafeReadingChunks('Hello world. Second sentence.', '1');
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks.every((c) => c.length <= MAX_TTS_CHUNK_CHARS)).toBe(true);
  });

  it('splits large page-style text into multiple TTS-safe chunks', () => {
    const paragraph = `${'Word '.repeat(400)}End.`;
    const huge = Array.from({ length: 20 }, () => paragraph).join(' ');
    const chunks = createSafeReadingChunks(huge, 'page');
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= MAX_TTS_CHUNK_CHARS)).toBe(true);
    expect(chunks.every((c) => c.trim().length > 0)).toBe(true);
  });

  it('does not create a single giant chunk for page unit', () => {
    const huge = 'A'.repeat(12_000);
    const chunks = createSafeReadingChunks(huge, 'page');
    expect(chunks.length).toBeGreaterThan(1);
    expect(Math.max(...chunks.map((c) => c.length))).toBeLessThanOrEqual(MAX_TTS_CHUNK_CHARS);
  });

  it('preserves sentence boundaries when splitting oversized chunk', () => {
    const sentence = `${'hello '.repeat(900)}world.`;
    const parts = splitOversizedForTts(`${sentence} ${sentence}`);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= MAX_TTS_CHUNK_CHARS)).toBe(true);
  });

  it('limits cache prune IDs for very long chunk lists', () => {
    const chunks = Array.from({ length: 500 }, (_, i) => `chunk ${i}`);
    const ids = selectCacheKeepIds(chunks, 250, (c) => c);
    expect(ids.length).toBeLessThanOrEqual(120);
    expect(ids).toContain('chunk 250');
  });

  it('applyTtsSafeChunkLimits never returns empty strings', () => {
    const unitChunks = createUnitReadingChunks('One. Two. Three.', '1');
    const safe = applyTtsSafeChunkLimits(unitChunks);
    expect(safe.every((c) => c.trim().length > 0)).toBe(true);
  });
});
