import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DICTIONARY_STORE_KEY,
  loadDictionaryStore,
  mutateDictionaryStore,
  resetDictionaryWriteChainForTests,
  updateDictionarySettings,
  upsertDictionaryEntry,
} from '../src/dictionary/dictionaryStorage';

describe('mutateDictionaryStore persistence', () => {
  beforeEach(async () => {
    resetDictionaryWriteChainForTests();
    await AsyncStorage.clear();
  });

  async function saveWord(word: string, language: 'en' | 'fa' | 'ru' | 'ur' | 'hi' = 'en') {
    return mutateDictionaryStore(
      (store) => ({
        ...store,
        entries: upsertDictionaryEntry(store.entries, {
          displayWord: word,
          meaning: `meaning-${word}`,
          targetLanguage: language,
        }),
      }),
      { word, language }
    );
  }

  it('saving first dictionary word count=1', async () => {
    const store = await saveWord('alpha');
    expect(store.entries).toHaveLength(1);
  });

  it('saving second dictionary word count=2', async () => {
    await saveWord('alpha');
    const store = await saveWord('beta');
    expect(store.entries).toHaveLength(2);
  });

  it('saving third dictionary word count=3', async () => {
    await saveWord('alpha');
    await saveWord('beta');
    const store = await saveWord('gamma');
    expect(store.entries).toHaveLength(3);
  });

  it('appending does not delete previous saved words', async () => {
    await saveWord('one');
    await saveWord('two');
    const store = await saveWord('three');
    const words = store.entries.map((e) => e.word).sort();
    expect(words).toEqual(['one', 'three', 'two']);
  });

  it('saved words persist after reload', async () => {
    await saveWord('persist');
    await saveWord('reload');
    const reloaded = await loadDictionaryStore();
    expect(reloaded.entries).toHaveLength(2);
    expect(reloaded.entries.map((e) => e.word).sort()).toEqual(['persist', 'reload']);
  });

  it('handles duplicate word by updating existing entry', async () => {
    await saveWord('run', 'fa');
    const store = await saveWord('Run', 'fa');
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].lookupCount).toBe(2);
  });

  it('keeps separate entries per dictionary language', async () => {
    await saveWord('hello', 'en');
    await saveWord('hello', 'ru');
    const store = await loadDictionaryStore();
    expect(store.entries).toHaveLength(2);
    expect(store.entries.map((e) => e.targetLanguage).sort()).toEqual(['en', 'ru']);
  });

  it('concurrent saves do not wipe earlier entries', async () => {
    await Promise.all([saveWord('a'), saveWord('b'), saveWord('c')]);
    const store = await loadDictionaryStore();
    expect(store.entries).toHaveLength(3);
    const raw = await AsyncStorage.getItem(DICTIONARY_STORE_KEY);
    expect(raw).toBeTruthy();
  });

  it('changing dictionary language does not delete saved words', async () => {
    await saveWord('salam', 'fa');
    await saveWord('ketab', 'fa');
    await saveWord('hello', 'en');

    const settings = await updateDictionarySettings({ translationLanguage: 'de-DE' as never });
    expect(settings.translationLanguage).toBe('de-DE');

    const store = await loadDictionaryStore();
    expect(store.entries).toHaveLength(3);
    expect(store.entries.map((e) => `${e.targetLanguage}:${e.word}`).sort()).toEqual([
      'en:hello',
      'fa:ketab',
      'fa:salam',
    ]);
  });

  it('switching fa → en → fr preserves all language-specific entries', async () => {
    await saveWord('run', 'fa');
    await updateDictionarySettings({ translationLanguage: 'en-US' as never });
    await saveWord('jump', 'en');
    await updateDictionarySettings({ translationLanguage: 'fr-FR' as never });
    await saveWord('courir', 'fr');

    const store = await loadDictionaryStore();
    expect(store.entries).toHaveLength(3);
    expect(store.settings.translationLanguage).toBe('fr-FR');
  });
});
