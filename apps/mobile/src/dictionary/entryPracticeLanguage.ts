/**
 * Practice-language ownership for saved dictionary words.
 * Separate from translationLanguage (meanings output on lookup).
 */

import {
  DEFAULT_PRACTICE_LANGUAGE,
  migrateAiGenerationLanguageId,
  migrateLanguageId,
  type DictionaryLanguageCode,
} from './dictionaryLanguages';
import {
  ensureProcessablePracticeLanguage,
  isPracticeLanguageProductActive,
} from './languageAvailability';
import type { DictionaryEntry } from './dictionaryTypes';

/** Resolve canonical practice-language id stored on an entry, if known. */
export function resolveEntryPracticeLanguage(
  entry: DictionaryEntry
): DictionaryLanguageCode | undefined {
  if (entry.practiceLanguage) {
    const migrated = migrateAiGenerationLanguageId(
      entry.practiceLanguage,
      DEFAULT_PRACTICE_LANGUAGE
    );
    if (isPracticeLanguageProductActive(migrated)) {
      return migrated as DictionaryLanguageCode;
    }
  }

  const candidates = [entry.targetLanguage, migrateLanguageId(entry.targetLanguage, entry.targetLanguage)];
  for (const candidate of candidates) {
    if (!candidate || !isPracticeLanguageProductActive(candidate)) continue;
    return migrateAiGenerationLanguageId(
      candidate,
      DEFAULT_PRACTICE_LANGUAGE
    ) as DictionaryLanguageCode;
  }

  // Legacy translation-keyed records (fa, fr, …) — practice ownership unknown.
  return undefined;
}

export function normalizePracticeLanguageId(
  languageId: string | null | undefined
): DictionaryLanguageCode {
  return ensureProcessablePracticeLanguage(languageId) as DictionaryLanguageCode;
}

export function entryMatchesPracticeLanguage(
  entry: DictionaryEntry,
  practiceLanguage: DictionaryLanguageCode
): boolean {
  const ownership = resolveEntryPracticeLanguage(entry);
  if (!ownership) return false;
  const wanted = normalizePracticeLanguageId(practiceLanguage);
  return ownership === wanted;
}

/** Ensure persisted entries carry practiceLanguage when ownership is known. */
export function migrateEntryPracticeLanguage(entry: DictionaryEntry): DictionaryEntry {
  const ownership = resolveEntryPracticeLanguage(entry);
  if (!ownership) return entry;
  return {
    ...entry,
    practiceLanguage: ownership,
    id: entry.id ?? `${ownership}:${entry.word}`,
  };
}
