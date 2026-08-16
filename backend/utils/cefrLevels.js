/** @typedef {'A1'|'A2'|'B1'|'B2'|'C1'|'C2'} CefrLevel */

export const CEFR_LEVELS = /** @type {const} */ (['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

/** @type {Record<CefrLevel, string>} */
export const CEFR_GUIDANCE = {
  A1: [
    'Difficulty A1: very simple words, very short sentences, present tense mostly.',
    'Use very basic words and high-frequency vocabulary only.',
    'Keep sentences short and simple.',
    'Use present tense and simple structures; avoid complex grammar.',
    'Avoid idioms, slang, and advanced constructions.',
    'Keep explanations and phrasing easy for a complete beginner.',
  ].join('\n'),
  A2: [
    'Difficulty A2: simple daily vocabulary, short sentences.',
    'Use simple everyday language.',
    'Allow slightly longer sentences with basic connectors.',
    'Basic past and future forms are allowed.',
    'Avoid advanced idioms and complex grammar.',
    'Keep the text clear for an elementary learner.',
  ].join('\n'),
  B1: [
    'Difficulty B1: everyday intermediate vocabulary, some connected sentences.',
    'Use natural but controlled language.',
    'Cover everyday topics with moderate sentence length.',
    'Use common grammar patterns; avoid rare or literary forms.',
    'Limit idioms to very common expressions.',
    'Keep the passage learnable for an intermediate learner.',
  ].join('\n'),
  B2: [
    'Difficulty B2: richer vocabulary, more complex sentence structure.',
    'Use more natural, native-like phrasing.',
    'Allow more complex sentences and richer vocabulary.',
    'Some idioms or common expressions are allowed.',
    'Grammar may be more varied while staying clear and learnable.',
    'Target upper-intermediate learners.',
  ].join('\n'),
  C1: [
    'Difficulty C1: advanced but still clear natural language.',
    'Use advanced vocabulary and complex sentence structures.',
    'Write in a natural, fluent style.',
    'Idioms and nuance are allowed when they aid learning.',
    'Maintain clarity despite higher complexity.',
    'Target advanced learners.',
  ].join('\n'),
  C2: [
    'Difficulty C2: near-native complexity while remaining learnable.',
    'Use very advanced, native-like language.',
    'Include subtle nuance, register, and natural idioms where appropriate.',
    'Allow high syntactic complexity while remaining useful for learning.',
    'Target near-native proficiency practice.',
  ].join('\n'),
};

/**
 * @param {unknown} level
 * @returns {level is CefrLevel}
 */
export function isValidCefrLevel(level) {
  return typeof level === 'string' && CEFR_LEVELS.includes(level.trim().toUpperCase());
}

/**
 * @param {number} index
 * @returns {CefrLevel}
 */
export function cefrLevelFromIndex(index) {
  const i = Math.max(0, Math.min(CEFR_LEVELS.length - 1, Math.round(Number(index))));
  return CEFR_LEVELS[i];
}

/**
 * @param {CefrLevel} level
 * @returns {{ cefrLevel: CefrLevel, difficultyLabel: string, cefrGuidance: string }}
 */
export function resolveCefrForPrompt(level) {
  const normalized = /** @type {CefrLevel} */ (String(level).trim().toUpperCase());
  const cefrLevel = isValidCefrLevel(normalized) ? normalized : 'B1';
  return {
    cefrLevel,
    difficultyLabel: `CEFR ${cefrLevel}`,
    cefrGuidance: CEFR_GUIDANCE[cefrLevel],
  };
}

/**
 * Map legacy 0–1 difficulty slider to nearest CEFR level (backward compatibility).
 * @param {number} difficulty
 * @returns {CefrLevel}
 */
export function cefrLevelFromLegacyDifficulty(difficulty) {
  const d = typeof difficulty === 'number' && !Number.isNaN(difficulty)
    ? Math.max(0, Math.min(1, difficulty))
    : 0.5;
  if (d <= 0.1) return 'A1';
  if (d <= 0.25) return 'A2';
  if (d <= 0.55) return 'B1';
  if (d <= 0.75) return 'B2';
  if (d <= 0.9) return 'C1';
  return 'C2';
}
