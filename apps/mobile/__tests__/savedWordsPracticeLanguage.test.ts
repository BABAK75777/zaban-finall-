import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addManualDictionaryEntry,
  findDictionaryEntry,
  loadDictionaryStore,
  mutateDictionaryStore,
  removeDictionaryEntry,
  resetDictionaryWriteChainForTests,
  updateDictionarySettings,
  upsertDictionaryEntry,
} from '../src/dictionary/dictionaryStorage';
import { addMeaningWord } from '../src/dictionary/practiceQueue';
import {
  entryMatchesPracticeLanguage,
  resolveEntryPracticeLanguage,
} from '../src/dictionary/entryPracticeLanguage';
import type { DictionaryEntry } from '../src/dictionary/dictionaryTypes';

describe('saved words practice-language partitioning', () => {
  beforeEach(async () => {
    resetDictionaryWriteChainForTests();
    await AsyncStorage.clear();
  });

  function turkishEntry(word: string): DictionaryEntry {
    return {
      word,
      displayWord: word,
      meaning: 'm',
      practiceLanguage: 'tr-TR',
      targetLanguage: 'tr-TR',
      savedAt: 1,
      lookupCount: 1,
      textAppearanceCount: 0,
    };
  }

  function englishEntry(word: string): DictionaryEntry {
    return {
      word,
      displayWord: word,
      meaning: 'm',
      practiceLanguage: 'en-US',
      targetLanguage: 'en-US',
      savedAt: 2,
      lookupCount: 1,
      textAppearanceCount: 0,
    };
  }

  it('Turkish list filtering — kitap visible, book hidden under tr-TR', () => {
    const entries = [turkishEntry('kitap'), englishEntry('book')];
    const turkishVisible = entries.filter((e) => entryMatchesPracticeLanguage(e, 'tr-TR'));
    expect(turkishVisible.map((e) => e.word)).toEqual(['kitap']);
  });

  it('English list filtering — book visible, kitap hidden under en-US', () => {
    const entries = [turkishEntry('kitap'), englishEntry('book')];
    const englishVisible = entries.filter((e) => entryMatchesPracticeLanguage(e, 'en-US'));
    expect(englishVisible.map((e) => e.word)).toEqual(['book']);
  });

  it('switching practice language filters without deleting stored words', async () => {
    await mutateDictionaryStore((store) => ({
      ...store,
      entries: [turkishEntry('kitap'), englishEntry('book')],
    }));

    await updateDictionarySettings({ practiceLanguage: 'tr-TR' as never });
    let store = await loadDictionaryStore();
    expect(store.entries).toHaveLength(2);
    expect(
      store.entries.filter((e) => entryMatchesPracticeLanguage(e, 'tr-TR')).map((e) => e.word)
    ).toEqual(['kitap']);

    await updateDictionarySettings({ practiceLanguage: 'en-US' as never });
    store = await loadDictionaryStore();
    expect(store.entries).toHaveLength(2);
    expect(
      store.entries.filter((e) => entryMatchesPracticeLanguage(e, 'en-US')).map((e) => e.word)
    ).toEqual(['book']);

    await updateDictionarySettings({ practiceLanguage: 'tr-TR' as never });
    store = await loadDictionaryStore();
    expect(
      store.entries.filter((e) => entryMatchesPracticeLanguage(e, 'tr-TR')).map((e) => e.word)
    ).toEqual(['kitap']);
  });

  it('save assigns current practice language ownership', async () => {
    await updateDictionarySettings({ practiceLanguage: 'tr-TR' as never });
    await mutateDictionaryStore((store) => ({
      ...store,
      entries: upsertDictionaryEntry(store.entries, {
        displayWord: 'kitap',
        meaning: 'کتاب',
        practiceLanguage: 'tr-TR',
      }),
    }));

    await updateDictionarySettings({ practiceLanguage: 'en-US' as never });
    await mutateDictionaryStore((store) => ({
      ...store,
      entries: upsertDictionaryEntry(store.entries, {
        displayWord: 'book',
        meaning: 'libro',
        practiceLanguage: 'en-US',
      }),
    }));

    const store = await loadDictionaryStore();
    expect(findDictionaryEntry(store.entries, 'kitap', 'tr-TR')?.practiceLanguage).toBe('tr-TR');
    expect(findDictionaryEntry(store.entries, 'book', 'en-US')?.practiceLanguage).toBe('en-US');
  });

  it('translation language does not control saved-word ownership', async () => {
    await updateDictionarySettings({
      practiceLanguage: 'tr-TR' as never,
      translationLanguage: 'fa' as never,
    });

    let store = await mutateDictionaryStore((store) => ({
      ...store,
      entries: addMeaningWord(store.entries, {
        displayWord: 'kitap',
        meaning: 'کتاب',
        practiceLanguage: 'tr-TR',
      }),
    }));

    const saved = findDictionaryEntry(store.entries, 'kitap', 'tr-TR');
    expect(saved?.practiceLanguage).toBe('tr-TR');
    expect(resolveEntryPracticeLanguage(saved!)).toBe('tr-TR');
    expect(saved?.practiceLanguage).not.toBe('fa');

    await updateDictionarySettings({ translationLanguage: 'en-US' as never });
    store = await loadDictionaryStore();
    const reloaded = findDictionaryEntry(store.entries, 'kitap', 'tr-TR');
    expect(reloaded?.practiceLanguage).toBe('tr-TR');
    expect(
      store.entries.filter((e) => entryMatchesPracticeLanguage(e, 'en-US'))
    ).toHaveLength(0);
  });

  it('same normalized word text can exist independently under two practice languages', () => {
    let entries = addManualDictionaryEntry([], {
      displayWord: 'no',
      practiceLanguage: 'tr-TR',
    });
    entries = addManualDictionaryEntry(entries, {
      displayWord: 'no',
      practiceLanguage: 'en-US',
    });
    expect(entries).toHaveLength(2);
    expect(findDictionaryEntry(entries, 'no', 'tr-TR')).toBeTruthy();
    expect(findDictionaryEntry(entries, 'no', 'en-US')).toBeTruthy();
  });

  it('delete isolation — removing en-US book leaves tr-TR kitap', () => {
    let entries = [turkishEntry('kitap'), englishEntry('book')];
    entries = removeDictionaryEntry(entries, 'book', 'en-US');
    expect(entries).toHaveLength(1);
    expect(entries[0].word).toBe('kitap');
    expect(entries[0].practiceLanguage).toBe('tr-TR');
  });

  it('persistence/reload preserves language separation', async () => {
    await mutateDictionaryStore((store) => ({
      ...store,
      entries: [turkishEntry('kitap'), englishEntry('book')],
    }));

    const reloaded = await loadDictionaryStore();
    expect(reloaded.entries).toHaveLength(2);
    expect(findDictionaryEntry(reloaded.entries, 'kitap', 'tr-TR')?.practiceLanguage).toBe(
      'tr-TR'
    );
    expect(findDictionaryEntry(reloaded.entries, 'book', 'en-US')?.practiceLanguage).toBe('en-US');
  });

  it('legacy translation-keyed records remain stored but are not shown in practice lists', async () => {
    await mutateDictionaryStore((store) => ({
      ...store,
      entries: [
        {
          word: 'salam',
          displayWord: 'salam',
          meaning: 'hello',
          targetLanguage: 'fa',
          savedAt: 1,
          lookupCount: 1,
          textAppearanceCount: 0,
        },
      ],
    }));

    const store = await loadDictionaryStore();
    expect(store.entries).toHaveLength(1);
    expect(resolveEntryPracticeLanguage(store.entries[0])).toBeUndefined();
    expect(entryMatchesPracticeLanguage(store.entries[0], 'tr-TR')).toBe(false);
    expect(entryMatchesPracticeLanguage(store.entries[0], 'en-US')).toBe(false);
  });

  it('legacy entries with practice id in targetLanguage migrate to practiceLanguage', async () => {
    await mutateDictionaryStore((store) => ({
      ...store,
      entries: [
        {
          word: 'hello',
          displayWord: 'hello',
          meaning: 'selam',
          targetLanguage: 'en-US',
          savedAt: 1,
          lookupCount: 1,
          textAppearanceCount: 0,
        },
      ],
    }));

    const store = await loadDictionaryStore();
    expect(store.entries[0].practiceLanguage).toBe('en-US');
    expect(entryMatchesPracticeLanguage(store.entries[0], 'en-US')).toBe(true);
  });
});
