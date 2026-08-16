/**
 * Product availability for Practice/AI and Dictionary languages.
 * Full registry stays in @zaban/dictionary-languages; this layer controls
 * what users can see and what may be processed.
 */

import {
  DEFAULT_PRACTICE_LANGUAGE,
  DEFAULT_TRANSLATION_LANGUAGE,
  isAiGenerationLanguageId,
  migrateAiGenerationLanguageId,
  migrateLanguageId,
  normalizeLanguageId,
  resolvePracticeLanguage,
  resolveDictionaryLanguage,
} from './dictionaryLanguages';

export type LanguageProductStatus = 'active' | 'in_progress' | 'hidden';

export const IN_PROGRESS_DIALOG_TITLE = 'In Progress';
export const IN_PROGRESS_DIALOG_MESSAGE = "Sorry, this language isn’t available yet.";
export const IN_PROGRESS_DIALOG_BUTTON = 'OK';
export const IN_PROGRESS_BADGE_LABEL = 'In Progress';

/** Known site origin from onboarding; exact language-request form path is not in the repo. */
export const MAMLIO_WEBSITE_URL = 'https://www.mamlio.com';
export const LANGUAGE_REQUEST_CTA_LABEL = 'Request a language at mamlio.com';

type AvailabilityEntry = {
  id: string;
  status: Exclude<LanguageProductStatus, 'hidden'>;
  /** Optional UI label override (registry label otherwise). */
  displayLabel?: string;
};

/** Product order for Practice / AI Generation Language picker. */
const PRACTICE_PRODUCT_ENTRIES: AvailabilityEntry[] = [
  { id: 'en-US', status: 'active' },
  { id: 'tr-TR', status: 'active', displayLabel: 'Turkish — Istanbul' },
  { id: 'fr-FR', status: 'in_progress' },
  { id: 'de-DE', status: 'in_progress' },
  { id: 'ru-RU', status: 'in_progress' },
  { id: 'en-GB', status: 'in_progress' },
  { id: 'it-IT', status: 'in_progress' },
  { id: 'es-ES', status: 'in_progress' },
];

/** Product order for Dictionary translation language picker. */
const DICTIONARY_PRODUCT_ENTRIES: AvailabilityEntry[] = [
  { id: 'en-US', status: 'active' },
  { id: 'tr-TR', status: 'active', displayLabel: 'Turkish — Istanbul' },
  { id: 'fa', status: 'active' },
  { id: 'fr-FR', status: 'in_progress' },
  { id: 'de-DE', status: 'in_progress' },
  { id: 'ru-RU', status: 'in_progress' },
  { id: 'en-GB', status: 'in_progress' },
  { id: 'it-IT', status: 'in_progress' },
  { id: 'es-ES', status: 'in_progress' },
];

const PRACTICE_STATUS = new Map(PRACTICE_PRODUCT_ENTRIES.map((e) => [e.id, e]));
const DICTIONARY_STATUS = new Map(DICTIONARY_PRODUCT_ENTRIES.map((e) => [e.id, e]));

export type VisibleLanguageOption = {
  id: string;
  label: string;
  status: 'active' | 'in_progress';
};

function labelFor(id: string, override?: string): string {
  if (override) return override;
  return (
    resolvePracticeLanguage(id)?.label ??
    resolveDictionaryLanguage(id)?.label ??
    id
  );
}

export function getVisiblePracticeLanguages(): VisibleLanguageOption[] {
  return PRACTICE_PRODUCT_ENTRIES.map((e) => ({
    id: e.id,
    label: labelFor(e.id, e.displayLabel),
    status: e.status,
  }));
}

export function getVisibleDictionaryLanguages(): VisibleLanguageOption[] {
  return DICTIONARY_PRODUCT_ENTRIES.map((e) => ({
    id: e.id,
    label: labelFor(e.id, e.displayLabel),
    status: e.status,
  }));
}

export function getPracticeLanguageProductStatus(
  languageId: string | null | undefined
): LanguageProductStatus {
  if (languageId == null || String(languageId).trim() === '') {
    return PRACTICE_STATUS.get(DEFAULT_PRACTICE_LANGUAGE)?.status ?? 'hidden';
  }
  const raw = String(languageId).trim();
  // Prefer real registry normalization — do NOT use migrateLanguageId(raw, raw), which
  // collapses unknown ids (e.g. ja-JP) onto DEFAULT_PRACTICE_LANGUAGE.
  const normalized = normalizeLanguageId(raw);
  const candidate =
    normalized ?? (isAiGenerationLanguageId(raw) ? raw : null);
  if (candidate && PRACTICE_STATUS.has(candidate)) {
    return PRACTICE_STATUS.get(candidate)!.status;
  }
  if (candidate && isAiGenerationLanguageId(candidate)) {
    return 'hidden';
  }
  return 'hidden';
}

export function getDictionaryLanguageProductStatus(
  languageId: string | null | undefined
): LanguageProductStatus {
  if (languageId == null || String(languageId).trim() === '') {
    return DICTIONARY_STATUS.get(DEFAULT_TRANSLATION_LANGUAGE)?.status ?? 'hidden';
  }
  const raw = String(languageId).trim();
  const normalized = normalizeLanguageId(raw);
  const candidate = normalized ?? raw;
  if (DICTIONARY_STATUS.has(candidate)) {
    return DICTIONARY_STATUS.get(candidate)!.status;
  }
  return 'hidden';
}

/** True only for product-active Practice/AI languages that may be processed. */
export function isPracticeLanguageProductActive(
  languageId: string | null | undefined
): boolean {
  return getPracticeLanguageProductStatus(languageId) === 'active';
}

export function isDictionaryLanguageProductActive(
  languageId: string | null | undefined
): boolean {
  return getDictionaryLanguageProductStatus(languageId) === 'active';
}

/**
 * Central guard: normalize to an active Practice language or fall back to default.
 * Never returns an in_progress / hidden id.
 */
export function ensureProcessablePracticeLanguage(
  languageId: string | null | undefined
): string {
  if (isPracticeLanguageProductActive(languageId)) {
    return migrateAiGenerationLanguageId(languageId, DEFAULT_PRACTICE_LANGUAGE);
  }
  return DEFAULT_PRACTICE_LANGUAGE;
}

export function ensureProcessableDictionaryLanguage(
  languageId: string | null | undefined
): string {
  if (isDictionaryLanguageProductActive(languageId)) {
    return migrateLanguageId(languageId, DEFAULT_TRANSLATION_LANGUAGE);
  }
  return DEFAULT_TRANSLATION_LANGUAGE;
}

export type PracticeLanguageGuardResult =
  | { allowed: true; languageId: string }
  | { allowed: false; languageId: string; reason: 'unavailable' };

/** Deterministic Practice-language processing gate (AI / regenerate). */
export function assertPracticeLanguageProcessable(
  languageId: string | null | undefined
): PracticeLanguageGuardResult {
  const status = getPracticeLanguageProductStatus(languageId);
  if (status === 'active') {
    const migrated = migrateAiGenerationLanguageId(languageId, DEFAULT_PRACTICE_LANGUAGE);
    return { allowed: true, languageId: migrated };
  }
  const normalized = normalizeLanguageId(String(languageId ?? '').trim());
  return {
    allowed: false,
    languageId: normalized ?? String(languageId ?? ''),
    reason: 'unavailable',
  };
}

export function practiceLanguageDisplayLabel(languageId: string): string {
  const entry = PRACTICE_STATUS.get(
    migrateAiGenerationLanguageId(languageId, DEFAULT_PRACTICE_LANGUAGE)
  );
  return labelFor(languageId, entry?.displayLabel);
}

export function dictionaryLanguageDisplayLabel(languageId: string): string {
  const entry = DICTIONARY_STATUS.get(
    migrateLanguageId(languageId, DEFAULT_TRANSLATION_LANGUAGE)
  );
  return labelFor(languageId, entry?.displayLabel);
}
