export {
  DICTIONARY_LANGUAGES,
  DEFAULT_DICTIONARY_LANGUAGE,
  dictionaryLanguageLabel,
  isDictionaryLanguageCode,
} from './dictionaryLanguages';
export type { DictionaryLanguageCode } from './dictionaryLanguages';
export type {
  DictionaryEntry,
  DictionarySettingsV1,
  DictionaryStoreV1,
  WordLookupResult,
} from './dictionaryTypes';
export {
  DICTIONARY_STORE_KEY,
  defaultDictionarySettings,
  findDictionaryEntry,
  incrementLookupCount,
  removeDictionaryEntry,
  addManualDictionaryEntry,
  recordWordInReadingText,
  removePracticeWordsUsedInAiText,
  shouldRemoveWordAfterAiPractice,
  AI_PRACTICE_MIN_SENTENCES,
  AI_PRACTICE_MIN_OCCURRENCES,
  AI_PRACTICE_MAX_OCCURRENCES,
  getPracticeWordsForAi,
  loadDictionaryStore,
  saveDictionaryStore,
  updateDictionarySettings,
  upsertDictionaryEntry,
} from './dictionaryStorage';
export { requestWordLookup } from './dictionaryApi';
export {
  countWordInText,
  countSentencesWithWord,
  splitTextIntoSentences,
  hashReadingText,
  normalizeLookupWord,
  tokenizeSentence,
} from './tokenizeSentence';
export type { SentenceToken } from './tokenizeSentence';
