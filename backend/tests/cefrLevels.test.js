import {
  cefrLevelFromIndex,
  cefrLevelFromLegacyDifficulty,
  CEFR_GUIDANCE,
  CEFR_LEVELS,
  isValidCefrLevel,
  resolveCefrForPrompt,
} from '../utils/cefrLevels.js';

describe('cefrLevels', () => {
  it('defines six CEFR levels', () => {
    expect(CEFR_LEVELS).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  });

  it('maps index 0–5 to levels', () => {
    expect(cefrLevelFromIndex(0)).toBe('A1');
    expect(cefrLevelFromIndex(5)).toBe('C2');
    expect(cefrLevelFromIndex(99)).toBe('C2');
  });

  it('validates CEFR level strings', () => {
    expect(isValidCefrLevel('B2')).toBe(true);
    expect(isValidCefrLevel('b2')).toBe(true);
    expect(isValidCefrLevel('X9')).toBe(false);
  });

  it('resolveCefrForPrompt returns guidance for each level', () => {
    for (const level of CEFR_LEVELS) {
      const resolved = resolveCefrForPrompt(level);
      expect(resolved.cefrLevel).toBe(level);
      expect(resolved.difficultyLabel).toBe(`CEFR ${level}`);
      expect(resolved.cefrGuidance).toBe(CEFR_GUIDANCE[level]);
    }
  });

  it('maps legacy 0–1 difficulty to CEFR', () => {
    expect(cefrLevelFromLegacyDifficulty(0)).toBe('A1');
    expect(cefrLevelFromLegacyDifficulty(0.5)).toBe('B1');
    expect(cefrLevelFromLegacyDifficulty(1)).toBe('C2');
  });
});
