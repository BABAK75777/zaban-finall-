import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PRACTICE_LANGUAGE,
  DEFAULT_TRANSLATION_LANGUAGE,
  isDictionaryLanguageCode,
  migrateLanguageId,
  type DictionaryLanguageCode,
} from './dictionaryLanguages';
import type { DictionaryEntry, DictionarySettingsV1, DictionaryStoreV1 } from './dictionaryTypes';
import {
  MAX_PRACTICE_WORDS,
  migrateDictionaryEntries,
  logPracticeQueueLoaded,
  logPracticeQueueSaved,
  logPracticeQueueStorageError,
  selectDueWordsForAi,
  recordPracticeUsageAfterAiGeneration,
} from './practiceQueue';
import {
  countWordInText,
  normalizeLookupWord,
} from './tokenizeSentence';

export const DICTIONARY_STORE_KEY = '@zaban/dictionary_v1';

/** @deprecated Use practice queue usedCount/targetUses instead. */
export const AI_PRACTICE_MIN_SENTENCES = 3;
/** @deprecated Use practice queue usedCount/targetUses instead. */
export const AI_PRACTICE_MIN_OCCURRENCES = 4;
/** @deprecated Use practice queue usedCount/targetUses instead. */
export const AI_PRACTICE_MAX_OCCURRENCES = 6;

export function defaultDictionarySettings(): DictionarySettingsV1 {
  return {
    version: 1,
    practiceLanguage: DEFAULT_PRACTICE_LANGUAGE,
    translationLanguage: DEFAULT_TRANSLATION_LANGUAGE,
    saveWordsOnLookup: true,
    useDictionaryInAi: true,
  };
}

/** Normalize settings from storage, migrating legacy single-language field. */
export function normalizeDictionarySettings(
  settings: Partial<DictionarySettingsV1> | null | undefined
): DictionarySettingsV1 {
  const defaults = defaultDictionarySettings();
  const legacyTranslation = (settings as { translationLanguage?: unknown } | null | undefined)
    ?.translationLanguage;
  const rawPractice = (settings as { practiceLanguage?: unknown } | null | undefined)
    ?.practiceLanguage;

  // Legacy stores only had translationLanguage; that value drove AI too — preserve both.
  const practiceLanguage = migrateLanguageId(
    rawPractice ?? legacyTranslation,
    DEFAULT_PRACTICE_LANGUAGE
  ) as DictionaryLanguageCode;

  const translationLanguage = migrateLanguageId(
    legacyTranslation,
    DEFAULT_TRANSLATION_LANGUAGE
  ) as DictionaryLanguageCode;

  return {
    version: 1,
    practiceLanguage: isDictionaryLanguageCode(practiceLanguage)
      ? practiceLanguage
      : defaults.practiceLanguage,
    translationLanguage: isDictionaryLanguageCode(translationLanguage)
      ? translationLanguage
      : defaults.translationLanguage,
    saveWordsOnLookup:
      settings?.saveWordsOnLookup === undefined
        ? defaults.saveWordsOnLookup
        : Boolean(settings.saveWordsOnLookup),
    useDictionaryInAi:
      settings?.useDictionaryInAi === undefined
        ? defaults.useDictionaryInAi
        : Boolean(settings.useDictionaryInAi),
  };
}

function defaultStore(): DictionaryStoreV1 {
  return {
    version: 1,
    settings: defaultDictionarySettings(),
    entries: [],
  };
}

function parseStore(raw: string): DictionaryStoreV1 | null {
  try {
    const data = JSON.parse(raw) as Partial<DictionaryStoreV1>;
    if (data.version !== 1) return null;

    const settings = normalizeDictionarySettings(data.settings);

    const entries: DictionaryEntry[] = Array.isArray(data.entries)
      ? migrateDictionaryEntries(
          data.entries.filter(
            (e): e is DictionaryEntry =>
              e != null &&
              typeof e.word === 'string' &&
              typeof e.meaning === 'string' &&
              typeof e.lookupCount === 'number'
          ).map((e) => ({
            ...e,
            targetLanguage: migrateLanguageId(
              e.targetLanguage,
              settings.translationLanguage
            ) as DictionaryLanguageCode,
          }))
        )
      : [];

    return {
      version: 1,
      settings,
      entries,
    };
  } catch {
    return null;
  }
}

export async function loadDictionaryStore(): Promise<DictionaryStoreV1> {
  try {
    const raw = await AsyncStorage.getItem(DICTIONARY_STORE_KEY);
    if (!raw) return defaultStore();
    const store = parseStore(raw) ?? defaultStore();
    logPracticeQueueLoaded(store.entries.length);
    return store;
  } catch (err) {
    logPracticeQueueStorageError(err);
    return defaultStore();
  }
}

export async function saveDictionaryStore(store: DictionaryStoreV1): Promise<void> {
  const payload: DictionaryStoreV1 = {
    version: 1,
    settings: store.settings,
    entries: migrateDictionaryEntries(store.entries).slice(0, MAX_PRACTICE_WORDS),
  };
  try {
    await AsyncStorage.setItem(DICTIONARY_STORE_KEY, JSON.stringify(payload));
    logPracticeQueueSaved(payload.entries.length);
  } catch (err) {
    logPracticeQueueStorageError(err);
    throw err;
  }
}

let dictionaryWriteChain: Promise<unknown> = Promise.resolve();

function logDictionarySave(
  beforeCount: number,
  afterCount: number,
  word: string,
  language: DictionaryLanguageCode,
  duplicate: boolean
): void {
  console.log(`[DICTIONARY_SAVE] beforeCount=${beforeCount} afterCount=${afterCount}`);
  console.log(`[DICTIONARY_SAVE] saved word=${word} language=${language}`);
  if (duplicate) {
    console.log(`[DICTIONARY_SAVE] duplicate handled word=${word}`);
  }
}

/**
 * Serialized read-modify-write for dictionary store.
 * Prevents concurrent saves from overwriting earlier entries.
 */
export async function mutateDictionaryStore(
  mutator: (store: DictionaryStoreV1) => DictionaryStoreV1,
  meta?: { word?: string; language?: DictionaryLanguageCode }
): Promise<DictionaryStoreV1> {
  let result!: DictionaryStoreV1;
  const run = async () => {
    const store = await loadDictionaryStore();
    const beforeCount = store.entries.length;
    const next = mutator(store);
    const afterCount = next.entries.length;
    await saveDictionaryStore(next);
    if (meta?.word && meta?.language) {
      logDictionarySave(
        beforeCount,
        afterCount,
        meta.word,
        meta.language,
        beforeCount === afterCount
      );
    }
    result = next;
    return next;
  };
  dictionaryWriteChain = dictionaryWriteChain.then(run, run);
  await dictionaryWriteChain;
  return result;
}

/** Clears serialized write queue between tests. */
export function resetDictionaryWriteChainForTests(): void {
  dictionaryWriteChain = Promise.resolve();
}

export async function updateDictionarySettings(
  patch: Partial<DictionarySettingsV1>
): Promise<DictionarySettingsV1> {
  const next = await mutateDictionaryStore((store) => {
    const settings = normalizeDictionarySettings({
      ...store.settings,
      ...patch,
      practiceLanguage: isDictionaryLanguageCode(patch.practiceLanguage)
        ? (migrateLanguageId(patch.practiceLanguage) as DictionaryLanguageCode)
        : store.settings.practiceLanguage,
      translationLanguage: isDictionaryLanguageCode(patch.translationLanguage)
        ? (migrateLanguageId(patch.translationLanguage) as DictionaryLanguageCode)
        : store.settings.translationLanguage,
    });
    return { ...store, settings };
  });
  return next.settings;
}

export function findDictionaryEntry(
  entries: DictionaryEntry[],
  word: string,
  targetLanguage: DictionaryLanguageCode
): DictionaryEntry | undefined {
  const key = normalizeLookupWord(word);
  return entries.find((e) => e.word === key && e.targetLanguage === targetLanguage);
}

export function recordWordInReadingText(
  entries: DictionaryEntry[],
  fullText: string,
  textHash: string
): DictionaryEntry[] {
  if (!fullText.trim() || !textHash) return entries;

  let changed = false;
  const next = entries.map((entry) => {
    const count = countWordInText(entry.word, fullText);
    if (count <= 0) return entry;

    const seen = entry.seenTextHashes ?? [];
    if (seen.includes(textHash)) return entry;

    changed = true;
    return {
      ...entry,
      seenTextHashes: [...seen, textHash].slice(-32),
      textAppearanceCount: entry.textAppearanceCount + 1,
    };
  });

  return changed ? next : entries;
}

export function upsertDictionaryEntry(
  entries: DictionaryEntry[],
  input: {
    displayWord: string;
    meaning: string;
    partOfSpeech?: string;
    targetLanguage: DictionaryLanguageCode;
    textAppearanceCount?: number;
  }
): DictionaryEntry[] {
  const key = normalizeLookupWord(input.displayWord);
  if (!key) return entries;

  const now = Date.now();
  const existing = findDictionaryEntry(entries, key, input.targetLanguage);

  if (existing) {
    return entries.map((e) =>
      e.word === key && e.targetLanguage === input.targetLanguage
        ? {
            ...e,
            displayWord: input.displayWord,
            meaning: input.meaning,
            partOfSpeech: input.partOfSpeech ?? e.partOfSpeech,
            lookupCount: e.lookupCount + 1,
            textAppearanceCount: Math.max(
              e.textAppearanceCount,
              input.textAppearanceCount ?? e.textAppearanceCount
            ),
          }
        : e
    );
  }

  const entry: DictionaryEntry = {
    word: key,
    displayWord: input.displayWord,
    meaning: input.meaning,
    partOfSpeech: input.partOfSpeech,
    targetLanguage: input.targetLanguage,
    savedAt: now,
    lookupCount: 1,
    textAppearanceCount: input.textAppearanceCount ?? 1,
    id: `${input.targetLanguage}:${key}`,
    targetUses: 3,
    usedCount: 0,
    difficultyStarred: false,
    updatedAt: now,
  };

  return [entry, ...entries].slice(0, MAX_PRACTICE_WORDS);
}

export function incrementLookupCount(
  entries: DictionaryEntry[],
  word: string,
  targetLanguage: DictionaryLanguageCode
): DictionaryEntry[] {
  const key = normalizeLookupWord(word);
  if (!key) return entries;

  let changed = false;
  const next = entries.map((e) => {
    if (e.word !== key || e.targetLanguage !== targetLanguage) return e;
    changed = true;
    return { ...e, lookupCount: e.lookupCount + 1 };
  });
  return changed ? next : entries;
}

export function removeDictionaryEntry(
  entries: DictionaryEntry[],
  word: string,
  targetLanguage: DictionaryLanguageCode
): DictionaryEntry[] {
  const key = normalizeLookupWord(word);
  if (!key) return entries;
  return entries.filter((e) => !(e.word === key && e.targetLanguage === targetLanguage));
}

/** Manual add from settings — merges duplicates by normalized word + language. */
export function addManualDictionaryEntry(
  entries: DictionaryEntry[],
  input: {
    displayWord: string;
    meaning?: string;
    targetLanguage: DictionaryLanguageCode;
  }
): DictionaryEntry[] {
  const key = normalizeLookupWord(input.displayWord);
  if (!key) return entries;

  const displayWord = input.displayWord.trim() || key;
  const meaning = (input.meaning ?? '').trim();
  const existing = findDictionaryEntry(entries, key, input.targetLanguage);

  if (existing) {
    return entries.map((e) =>
      e.word === key && e.targetLanguage === input.targetLanguage
        ? {
            ...e,
            displayWord,
            meaning: meaning || e.meaning,
          }
        : e
    );
  }

  const entry: DictionaryEntry = {
    word: key,
    displayWord,
    meaning,
    targetLanguage: input.targetLanguage,
    savedAt: Date.now(),
    lookupCount: 0,
    textAppearanceCount: 0,
    id: `${input.targetLanguage}:${key}`,
    targetUses: 3,
    usedCount: 0,
    difficultyStarred: false,
    updatedAt: Date.now(),
  };

  return [entry, ...entries].slice(0, MAX_PRACTICE_WORDS);
}

export function shouldRemoveWordAfterAiPractice(word: string, fullText: string): boolean {
  return countWordInText(word, fullText) > 0;
}

/** @deprecated Use recordPracticeUsageAfterAiGeneration from practiceQueue. */
export function removePracticeWordsUsedInAiText(
  entries: DictionaryEntry[],
  fullText: string,
  practiceWords: string[]
): DictionaryEntry[] {
  const batch = practiceWords.map((displayWord) => ({
    word: normalizeLookupWord(displayWord),
    displayWord,
    usedCount: 0,
    targetUses: 3 as const,
    difficultyStarred: false,
  }));
  return recordPracticeUsageAfterAiGeneration(entries, fullText, batch);
}

/** @deprecated Use selectDueWordsForAi from practiceQueue. */
export function getPracticeWordsForAi(entries: DictionaryEntry[]): string[] {
  return selectDueWordsForAi(entries).map((w) => w.displayWord);
}
