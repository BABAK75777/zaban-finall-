/**
 * @typedef {object} PracticeLanguage
 * @property {string} id
 * @property {string} label
 * @property {string} locale
 * @property {string} baseLanguage
 * @property {string|null} region
 * @property {string} aiInstruction
 * @property {string} ttsLocale
 * @property {string} sttLocale
 * @property {string} [script]
 * @property {string[]} [aliases]
 */

export type PracticeLanguage = {
  id: string;
  label: string;
  locale: string;
  baseLanguage: string;
  region: string | null;
  aiInstruction: string;
  ttsLocale: string;
  sttLocale: string;
  script?: string;
  aliases?: string[];
};

export declare const PRACTICE_LANGUAGES: readonly PracticeLanguage[];
export declare const DICTIONARY_LANGUAGES: readonly { code: string; label: string }[];
export declare const LANGUAGE_BY_CODE: Record<string, { language: string; code: string }>;
export declare const DEFAULT_PRACTICE_LANGUAGE: string;
export declare const DEFAULT_TRANSLATION_LANGUAGE: string;
export declare const DEFAULT_DICTIONARY_LANGUAGE: string;

export declare function normalizeLanguageId(value: unknown): string | null;
export declare function isPracticeLanguageId(value: unknown): boolean;
export declare function isDictionaryLanguageCode(value: unknown): boolean;
export declare function resolvePracticeLanguage(code: unknown): PracticeLanguage | null;
export declare function migrateLanguageId(value: unknown, fallbackId?: string): string;
export declare function resolveDictionaryLanguage(
  code: unknown
): { code: string; label: string } | null;
export declare function getAiInstruction(id: string): string;
export declare function getTtsLocale(id: string): string;
export declare function getSttLocale(id: string): string;
export declare function resolveTtsLocaleWithFallback(
  id: string,
  availableLocales?: string[]
): { locale: string; fellBack: boolean };
