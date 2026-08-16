import { normalizeLookupWord, countWordInText } from './tokenizeSentence';
import type { DictionaryLanguageCode } from './dictionaryLanguages';
import type { DictionaryEntry } from './dictionaryTypes';
import {
  entryMatchesPracticeLanguage,
  migrateEntryPracticeLanguage,
  normalizePracticeLanguageId,
  resolveEntryPracticeLanguage,
} from './entryPracticeLanguage';
import type {
  GrammarHints,
  PartOfSpeech,
  PracticeWordForAi,
  PracticeWordInput,
} from './practiceQueueTypes';

export const MAX_PRACTICE_WORDS = 200;
export const MAX_DUE_WORDS_PER_GENERATION = 8;
export const HARD_MAX_DUE_WORDS_PER_GENERATION = 12;

const LOG_PREFIX = '[PracticeQueue]';

function log(message: string): void {
  console.log(`${LOG_PREFIX} ${message}`);
}

function makeId(word: string, practiceLanguage: string): string {
  return `${practiceLanguage}:${word}`;
}

export function normalizePartOfSpeech(value?: string | null): PartOfSpeech | undefined {
  if (!value) return undefined;
  const lower = value.trim().toLowerCase();
  const map: Record<string, PartOfSpeech> = {
    noun: 'noun',
    n: 'noun',
    verb: 'verb',
    v: 'verb',
    adjective: 'adjective',
    adj: 'adjective',
    adverb: 'adverb',
    adv: 'adverb',
    preposition: 'preposition',
    prep: 'preposition',
    conjunction: 'conjunction',
    conj: 'conjunction',
    pronoun: 'pronoun',
    pron: 'pronoun',
    article: 'article',
    art: 'article',
    unknown: 'unknown',
  };
  return map[lower] ?? 'unknown';
}

/** Ensure legacy entries have practice queue fields. */
export function migrateDictionaryEntry(entry: DictionaryEntry): DictionaryEntry {
  const now = Date.now();
  const withPractice = migrateEntryPracticeLanguage(entry);
  const ownership = resolveEntryPracticeLanguage(withPractice);
  const targetUses = entry.targetUses === 5 ? 5 : 3;
  const usedCount =
    typeof entry.usedCount === 'number'
      ? Math.max(0, entry.usedCount)
      : Math.min(entry.textAppearanceCount ?? 0, targetUses);

  return {
    ...withPractice,
    id:
      withPractice.id ??
      (ownership ? makeId(entry.word, ownership) : makeId(entry.word, entry.targetLanguage)),
    practiceLanguage: ownership ?? withPractice.practiceLanguage,
    targetUses,
    usedCount,
    difficultyStarred: Boolean(entry.difficultyStarred),
    updatedAt: entry.updatedAt ?? entry.savedAt ?? now,
  };
}

export function migrateDictionaryEntries(entries: DictionaryEntry[]): DictionaryEntry[] {
  return entries.map(migrateDictionaryEntry).slice(0, MAX_PRACTICE_WORDS);
}

export function isDuePracticeEntry(entry: DictionaryEntry): boolean {
  const migrated = migrateDictionaryEntry(entry);
  return migrated.usedCount < migrated.targetUses;
}

export function formatPracticeProgress(entry: DictionaryEntry): string {
  const e = migrateDictionaryEntry(entry);
  const star = e.difficultyStarred ? ' ★' : '';
  return `${e.displayWord}${star} ${e.usedCount}/${e.targetUses}`;
}

function isCompleted(entry: DictionaryEntry): boolean {
  const e = migrateDictionaryEntry(entry);
  return e.usedCount >= e.targetUses;
}

function compareDueEntries(a: DictionaryEntry, b: DictionaryEntry): number {
  const ma = migrateDictionaryEntry(a);
  const mb = migrateDictionaryEntry(b);

  if (ma.difficultyStarred !== mb.difficultyStarred) {
    return ma.difficultyStarred ? -1 : 1;
  }

  const aSort = ma.lastUsedAt ?? ma.savedAt;
  const bSort = mb.lastUsedAt ?? mb.savedAt;
  return aSort - bSort;
}

export function selectDueWordsForAi(
  entries: DictionaryEntry[],
  maxCount = MAX_DUE_WORDS_PER_GENERATION,
  practiceLanguage?: DictionaryLanguageCode
): PracticeWordForAi[] {
  const safeMax = Math.min(Math.max(1, maxCount), HARD_MAX_DUE_WORDS_PER_GENERATION);
  const pool = practiceLanguage
    ? entries.filter((e) => entryMatchesPracticeLanguage(e, practiceLanguage))
    : entries;
  const due = pool.filter(isDuePracticeEntry).sort(compareDueEntries);
  const selected = due.slice(0, safeMax);

  log(`selected due words count=${selected.length}`);

  return selected.map((entry) => {
    const e = migrateDictionaryEntry(entry);
    return {
      word: e.word,
      displayWord: e.displayWord,
      partOfSpeech: normalizePartOfSpeech(e.partOfSpeech),
      grammarHints: e.grammarHints,
      usedCount: e.usedCount,
      targetUses: e.targetUses,
      difficultyStarred: e.difficultyStarred,
    };
  });
}

export function buildGrammarHintLine(word: PracticeWordForAi): string {
  const hints: string[] = [];
  const pos = word.partOfSpeech;
  if (pos === 'verb' && word.grammarHints?.verbForms?.length) {
    hints.push(`forms: ${word.grammarHints.verbForms.slice(0, 4).join(', ')}`);
  }
  if (pos === 'noun') {
    if (word.grammarHints?.gender) hints.push(`gender: ${word.grammarHints.gender}`);
    if (word.grammarHints?.nounForms?.length) {
      hints.push(`forms: ${word.grammarHints.nounForms.slice(0, 4).join(', ')}`);
    }
  }
  if (pos === 'adjective' && word.grammarHints?.adjectiveForms?.length) {
    hints.push(`forms: ${word.grammarHints.adjectiveForms.slice(0, 4).join(', ')}`);
  }
  return hints.join('; ');
}

export function buildPracticePromptSection(words: PracticeWordForAi[]): string {
  if (words.length === 0) return '';

  const lines = words.map((w, i) => {
    const pos = w.partOfSpeech ?? 'unknown';
    const grammar = buildGrammarHintLine(w);
    const grammarSuffix = grammar ? ` — ${grammar}` : '';
    return `${i + 1}. ${w.displayWord} — ${pos}${grammarSuffix} — target progress ${w.usedCount}/${w.targetUses}`;
  });

  log(`injected into AI prompt count=${words.length}`);

  return `Practice words for this text:
Use the following learner words naturally in the generated text.
Use each word at least once if possible.
Do not make unnatural sentences.
For verbs, vary tense/form naturally if grammar data is available.
For nouns/adjectives, respect gender/number/agreement if relevant.
Words:
${lines.join('\n')}`;
}

export function wordAppearsInGeneratedText(word: string, fullText: string): boolean {
  return countWordInText(word, fullText) > 0;
}

function evictOneEntry(entries: DictionaryEntry[]): DictionaryEntry[] {
  if (entries.length <= MAX_PRACTICE_WORDS) return entries;

  const completed = entries
    .filter(isCompleted)
    .sort((a, b) => migrateDictionaryEntry(a).updatedAt - migrateDictionaryEntry(b).updatedAt);

  if (completed.length > 0) {
    const victim = completed[0];
    log(
      `evicted completed word=${victim.word} to make room (queue at ${entries.length})`
    );
    return entries.filter((e) => {
      if (e.word !== victim.word) return true;
      const victimLang = resolveEntryPracticeLanguage(victim);
      const entryLang = resolveEntryPracticeLanguage(e);
      return victimLang !== entryLang;
    });
  }

  const oldest = [...entries].sort(
    (a, b) => migrateDictionaryEntry(a).savedAt - migrateDictionaryEntry(b).savedAt
  )[0];
  log(`evicted oldest active word=${oldest.word} to make room (queue at ${entries.length})`);
  return entries.filter((e) => {
    if (e.word !== oldest.word) return true;
    const oldestLang = resolveEntryPracticeLanguage(oldest);
    const entryLang = resolveEntryPracticeLanguage(e);
    return oldestLang !== entryLang;
  });
}

export type AddMeaningWordOptions = {
  /** True when user looked up a word already in the practice queue. */
  meaningAskedAgain?: boolean;
};

/**
 * User asked meaning — add or update practice queue entry.
 * Re-asking meaning upgrades 3→5 or resets 5-use cycle.
 */
export function addMeaningWord(
  entries: DictionaryEntry[],
  input: PracticeWordInput,
  options: AddMeaningWordOptions = {}
): DictionaryEntry[] {
  const key = normalizeLookupWord(input.displayWord);
  if (!key) return entries;

  const now = Date.now();
  const practiceLanguage = normalizePracticeLanguageId(input.practiceLanguage);
  const existing = entries.find(
    (e) => e.word === key && entryMatchesPracticeLanguage(e, practiceLanguage)
  );

  if (!existing) {
    const entry: DictionaryEntry = {
      id: makeId(key, practiceLanguage),
      word: key,
      displayWord: input.displayWord.trim() || key,
      meaning: input.meaning,
      partOfSpeech: input.partOfSpeech ?? undefined,
      practiceLanguage,
      targetLanguage: practiceLanguage,
      savedAt: now,
      lookupCount: 1,
      targetUses: 3,
      usedCount: 0,
      difficultyStarred: false,
      grammarHints: input.grammarHints,
      updatedAt: now,
      lastMeaningAskedAt: now,
      textAppearanceCount: 0,
    };

    log(`added word=${key}`);
    const next = [entry, ...entries];
    return evictOneEntry(next).slice(0, MAX_PRACTICE_WORDS);
  }

  const migrated = migrateDictionaryEntry(existing);
  let targetUses = migrated.targetUses;
  let usedCount = migrated.usedCount;
  let difficultyStarred = migrated.difficultyStarred;

  if (options.meaningAskedAgain) {
    if (targetUses === 3) {
      targetUses = 5;
      difficultyStarred = true;
      log(`meaning asked again word=${key} targetUses=5 (upgraded from 3)`);
    } else {
      usedCount = 0;
      targetUses = 5;
      difficultyStarred = true;
      log(`meaning asked again word=${key} targetUses=5 (cycle reset)`);
    }
  }

  const updated: DictionaryEntry = {
    ...migrated,
    displayWord: input.displayWord.trim() || migrated.displayWord,
    meaning: input.meaning || migrated.meaning,
    partOfSpeech: input.partOfSpeech ?? migrated.partOfSpeech,
    grammarHints: input.grammarHints ?? migrated.grammarHints,
    lookupCount: migrated.lookupCount + 1,
    targetUses,
    usedCount,
    difficultyStarred,
    updatedAt: now,
    lastMeaningAskedAt: now,
  };

  log(`updated existing word=${key}`);

  return entries.map((e) =>
    e.word === key && entryMatchesPracticeLanguage(e, practiceLanguage) ? updated : e
  );
}

/** After successful AI generation — increment usedCount for words that appeared. */
export function recordPracticeUsageAfterAiGeneration(
  entries: DictionaryEntry[],
  generatedText: string,
  injectedWords: PracticeWordForAi[]
): DictionaryEntry[] {
  if (!generatedText.trim() || injectedWords.length === 0) return entries;

  const preview =
    generatedText.length > 80 ? `${generatedText.slice(0, 80)}…` : generatedText;
  log(`AI generated text length=${generatedText.length} preview="${preview}"`);

  const injectedKeys = new Set(injectedWords.map((w) => w.word));
  let matched = 0;
  const now = Date.now();

  let next = entries.map((entry) => {
    if (!injectedKeys.has(entry.word)) return entry;
    if (!wordAppearsInGeneratedText(entry.displayWord, generatedText)) return entry;

    const e = migrateDictionaryEntry(entry);
    if (!isDuePracticeEntry(e)) return entry;

    matched += 1;
    const newUsed = e.usedCount + 1;
    log(`increment word=${e.word} usedCount=${newUsed} targetUses=${e.targetUses}`);

    if (newUsed >= e.targetUses) {
      log(`completed word=${e.word}`);
      return null;
    }

    return {
      ...e,
      usedCount: newUsed,
      lastUsedAt: now,
      updatedAt: now,
    };
  });

  next = next.filter((e): e is DictionaryEntry => e != null);
  log(`matched used words count=${matched}`);
  return next;
}

export function logPracticeQueueLoaded(count: number): void {
  log(`loaded count=${count}`);
}

export function logPracticeQueueSaved(count: number): void {
  log(`saved count=${count}`);
}

export function logPracticeQueueStorageError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  log(`storage error=${message}`);
}

/** @internal test helper — create empty queue entry shell */
export function createPracticeEntry(
  word: string,
  overrides: Partial<DictionaryEntry> = {}
): DictionaryEntry {
  const key = normalizeLookupWord(word);
  const now = Date.now();
  const practiceLanguage = normalizePracticeLanguageId(
    overrides.practiceLanguage ?? overrides.targetLanguage ?? 'en-US'
  );
  return migrateDictionaryEntry({
    id: makeId(key, practiceLanguage),
    word: key,
    displayWord: word,
    meaning: '',
    practiceLanguage,
    targetLanguage: practiceLanguage,
    savedAt: now,
    lookupCount: 0,
    textAppearanceCount: 0,
    ...overrides,
  });
}
