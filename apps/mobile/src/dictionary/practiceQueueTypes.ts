import type { DictionaryLanguageCode } from './dictionaryLanguages';

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'article'
  | 'unknown';

export interface GrammarHints {
  gender?: 'masculine' | 'feminine' | 'neutral' | 'unknown';
  number?: 'singular' | 'plural' | 'unknown';
  verbForms?: string[];
  nounForms?: string[];
  adjectiveForms?: string[];
  adverbForms?: string[];
}

/** Practice queue item — stored inside DictionaryEntry (single source of truth). */
export type PracticeWord = {
  id: string;
  word: string;
  normalizedWord: string;
  meaning?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  partOfSpeech?: PartOfSpeech;
  grammarHints?: GrammarHints;
  targetUses: 3 | 5;
  usedCount: number;
  difficultyStarred: boolean;
  createdAt: number;
  updatedAt: number;
  lastMeaningAskedAt?: number;
  lastUsedAt?: number;
};

/** Compact payload for AI prompt injection. */
export type PracticeWordForAi = {
  word: string;
  displayWord: string;
  partOfSpeech?: PartOfSpeech;
  grammarHints?: GrammarHints;
  usedCount: number;
  targetUses: 3 | 5;
  difficultyStarred: boolean;
};

export type PracticeWordInput = {
  displayWord: string;
  meaning: string;
  partOfSpeech?: string | null;
  /** Practice language ownership (en-US, tr-TR). Not translationLanguage. */
  practiceLanguage: DictionaryLanguageCode;
  grammarHints?: GrammarHints;
};
