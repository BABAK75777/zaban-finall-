import {
  addManualDictionaryEntry,
  findDictionaryEntry,
  getPracticeWordsForAi,
  incrementLookupCount,
  recordWordInReadingText,
  removeDictionaryEntry,
  removePracticeWordsUsedInAiText,
  shouldRemoveWordAfterAiPractice,
  upsertDictionaryEntry,
} from '../src/dictionary/dictionaryStorage';
import type { DictionaryEntry } from '../src/dictionary/dictionaryTypes';

const baseEntry = (word: string, practiceLanguage: 'fa' | 'en-US' | 'tr-TR' = 'tr-TR'): DictionaryEntry => ({
  word,
  displayWord: word,
  meaning: 'test',
  practiceLanguage,
  targetLanguage: practiceLanguage,
  savedAt: 1,
  lookupCount: 1,
  textAppearanceCount: 1,
});

describe('dictionaryStorage helpers', () => {
  it('finds entry by word and practice language', () => {
    const entries = [baseEntry('hello', 'tr-TR')];
    expect(findDictionaryEntry(entries, 'Hello', 'tr-TR')?.word).toBe('hello');
    expect(findDictionaryEntry(entries, 'hello', 'en-US')).toBeUndefined();
  });

  it('upserts and increments lookup count', () => {
    const first = upsertDictionaryEntry([], {
      displayWord: 'run',
      meaning: 'دویدن',
      practiceLanguage: 'tr-TR',
    });
    expect(first).toHaveLength(1);
    expect(first[0].lookupCount).toBe(1);

    const second = upsertDictionaryEntry(first, {
      displayWord: 'Run',
      meaning: 'دویدن',
      practiceLanguage: 'tr-TR',
    });
    expect(second).toHaveLength(1);
    expect(second[0].lookupCount).toBe(2);
  });

  it('records appearance only once per text hash', () => {
    const entries = [baseEntry('cat')];
    const text = 'The cat sat near the cat.';
    const once = recordWordInReadingText(entries, text, 'hash1');
    expect(once[0].textAppearanceCount).toBe(2);
    const twice = recordWordInReadingText(once, text, 'hash1');
    expect(twice).toBe(once);
    const otherText = recordWordInReadingText(once, text, 'hash2');
    expect(otherText[0].textAppearanceCount).toBe(3);
  });

  it('builds practice words for AI prioritizing starred and older due entries', () => {
    const entries = [
      { ...baseEntry('done'), usedCount: 2, targetUses: 3 as const, savedAt: 10 },
      { ...baseEntry('needs'), usedCount: 0, targetUses: 3 as const, savedAt: 5, difficultyStarred: true },
      { ...baseEntry('also'), usedCount: 0, targetUses: 3 as const, savedAt: 1 },
    ];
    expect(getPracticeWordsForAi(entries)).toEqual(['needs', 'also', 'done']);
  });

  it('detects when a practice word appears in generated text', () => {
    const text = 'I went to the airport today.';
    expect(shouldRemoveWordAfterAiPractice('airport', text)).toBe(true);
    expect(shouldRemoveWordAfterAiPractice('ticket', text)).toBe(false);
  });

  it('increments usedCount after AI generation when word appears', () => {
    const entries = [
      { ...baseEntry('airport'), usedCount: 0, targetUses: 3 as const },
      { ...baseEntry('ticket'), usedCount: 0, targetUses: 3 as const },
    ];
    const text = 'The airport was busy today.';
    const next = removePracticeWordsUsedInAiText(entries, text, ['airport', 'ticket']);
    expect(next.find((e) => e.word === 'airport')?.usedCount).toBe(1);
    expect(next.find((e) => e.word === 'ticket')).toBeTruthy();
  });

  it('increments lookup count for saved entries', () => {
    const entries = [baseEntry('hello', 'tr-TR')];
    const next = incrementLookupCount(entries, 'Hello', 'tr-TR');
    expect(next[0].lookupCount).toBe(2);
  });

  it('removes dictionary entry by word and practice language', () => {
    const entries = [baseEntry('hello', 'tr-TR'), baseEntry('world', 'tr-TR')];
    const next = removeDictionaryEntry(entries, 'Hello', 'tr-TR');
    expect(next).toHaveLength(1);
    expect(next[0].word).toBe('world');
  });

  it('adds manual dictionary entry and merges duplicates within same practice language', () => {
    const first = addManualDictionaryEntry([], {
      displayWord: 'Run',
      meaning: 'دویدن',
      practiceLanguage: 'tr-TR',
    });
    expect(first).toHaveLength(1);
    expect(first[0].lookupCount).toBe(0);

    const merged = addManualDictionaryEntry(first, {
      displayWord: 'run',
      meaning: 'راندن',
      practiceLanguage: 'tr-TR',
    });
    expect(merged).toHaveLength(1);
    expect(merged[0].meaning).toBe('راندن');
  });
});
