import { describe, it, expect } from 'vitest';
import {
  resolveOutputLanguage,
  buildAiGenerateMessages,
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

  it('detects Turkish from English prompt', () => {
    const result = resolveOutputLanguage('Write in Turkish about Istanbul');
    expect(result).toEqual({ language: 'Turkish', code: 'tr', explicit: true });
  });

  it('defaults to English when no language is named', () => {
    const result = resolveOutputLanguage('Daily conversation about coffee');
    expect(result).toEqual({ language: 'English', code: 'en', explicit: false });
  });

  it('buildAiGenerateMessages enforces non-English language block', () => {
    const outputLanguage = resolveOutputLanguage('text in German about cats');
    const messages = buildAiGenerateMessages({
      trimmedPrompt: 'text in German about cats',
      difficultyLabel: 'beginner',
      toneLabel: 'neutral',
      voice: 'female',
      sentenceTarget: 5,
      outputLanguage,
    });

    expect(messages[0].content).toContain('German');
    expect(messages[0].content).toContain('ONLY');
    expect(messages[1].content).toContain('MANDATORY OUTPUT LANGUAGE: German');
  });
});
