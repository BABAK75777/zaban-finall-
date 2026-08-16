import { describe, it, expect } from 'vitest';
import {
  buildAiGenerateMessages,
  buildAiPracticePromptBlock,
  resolveAiSentenceLength,
  resolveOutputLanguage,
  AI_GENERATE_SENTENCE_COUNT,
  AI_PRACTICE_LENGTH_BOOST_RATIO,
} from '../utils/resolveOutputLanguage.js';

describe('resolveOutputLanguage', () => {
  it('detects German from English prompt', () => {
    const result = resolveOutputLanguage('Write a short text in German about travel');
    expect(result).toEqual({ language: 'German', code: 'de', explicit: true });
  });

  it('detects German from Persian prompt', () => {
    const result = resolveOutputLanguage('یه متن کوتاه به آلمانی درباره سفر بنویس');
    expect(result).toEqual({ language: 'German', code: 'de', explicit: true });
  });

  it('detects Spanish from English prompt', () => {
    const result = resolveOutputLanguage('Generate practice text in Spanish about food');
    expect(result).toEqual({ language: 'Spanish', code: 'es', explicit: true });
  });

  it('detects Spanish from Persian prompt', () => {
    const result = resolveOutputLanguage('متن به اسپانیایی درباره غذا');
    expect(result).toEqual({ language: 'Spanish', code: 'es', explicit: true });
  });

  it('detects Turkish from Persian prompt', () => {
    const result = resolveOutputLanguage('یک متن به ترکی درباره شهر');
    expect(result).toEqual({ language: 'Turkish', code: 'tr', explicit: true });
  });

  it('does not detect Turkish inside Persian ترکیب', () => {
    const result = resolveOutputLanguage('داستان درباره ترکیب علم و هنر');
    expect(result.code).not.toBe('tr');
  });

  it('detects Turkish from English prompt', () => {
    const result = resolveOutputLanguage('Write in Turkish about Istanbul');
    expect(result).toEqual({ language: 'Turkish', code: 'tr', explicit: true });
  });

  it('does not treat Turkey topic as Turkish output language', () => {
    expect(resolveOutputLanguage('متن درباره ترکیه').code).not.toBe('tr');
    expect(resolveOutputLanguage('Write in English about Turkish culture')).toEqual({
      language: 'English',
      code: 'en',
      explicit: true,
    });
  });

  it('defaults to English when no language is named', () => {
    const result = resolveOutputLanguage('Daily conversation about coffee');
    expect(result).toEqual({ language: 'English', code: 'en', explicit: false });
  });

  it('buildAiGenerateMessages includes CEFR guidance when provided', () => {
    const outputLanguage = { language: 'German', code: 'de', explicit: true };
    const length = resolveAiSentenceLength(0.35);
    const messages = buildAiGenerateMessages({
      trimmedPrompt: 'Travel',
      difficultyLabel: 'CEFR B2',
      cefrLevel: 'B2',
      cefrGuidance: 'Allow more complex sentences.',
      toneLabel: 'neutral',
      voice: 'female',
      sentenceTarget: AI_GENERATE_SENTENCE_COUNT,
      wordsMin: length.wordsMin,
      wordsMax: length.wordsMax,
      styleHint: length.styleHint,
      outputLanguage,
    });

    expect(messages[1].content).toContain('CEFR level: B2');
    expect(messages[1].content).toContain('language-agnostic');
    expect(messages[1].content).toContain('Allow more complex sentences.');
    expect(messages[1].content).not.toContain('Difficulty: beginner');
  });

  it('buildAiGenerateMessages enforces non-English language block', () => {
    const outputLanguage = resolveOutputLanguage('text in German about cats');
    const length = resolveAiSentenceLength(0.35);
    const messages = buildAiGenerateMessages({
      trimmedPrompt: 'text in German about cats',
      difficultyLabel: 'beginner',
      toneLabel: 'neutral',
      voice: 'female',
      sentenceTarget: AI_GENERATE_SENTENCE_COUNT,
      wordsMin: length.wordsMin,
      wordsMax: length.wordsMax,
      styleHint: length.styleHint,
      outputLanguage,
    });

    expect(messages[0].content).toContain('German');
    expect(messages[0].content).toContain('German only');
    expect(messages[1].content).toContain('MANDATORY OUTPUT LANGUAGE: German');
    expect(messages[1].content).toContain(`exactly ${AI_GENERATE_SENTENCE_COUNT} sentences`);
    expect(messages[1].content).toContain(`${length.wordsMin}-${length.wordsMax} words`);
  });

  it('buildAiGenerateMessages defaults to American English', () => {
    const outputLanguage = resolveOutputLanguage('Daily conversation about coffee');
    const length = resolveAiSentenceLength(0.5);
    const messages = buildAiGenerateMessages({
      trimmedPrompt: 'Daily conversation about coffee',
      difficultyLabel: 'beginner',
      toneLabel: 'neutral',
      voice: 'female',
      sentenceTarget: AI_GENERATE_SENTENCE_COUNT,
      wordsMin: length.wordsMin,
      wordsMax: length.wordsMax,
      styleHint: length.styleHint,
      outputLanguage,
    });

    expect(messages[1].content).toContain('American English');
    expect(messages[1].content).toContain('US spelling');
    expect(messages[1].content).toContain('exactly 20 sentences');
  });

  it('resolveAiSentenceLength maps slider to short vs long sentences', () => {
    const short = resolveAiSentenceLength(0);
    const long = resolveAiSentenceLength(1);
    expect(short.wordsMax).toBeLessThan(long.wordsMin);
    expect(AI_GENERATE_SENTENCE_COUNT).toBe(20);
  });

  it('includes practice vocabulary in AI user prompt when provided', () => {
    const outputLanguage = { language: 'English', code: 'en', explicit: false };
    const length = resolveAiSentenceLength(0.35);
    const messages = buildAiGenerateMessages({
      trimmedPrompt: 'Travel',
      difficultyLabel: 'beginner',
      toneLabel: 'neutral',
      voice: 'female',
      sentenceTarget: AI_GENERATE_SENTENCE_COUNT,
      wordsMin: length.wordsMin,
      wordsMax: length.wordsMax,
      styleHint: length.styleHint,
      outputLanguage,
      practiceWordDetails: [
        { word: 'airport', displayWord: 'airport', partOfSpeech: 'noun', usedCount: 0, targetUses: 3 },
        { word: 'ticket', displayWord: 'ticket', partOfSpeech: 'noun', usedCount: 1, targetUses: 3 },
      ],
    });

    expect(messages[1].content).toContain('airport');
    expect(messages[1].content).toContain('ticket');
    expect(messages[1].content).toContain('Practice words for this text');
    expect(messages[1].content).toContain('target progress 0/3');
    expect(messages[1].content).toContain('target progress 1/3');
    expect(messages[1].content).toContain('exactly 22 sentences');
  });

  it('adds grammar and speaking hints when practice words and toggles are on', () => {
    const outputLanguage = { language: 'English', code: 'en', explicit: false };
    const length = resolveAiSentenceLength(0.35);
    const messages = buildAiGenerateMessages({
      trimmedPrompt: 'Travel',
      difficultyLabel: 'beginner',
      toneLabel: 'neutral',
      voice: 'female',
      sentenceTarget: AI_GENERATE_SENTENCE_COUNT,
      wordsMin: length.wordsMin,
      wordsMax: length.wordsMax,
      styleHint: length.styleHint,
      outputLanguage,
      practiceWords: ['airport'],
      grammarFocus: true,
      speakingPractice: true,
    });

    expect(messages[1].content).toContain('grammatical forms');
    expect(messages[1].content).toContain('spoken contexts');
  });

  it('buildAiPracticePromptBlock boosts length by up to 10%', () => {
    const boosted = buildAiPracticePromptBlock({
      practiceWordDetails: [
        { word: 'run', displayWord: 'run', partOfSpeech: 'verb', usedCount: 0, targetUses: 3 },
      ],
      sentenceTarget: 20,
      wordsMin: 10,
      wordsMax: 20,
    });
    expect(boosted.sentenceTarget).toBe(22);
    expect(boosted.wordsMax).toBe(Math.round(20 * (1 + AI_PRACTICE_LENGTH_BOOST_RATIO)));
    expect(boosted.practiceBlock).toContain('run');
    expect(boosted.practiceBlock).toContain('Practice words for this text');
  });
});
