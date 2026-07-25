import {
  DEFAULT_DICTIONARY_LANGUAGE,
  DEFAULT_PRACTICE_LANGUAGE,
  DEFAULT_TRANSLATION_LANGUAGE,
  DICTIONARY_LANGUAGES,
  PRACTICE_LANGUAGES,
  getAiInstruction,
  getSttLocale,
  getTtsLocale,
  isDictionaryLanguageCode,
  isPracticeLanguageId,
  migrateLanguageId,
  normalizeLanguageId,
  resolveDictionaryLanguage,
  resolvePracticeLanguage,
  resolveTtsLocaleWithFallback,
} from '@zaban/dictionary-languages';

export {
  DEFAULT_DICTIONARY_LANGUAGE,
  DEFAULT_PRACTICE_LANGUAGE,
  DEFAULT_TRANSLATION_LANGUAGE,
  DICTIONARY_LANGUAGES,
  PRACTICE_LANGUAGES,
  getAiInstruction,
  getSttLocale,
  getTtsLocale,
  isDictionaryLanguageCode,
  isPracticeLanguageId,
  migrateLanguageId,
  normalizeLanguageId,
  resolveDictionaryLanguage,
  resolvePracticeLanguage,
  resolveTtsLocaleWithFallback,
};

export type DictionaryLanguageCode = (typeof PRACTICE_LANGUAGES)[number]['id'];

export function dictionaryLanguageLabel(code: DictionaryLanguageCode | string): string {
  return resolveDictionaryLanguage(code)?.label ?? String(code);
}
