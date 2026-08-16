import { describe, expect, it } from 'vitest';
import {
  AI_GENERATE_SENTENCE_COUNT,
  buildAiGenerateMessages,
  resolveAiSentenceLength,
} from '../utils/resolveOutputLanguage.js';
import { CEFR_GUIDANCE, resolveCefrForPrompt } from '../utils/cefrLevels.js';

const GROCERY_PROMPT = 'Write a short text about going to a grocery store.';
const TEST_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const FIXED_TEXT_LENGTH = 0.35;
const FIXED_TONE = 'neutral educational';

function buildGroceryMessages(cefrLevel) {
  const { difficultyLabel, cefrGuidance } = resolveCefrForPrompt(cefrLevel);
  const length = resolveAiSentenceLength(FIXED_TEXT_LENGTH);
  return buildAiGenerateMessages({
    trimmedPrompt: GROCERY_PROMPT,
    difficultyLabel,
    cefrLevel,
    cefrGuidance,
    toneLabel: FIXED_TONE,
    voice: 'female',
    sentenceTarget: AI_GENERATE_SENTENCE_COUNT,
    wordsMin: length.wordsMin,
    wordsMax: length.wordsMax,
    styleHint: length.styleHint,
    outputLanguage: { language: 'English', code: 'en', explicit: false },
  });
}

describe('AI difficulty / CEFR grocery-store prompt test', () => {
  it('builds distinct CEFR guidance for A1–C1 with the same grocery prompt', () => {
    const userContents = TEST_LEVELS.map((level) => {
      const messages = buildGroceryMessages(level);
      expect(messages[1].content).toContain(GROCERY_PROMPT);
      expect(messages[1].content).toContain(`CEFR level: ${level}`);
      expect(messages[1].content).toContain(CEFR_GUIDANCE[level]);
      return messages[1].content;
    });

    const unique = new Set(userContents);
    expect(unique.size).toBe(TEST_LEVELS.length);
  });

  it('A1 is simpler than B1 and C1 is more advanced than B1 in prompt guidance', () => {
    const a1 = buildGroceryMessages('A1')[1].content;
    const b1 = buildGroceryMessages('B1')[1].content;
    const c1 = buildGroceryMessages('C1')[1].content;

    expect(a1).toContain('very simple words');
    expect(a1).toContain('present tense mostly');
    expect(b1).toContain('everyday intermediate vocabulary');
    expect(c1).toContain('advanced but still clear natural language');
    expect(c1).toContain('complex sentence structures');

    expect(a1).not.toContain('Difficulty C1');
    expect(c1).not.toContain('Difficulty A1');
    expect(b1.length).toBeGreaterThan(a1.length - 200);
  });

  it('keeps sentence length separate from CEFR difficulty', () => {
    const short = resolveAiSentenceLength(0);
    const long = resolveAiSentenceLength(1);
    const a1Short = buildAiGenerateMessages({
      trimmedPrompt: GROCERY_PROMPT,
      ...resolveCefrForPrompt('A1'),
      toneLabel: FIXED_TONE,
      voice: 'female',
      sentenceTarget: AI_GENERATE_SENTENCE_COUNT,
      wordsMin: short.wordsMin,
      wordsMax: short.wordsMax,
      styleHint: short.styleHint,
      outputLanguage: { language: 'English', code: 'en', explicit: false },
    })[1].content;

    const a1Long = buildAiGenerateMessages({
      trimmedPrompt: GROCERY_PROMPT,
      ...resolveCefrForPrompt('A1'),
      toneLabel: FIXED_TONE,
      voice: 'female',
      sentenceTarget: AI_GENERATE_SENTENCE_COUNT,
      wordsMin: long.wordsMin,
      wordsMax: long.wordsMax,
      styleHint: long.styleHint,
      outputLanguage: { language: 'English', code: 'en', explicit: false },
    })[1].content;

    expect(a1Short).toContain(`${short.wordsMin}-${short.wordsMax} words`);
    expect(a1Long).toContain(`${long.wordsMin}-${long.wordsMax} words`);
    expect(short.wordsMax).toBeLessThan(long.wordsMax);
    expect(a1Short).toContain('CEFR level: A1');
    expect(a1Long).toContain('CEFR level: A1');
  });

  it('does not bloat the grocery prompt beyond a reasonable size', () => {
    for (const level of TEST_LEVELS) {
      const content = buildGroceryMessages(level)[1].content;
      expect(content.length).toBeLessThan(3500);
    }
  });
});
