export {
  DICTIONARY_LANGUAGES,
  PRACTICE_LANGUAGES,
  DEFAULT_DICTIONARY_LANGUAGE,
  DEFAULT_PRACTICE_LANGUAGE,
  DEFAULT_TRANSLATION_LANGUAGE,
  dictionaryLanguageLabel,
  isDictionaryLanguageCode,
  migrateLanguageId,
  resolvePracticeLanguage,
  getTtsLocale,
  getSttLocale,
  resolveTtsLocaleWithFallback,
} from './dictionaryLanguages';
export type { DictionaryLanguageCode } from './dictionaryLanguages';
export type {
  DictionaryEntry,
  DictionarySettingsV1,
  DictionaryStoreV1,
  WordLookupResult,
} from './dictionaryTypes';
export type {
  GrammarHints,
  PartOfSpeech,
  PracticeWord,
  PracticeWordForAi,
  PracticeWordInput,
} from './practiceQueueTypes';
export {
  MAX_PRACTICE_WORDS,
  MAX_DUE_WORDS_PER_GENERATION,
  HARD_MAX_DUE_WORDS_PER_GENERATION,
  addMeaningWord,
  buildPracticePromptSection,
  formatPracticeProgress,
  isDuePracticeEntry,
  migrateDictionaryEntries,
  migrateDictionaryEntry,
  recordPracticeUsageAfterAiGeneration,
  selectDueWordsForAi,
  wordAppearsInGeneratedText,
  normalizePartOfSpeech,
} from './practiceQueue';
export {
  DICTIONARY_STORE_KEY,
  defaultDictionarySettings,
  normalizeDictionarySettings,
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
  mutateDictionaryStore,
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
