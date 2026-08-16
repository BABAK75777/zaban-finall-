/** CEFR learner levels — language-agnostic difficulty scale. */
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];

/** Default: B1 (intermediate), aligned with prior 0.5 difficulty slider. */
export const DEFAULT_CEFR_INDEX = 2;

export function clampCefrIndex(index: number): number {
  if (!Number.isFinite(index)) return DEFAULT_CEFR_INDEX;
  return Math.max(0, Math.min(CEFR_LEVELS.length - 1, Math.round(index)));
}

export function cefrLevelFromIndex(index: number): CefrLevel {
  return CEFR_LEVELS[clampCefrIndex(index)];
}

export function cefrIndexFromLevel(level: string): number {
  const normalized = level.trim().toUpperCase();
  const idx = CEFR_LEVELS.indexOf(normalized as CefrLevel);
  return idx >= 0 ? idx : DEFAULT_CEFR_INDEX;
}

export function isCefrLevel(value: string): value is CefrLevel {
  return (CEFR_LEVELS as readonly string[]).includes(value);
}
