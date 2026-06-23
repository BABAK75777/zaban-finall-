import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_DICTIONARY_LANGUAGE,
  isDictionaryLanguageCode,
  type DictionaryLanguageCode,
} from './dictionaryLanguages';
import type { DictionaryEntry, DictionarySettingsV1, DictionaryStoreV1 } from './dictionaryTypes';
import {
  countSentencesWithWord,
  countWordInText,
  normalizeLookupWord,
} from './tokenizeSentence';

/** After AI generation: word must appear in at least this many sentences. */
export const AI_PRACTICE_MIN_SENTENCES = 3;
/** After AI generation: word must appear at least this many times in the passage. */
export const AI_PRACTICE_MIN_OCCURRENCES = 4;
/** Soft upper target for occurrences per word in one AI passage. */
export const AI_PRACTICE_MAX_OCCURRENCES = 6;

export const DICTIONARY_STORE_KEY = '@zaban/dictionary_v1';
const MAX_ENTRIES = 500;

export function defaultDictionarySettings(): DictionarySettingsV1 {
  return {
    version: 1,
    translationLanguage: DEFAULT_DICTIONARY_LANGUAGE,
    saveWordsOnLookup: true,
    useDictionaryInAi: true,
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

    const settings = data.settings ?? defaultDictionarySettings();
    const translationLanguage = isDictionaryLanguageCode(settings.translationLanguage)
      ? settings.translationLanguage
      : DEFAULT_DICTIONARY_LANGUAGE;

    const entries: DictionaryEntry[] = Array.isArray(data.entries)
      ? data.entries
          .filter(
            (e): e is DictionaryEntry =>
              e != null &&
              typeof e.word === 'string' &&
              typeof e.meaning === 'string' &&
              typeof e.lookupCount === 'number'
          )
          .slice(0, MAX_ENTRIES)
      : [];

    return {
      version: 1,
      settings: {
        version: 1,
        translationLanguage,
        saveWordsOnLookup: Boolean(settings.saveWordsOnLookup),
        useDictionaryInAi: Boolean(settings.useDictionaryInAi),
      },
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
    return parseStore(raw) ?? defaultStore();
  } catch {
    return defaultStore();
  }
}

export async function saveDictionaryStore(store: DictionaryStoreV1): Promise<void> {
  const payload: DictionaryStoreV1 = {
    version: 1,
    settings: store.settings,
    entries: store.entries.slice(0, MAX_ENTRIES),
  };
  await AsyncStorage.setItem(DICTIONARY_STORE_KEY, JSON.stringify(payload));
}

export async function updateDictionarySettings(
  patch: Partial<DictionarySettingsV1>
): Promise<DictionarySettingsV1> {
  const store = await loadDictionaryStore();
  const next: DictionarySettingsV1 = {
    ...store.settings,
    ...patch,
    version: 1,
    translationLanguage: isDictionaryLanguageCode(patch.translationLanguage)
      ? patch.translationLanguage
      : store.settings.translationLanguage,
  };
  await saveDictionaryStore({ ...store, settings: next });
  return next;
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
  };

  return [entry, ...entries].slice(0, MAX_ENTRIES);
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
  };

  return [entry, ...entries].slice(0, MAX_ENTRIES);
}

export function shouldRemoveWordAfterAiPractice(word: string, fullText: string): boolean {
  const occurrences = countWordInText(word, fullText);
  const sentences = countSentencesWithWord(word, fullText);
  return (
    sentences >= AI_PRACTICE_MIN_SENTENCES && occurrences >= AI_PRACTICE_MIN_OCCURRENCES
  );
}

/** Remove saved words that were practiced enough in a generated AI passage. */
export function removePracticeWordsUsedInAiText(
  entries: DictionaryEntry[],
  fullText: string,
  practiceWords: string[]
): DictionaryEntry[] {
  if (!fullText.trim() || practiceWords.length === 0) return entries;

  const keysToRemove = new Set<string>();
  for (const displayWord of practiceWords) {
    if (shouldRemoveWordAfterAiPractice(displayWord, fullText)) {
      const key = normalizeLookupWord(displayWord);
      if (key) keysToRemove.add(key);
    }
  }
  if (keysToRemove.size === 0) return entries;

  return entries.filter((entry) => !keysToRemove.has(entry.word));
}

export function getPracticeWordsForAi(entries: DictionaryEntry[]): string[] {
  const ordered = [...entries].sort(
    (a, b) => a.textAppearanceCount - b.textAppearanceCount || a.savedAt - b.savedAt
  );
  return [...new Set(ordered.map((e) => e.displayWord.trim()).filter(Boolean))].slice(0, 24);
}
