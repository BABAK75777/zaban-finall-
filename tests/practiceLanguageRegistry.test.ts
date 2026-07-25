import { describe, expect, it } from 'vitest';
import {
  PRACTICE_LANGUAGES,
  DICTIONARY_LANGUAGES,
  DEFAULT_PRACTICE_LANGUAGE,
  DEFAULT_TRANSLATION_LANGUAGE,
  migrateLanguageId,
  normalizeLanguageId,
  resolvePracticeLanguage,
  getAiInstruction,
  getTtsLocale,
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

  it('exposes US and UK English as distinct choices', () => {
    const us = resolvePracticeLanguage('en-US');
    const uk = resolvePracticeLanguage('en-GB');
    expect(us?.id).toBe('en-US');
    expect(uk?.id).toBe('en-GB');
    expect(us?.locale).toBe('en-US');
    expect(uk?.locale).toBe('en-GB');
    expect(us?.label).not.toBe(uk?.label);
  });

  it('migrates legacy codes to stable ids', () => {
    expect(migrateLanguageId('en')).toBe('en-US');
    expect(migrateLanguageId('es')).toBe('es-ES');
    expect(migrateLanguageId('fr')).toBe('fr-FR');
    expect(migrateLanguageId('pt')).toBe('pt-BR');
    expect(migrateLanguageId('zh')).toBe('zh-Hans');
    expect(migrateLanguageId('tr')).toBe('tr-TR');
    expect(migrateLanguageId('de')).toBe('de-DE');
    expect(migrateLanguageId('fa')).toBe('fa');
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

  it('keeps regional variants distinct', () => {
    expect(resolvePracticeLanguage('es-ES')?.id).not.toBe(resolvePracticeLanguage('es-MX')?.id);
    expect(resolvePracticeLanguage('pt-BR')?.id).not.toBe(resolvePracticeLanguage('pt-PT')?.id);
    expect(resolvePracticeLanguage('fr-FR')?.id).not.toBe(resolvePracticeLanguage('fr-CA')?.id);
    expect(resolvePracticeLanguage('zh-Hans')?.id).not.toBe(resolvePracticeLanguage('zh-Hant')?.id);
  });

  it('maps TTS and STT locales', () => {
    expect(getTtsLocale('en-US')).toBe('en-US');
    expect(getTtsLocale('en-GB')).toBe('en-GB');
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
