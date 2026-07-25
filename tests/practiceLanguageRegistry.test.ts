import { describe, expect, it } from 'vitest';
import {
  PRACTICE_LANGUAGES,
  DICTIONARY_LANGUAGES,
  AI_GENERATION_LANGUAGE_IDS,
  AI_GENERATION_LANGUAGES,
  DEFAULT_PRACTICE_LANGUAGE,
  DEFAULT_TRANSLATION_LANGUAGE,
  migrateLanguageId,
  migrateAiGenerationLanguageId,
  normalizeLanguageId,
  resolvePracticeLanguage,
  getAiGenerationLanguages,
  getAiInstruction,
  getTtsLocale,
  getTtsInstruction,
  getSttLocale,
  resolveTtsLocaleWithFallback,
} from '../packages/dictionary-languages/index.js';

describe('practice language registry', () => {
  it('has unique stable ids', () => {
    const ids = PRACTICE_LANGUAGES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has label, locale, aiInstruction, tts and stt locales', () => {
    for (const lang of PRACTICE_LANGUAGES) {
      expect(lang.label.trim().length).toBeGreaterThan(0);
      expect(lang.locale.trim().length).toBeGreaterThan(0);
      expect(lang.aiInstruction.trim().length).toBeGreaterThan(0);
      expect(lang.ttsLocale.trim().length).toBeGreaterThan(0);
      expect(lang.sttLocale.trim().length).toBeGreaterThan(0);
      expect(lang.baseLanguage.trim().length).toBeGreaterThan(0);
    }
  });

  it('exposes exactly 29 AI generation languages alphabetically', () => {
    const list = getAiGenerationLanguages();
    expect(list).toHaveLength(29);
    expect(AI_GENERATION_LANGUAGE_IDS).toHaveLength(29);
    expect(AI_GENERATION_LANGUAGES).toHaveLength(29);
    const labels = list.map((l) => l.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'en')));
    expect(labels).toEqual([
      'Bulgarian',
      'Chinese',
      'Croatian',
      'Czech',
      'Danish',
      'Dutch',
      'English — United Kingdom',
      'English — United States',
      'Finnish',
      'French',
      'German',
      'Greek',
      'Hungarian',
      'Icelandic',
      'Italian',
      'Japanese',
      'Korean',
      'Norwegian',
      'Polish',
      'Portuguese',
      'Romanian',
      'Russian',
      'Serbian',
      'Slovak',
      'Slovenian',
      'Spanish',
      'Swedish',
      'Turkish',
      'Ukrainian',
    ]);
    expect(labels.filter((l) => l.includes('Canada')).length).toBe(0);
    expect(labels.filter((l) => l.includes('Mexico')).length).toBe(0);
    expect(labels.filter((l) => l.includes('Brazil')).length).toBe(0);
    expect(labels.filter((l) => l.includes('Portugal')).length).toBe(0);
    expect(labels.filter((l) => l.includes('Simplified')).length).toBe(0);
    expect(labels.filter((l) => l.includes('Traditional')).length).toBe(0);
    const ids = list.map((l) => l.id);
    expect(new Set(ids).size).toBe(29);
  });

  it('exposes US and UK English as distinct choices', () => {
    const us = resolvePracticeLanguage('en-US');
    const uk = resolvePracticeLanguage('en-GB');
    expect(us?.id).toBe('en-US');
    expect(uk?.id).toBe('en-GB');
    expect(us?.locale).toBe('en-US');
    expect(uk?.locale).toBe('en-GB');
    expect(us?.label).not.toBe(uk?.label);
  });

  it('migrates legacy and regional codes to stable canonical ids', () => {
    expect(migrateLanguageId('en')).toBe('en-US');
    expect(migrateLanguageId('es')).toBe('es-ES');
    expect(migrateLanguageId('fr')).toBe('fr-FR');
    expect(migrateLanguageId('pt')).toBe('pt-BR');
    expect(migrateLanguageId('zh')).toBe('zh-Hans');
    expect(migrateLanguageId('tr')).toBe('tr-TR');
    expect(migrateLanguageId('de')).toBe('de-DE');
    expect(migrateLanguageId('fa')).toBe('fa');
    expect(migrateLanguageId('fr-CA')).toBe('fr-FR');
    expect(migrateLanguageId('es-MX')).toBe('es-ES');
    expect(migrateLanguageId('pt-PT')).toBe('pt-BR');
    expect(migrateLanguageId('zh-Hant')).toBe('zh-Hans');
  });

  it('migrates non-picker practice languages onto AI visible set', () => {
    expect(migrateAiGenerationLanguageId('fa')).toBe('en-US');
    expect(migrateAiGenerationLanguageId('ga-IE')).toBe('en-US');
    expect(migrateAiGenerationLanguageId('fr-CA')).toBe('fr-FR');
    expect(migrateAiGenerationLanguageId('en-GB')).toBe('en-GB');
  });

  it('falls back safely for invalid stored values', () => {
    expect(migrateLanguageId('nope', DEFAULT_PRACTICE_LANGUAGE)).toBe('en-US');
    expect(migrateLanguageId(null, DEFAULT_TRANSLATION_LANGUAGE)).toBe('fa');
    expect(normalizeLanguageId('')).toBeNull();
  });

  it('US instruction requests American spelling', () => {
    const text = getAiInstruction('en-US').toLowerCase();
    expect(text).toContain('american');
    expect(text).toContain('color');
    expect(text).toContain('favorite');
    expect(text).toContain('apartment');
    expect(text).toContain('do not use british spellings');
  });

  it('UK instruction requests British spelling', () => {
    const text = getAiInstruction('en-GB').toLowerCase();
    expect(text).toContain('british');
    expect(text).toContain('colour');
    expect(text).toContain('favourite');
    expect(text).toContain('flat');
  });

  it('maps TTS and STT locales with distinct US/UK accents', () => {
    expect(getTtsLocale('en-US')).toBe('en-US');
    expect(getTtsLocale('en-GB')).toBe('en-GB');
    expect(getTtsInstruction('en-US').toLowerCase()).toContain('american');
    expect(getTtsInstruction('en-GB').toLowerCase()).toContain('british');
    expect(getTtsInstruction('en-US')).not.toBe(getTtsInstruction('en-GB'));
    expect(getSttLocale('ko-KR')).toBe('ko-KR');
    expect(getTtsLocale('tr-TR')).toBe('tr-TR');
  });

  it('falls back TTS locale without crashing when voice missing', () => {
    const result = resolveTtsLocaleWithFallback('en-GB', ['en-US', 'de-DE']);
    expect(result.fellBack).toBe(true);
    expect(result.locale).toBe('en-US');
    const exact = resolveTtsLocaleWithFallback('en-GB', ['en-GB', 'en-US']);
    expect(exact).toEqual({ locale: 'en-GB', fellBack: false });
  });

  it('DICTIONARY_LANGUAGES mirrors registry ids', () => {
    expect(DICTIONARY_LANGUAGES.map((l) => l.code)).toEqual(
      PRACTICE_LANGUAGES.map((l) => l.id)
    );
  });
});
