import type { DictionaryLanguageCode } from './dictionaryLanguages';

export interface DictionaryEntry {
  /** Normalized lookup key (lowercase). */
  word: string;
  /** Display form as tapped on screen. */
  displayWord: string;
  meaning: string;
  partOfSpeech?: string;
  targetLanguage: DictionaryLanguageCode;
  savedAt: number;
  lookupCount: number;
  /** Distinct reading texts / AI generations where this word appeared. */
  textAppearanceCount: number;
  seenTextHashes?: string[];
}

export interface DictionarySettingsV1 {
  version: 1;
  /** Language used when showing word meanings on tap. */
  translationLanguage: DictionaryLanguageCode;
  /** Save words to personal dictionary when user looks them up. */
  saveWordsOnLookup: boolean;
  /** Include saved dictionary words when generating AI practice text. */
  useDictionaryInAi: boolean;
}

export interface DictionaryStoreV1 {
  version: 1;
  settings: DictionarySettingsV1;
  entries: DictionaryEntry[];
}

export interface WordLookupResult {
  word: string;
  meaning: string;
  partOfSpeech?: string | null;
  targetLanguage: DictionaryLanguageCode;
  fromCache?: boolean;
}
