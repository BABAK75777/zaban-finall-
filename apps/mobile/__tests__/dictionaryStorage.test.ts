import {
  addManualDictionaryEntry,
  findDictionaryEntry,
  getPracticeWordsForAi,
  incrementLookupCount,
  recordWordInReadingText,
  removeDictionaryEntry,
  upsertDictionaryEntry,
} from '../src/dictionary/dictionaryStorage';
import type { DictionaryEntry } from '../src/dictionary/dictionaryTypes';

const baseEntry = (word: string): DictionaryEntry => ({
  word,
  displayWord: word,
  meaning: 'test',
  targetLanguage: 'fa',
  savedAt: 1,
  lookupCount: 1,
  textAppearanceCount: 1,
});

describe('dictionaryStorage helpers', () => {
  it('finds entry by word and language', () => {
    const entries = [baseEntry('hello')];
    expect(findDictionaryEntry(entries, 'Hello', 'fa')?.word).toBe('hello');
    expect(findDictionaryEntry(entries, 'hello', 'de')).toBeUndefined();
  });

  it('upserts and increments lookup count', () => {
    const first = upsertDictionaryEntry([], {
      displayWord: 'run',
      meaning: 'دویدن',
      targetLanguage: 'fa',
    });
    expect(first).toHaveLength(1);
    expect(first[0].lookupCount).toBe(1);

    const second = upsertDictionaryEntry(first, {
      displayWord: 'Run',
      meaning: 'دویدن',
      targetLanguage: 'fa',
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

  it('builds practice words for AI prioritizing under-practiced entries', () => {
    const entries = [
      { ...baseEntry('done'), textAppearanceCount: 3 },
      { ...baseEntry('needs'), textAppearanceCount: 1 },
    ];
    expect(getPracticeWordsForAi(entries)).toEqual(['needs', 'done']);
  });

  it('increments lookup count for saved entries', () => {
    const entries = [baseEntry('hello')];
    const next = incrementLookupCount(entries, 'Hello', 'fa');
    expect(next[0].lookupCount).toBe(2);
  });

  it('removes dictionary entry by word and language', () => {
    const entries = [baseEntry('hello'), baseEntry('world')];
    const next = removeDictionaryEntry(entries, 'Hello', 'fa');
    expect(next).toHaveLength(1);
    expect(next[0].word).toBe('world');
  });

  it('adds manual dictionary entry and merges duplicates', () => {
    const first = addManualDictionaryEntry([], {
      displayWord: 'Run',
      meaning: 'دویدن',
      targetLanguage: 'fa',
    });
    expect(first).toHaveLength(1);
    expect(first[0].lookupCount).toBe(0);

    const merged = addManualDictionaryEntry(first, {
      displayWord: 'run',
      meaning: 'راندن',
      targetLanguage: 'fa',
    });
    expect(merged).toHaveLength(1);
    expect(merged[0].meaning).toBe('راندن');
  });
});
