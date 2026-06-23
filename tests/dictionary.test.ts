import { describe, expect, it } from 'vitest';
import {
  countWordInText,
  hashReadingText,
  normalizeLookupWord,
  tokenizeSentence,
} from '../apps/mobile/src/dictionary/tokenizeSentence';
import {
  findDictionaryEntry,
  getPracticeWordsForAi,
  incrementLookupCount,
  recordWordInReadingText,
  removeDictionaryEntry,
  upsertDictionaryEntry,
} from '../apps/mobile/src/dictionary/dictionaryStorage';
import type { DictionaryEntry } from '../apps/mobile/src/dictionary/dictionaryTypes';

describe('dictionary tokenize', () => {
  it('splits tappable words', () => {
    const tokens = tokenizeSentence('Hello, world!');
    expect(tokens.filter((t) => t.type === 'word').map((t) => t.lookup)).toEqual([
      'hello',
      'world',
    ]);
  });

  it('normalizes lookup keys', () => {
    expect(normalizeLookupWord('"Hello,"')).toBe('hello');
  });
});

describe('dictionary storage', () => {
  const entry = (word: string): DictionaryEntry => ({
    word,
    displayWord: word,
    meaning: 'm',
    targetLanguage: 'fa',
    savedAt: 1,
    lookupCount: 1,
    textAppearanceCount: 1,
  });

  it('upserts entries', () => {
    const next = upsertDictionaryEntry([], {
      displayWord: 'cat',
      meaning: 'گربه',
      targetLanguage: 'fa',
    });
    expect(next).toHaveLength(1);
    expect(findDictionaryEntry(next, 'cat', 'fa')?.meaning).toBe('گربه');
  });

  it('tracks text appearances per hash', () => {
    const entries = [entry('cat')];
    const text = 'The cat sat.';
    const once = recordWordInReadingText(entries, text, hashReadingText(text));
    expect(once[0].textAppearanceCount).toBe(2);
    expect(recordWordInReadingText(once, text, hashReadingText(text))).toBe(once);
  });

  it('exports practice words for AI with under-practiced first', () => {
    const practiced = { ...entry('done'), textAppearanceCount: 3 };
    const needs = { ...entry('needs'), textAppearanceCount: 1 };
    expect(getPracticeWordsForAi([practiced, needs])).toEqual(['needs', 'done']);
  });

  it('increments and removes saved entries', () => {
    const entries = [entry('cat')];
    expect(incrementLookupCount(entries, 'cat', 'fa')[0].lookupCount).toBe(2);
    expect(removeDictionaryEntry(entries, 'cat', 'fa')).toHaveLength(0);
  });

  it('counts words in text', () => {
    expect(countWordInText('cat', 'A cat and another cat')).toBe(2);
  });
});
