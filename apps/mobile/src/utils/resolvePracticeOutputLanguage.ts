import {
  resolvePracticeLanguage,
  migrateLanguageId,
  DEFAULT_PRACTICE_LANGUAGE,
  type DictionaryLanguageCode,
} from '../dictionary/dictionaryLanguages';
import {
  ensureProcessablePracticeLanguage,
  practiceLanguageDisplayLabel,
} from '../dictionary/languageAvailability';
import type { ResolvedLanguage } from './resolveOutputLanguage';

export type { ResolvedLanguage };

/**
 * Selected practice language is authoritative for AI content.
 * Prompt text must never override the user's selection (avoids Persian when English is selected).
 * Unavailable / In Progress product languages coerce to the active default.
 */
export function resolvePracticeOutputLanguage(
  _prompt: string,
  practiceLanguage: DictionaryLanguageCode | string
): ResolvedLanguage {
  const id = ensureProcessablePracticeLanguage(
    migrateLanguageId(practiceLanguage, DEFAULT_PRACTICE_LANGUAGE)
  );
  const lang = resolvePracticeLanguage(id);
  if (lang) {
    return {
      language: practiceLanguageDisplayLabel(id),
      code: lang.id,
      explicit: true,
    };
  }
  const fallback = resolvePracticeLanguage(DEFAULT_PRACTICE_LANGUAGE)!;
  return {
    language: practiceLanguageDisplayLabel(fallback.id),
    code: fallback.id,
    explicit: false,
  };
}

export function logDictionaryLanguageSelection(code: DictionaryLanguageCode | string): void {
  const id = migrateLanguageId(code, DEFAULT_PRACTICE_LANGUAGE);
  const lang = resolvePracticeLanguage(id);
  console.log(
    `[LANGUAGE:DICTIONARY] selectedTarget=${lang?.label ?? id} code=${id}`
  );
}

export function logPracticeLanguageSelection(code: DictionaryLanguageCode | string): void {
  const id = migrateLanguageId(code, DEFAULT_PRACTICE_LANGUAGE);
  const lang = resolvePracticeLanguage(id);
  console.log(`[LANGUAGE:PRACTICE] selectedTarget=${lang?.label ?? id} code=${id}`);
}
