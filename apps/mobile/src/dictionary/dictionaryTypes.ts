import type { DictionaryLanguageCode } from './dictionaryLanguages';
import type { GrammarHints } from './practiceQueueTypes';

export interface DictionaryEntry {
  /** Stable practice queue id (language + normalized word). */
  id?: string;
  /** Normalized lookup key (lowercase). */
  word: string;
  /** Display form as tapped on screen. */
  displayWord: string;
  meaning: string;
  partOfSpeech?: string;
  /**
   * Practice language this saved word belongs to (en-US, tr-TR, …).
   * Never the Dictionary translation/meanings language.
   */
  practiceLanguage?: DictionaryLanguageCode;
  /** @deprecated Legacy partition key; prefer practiceLanguage. */
  targetLanguage: DictionaryLanguageCode;
  savedAt: number;
  lookupCount: number;
  /** Practice queue: target appearances across separate AI texts. */
  targetUses?: 3 | 5;
  usedCount?: number;
  difficultyStarred?: boolean;
  grammarHints?: GrammarHints;
  updatedAt?: number;
  lastMeaningAskedAt?: number;
  lastUsedAt?: number;
  /** Legacy — migrated into usedCount when missing. */
  textAppearanceCount: number;
  seenTextHashes?: string[];
}

export interface DictionarySettingsV1 {
  version: 1;
  /**
   * Practice / content language for AI generation and TTS (stable registry id).
   * Never inferred from device/UI language.
   */
  practiceLanguage: DictionaryLanguageCode;
  /** Language used when showing word meanings on tap (may differ from practice). */
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
  blocked?: boolean;
  userMessage?: string;
}
