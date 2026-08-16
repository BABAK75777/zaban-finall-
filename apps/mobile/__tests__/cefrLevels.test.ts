import { CEFR_LEVELS, cefrLevelFromIndex, clampCefrIndex } from '../src/ai/cefrLevels';

describe('cefrLevels mobile', () => {
  it('has exactly six fixed levels', () => {
    expect(CEFR_LEVELS).toHaveLength(6);
  });

  it('clamps and snaps index to 0–5', () => {
    expect(clampCefrIndex(-1)).toBe(0);
    expect(clampCefrIndex(2.4)).toBe(2);
    expect(clampCefrIndex(3.7)).toBe(4);
    expect(clampCefrIndex(99)).toBe(5);
  });

  it('derives level string from index', () => {
    expect(cefrLevelFromIndex(4)).toBe('C1');
  });
});
