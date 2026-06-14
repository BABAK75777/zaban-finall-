import { describe, it, expect } from 'vitest';

/** Mirrors handleHearAi index selection in apps/mobile/app/index.tsx */
function resolveHearSentenceIndex(sentenceIndex: number, sentenceCount: number): number {
  if (sentenceCount <= 0) {
    return 0;
  }
  return Math.min(Math.max(0, sentenceIndex), sentenceCount - 1);
}

/** Mirrors handleNext / handleBack index selection in apps/mobile/app/index.tsx */
function resolveNextSentenceIndex(current: number, sentenceCount: number): number {
  if (sentenceCount <= 0) {
    return 0;
  }
  return Math.min(current + 1, sentenceCount - 1);
}

function resolveBackSentenceIndex(current: number): number {
  return Math.max(current - 1, 0);
}

describe('mobile HEAR sentence index', () => {
  it('plays current sentence after NEXT (not always 0)', () => {
    expect(resolveHearSentenceIndex(0, 3)).toBe(0);
    expect(resolveHearSentenceIndex(1, 3)).toBe(1);
    expect(resolveHearSentenceIndex(2, 3)).toBe(2);
  });

  it('clamps out-of-range index', () => {
    expect(resolveHearSentenceIndex(5, 3)).toBe(2);
    expect(resolveHearSentenceIndex(-1, 3)).toBe(0);
  });

  it('returns 0 when no sentences', () => {
    expect(resolveHearSentenceIndex(0, 0)).toBe(0);
  });
});

describe('mobile NEXT/BACK sentence index', () => {
  it('NEXT advances until last sentence', () => {
    expect(resolveNextSentenceIndex(0, 3)).toBe(1);
    expect(resolveNextSentenceIndex(1, 3)).toBe(2);
    expect(resolveNextSentenceIndex(2, 3)).toBe(2);
  });

  it('BACK retreats until first sentence', () => {
    expect(resolveBackSentenceIndex(2)).toBe(1);
    expect(resolveBackSentenceIndex(1)).toBe(0);
    expect(resolveBackSentenceIndex(0)).toBe(0);
  });

  it('no-op when already at boundary', () => {
    expect(resolveNextSentenceIndex(2, 3)).toBe(2);
    expect(resolveBackSentenceIndex(0)).toBe(0);
  });
});
