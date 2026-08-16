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



  async function saveWord(

    word: string,

    practiceLanguage: 'en-US' | 'tr-TR' | 'ru-RU' = 'en-US'

  ) {

    return mutateDictionaryStore(

      (store) => ({

        ...store,

        entries: upsertDictionaryEntry(store.entries, {

          displayWord: word,

          meaning: `meaning-${word}`,

          practiceLanguage,

        }),

      }),

      { word, language: practiceLanguage }

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

    await saveWord('run', 'tr-TR');

    const store = await saveWord('Run', 'tr-TR');

    expect(store.entries).toHaveLength(1);

    expect(store.entries[0].lookupCount).toBe(2);

  });



  it('keeps separate entries per practice language', async () => {

    await saveWord('hello', 'en-US');

    await saveWord('hello', 'tr-TR');

    const store = await loadDictionaryStore();

    expect(store.entries).toHaveLength(2);

    expect(store.entries.map((e) => e.practiceLanguage).sort()).toEqual(['en-US', 'tr-TR']);

  });



  it('concurrent saves do not wipe earlier entries', async () => {

    await Promise.all([saveWord('a'), saveWord('b'), saveWord('c')]);

    const store = await loadDictionaryStore();

    expect(store.entries).toHaveLength(3);

    const raw = await AsyncStorage.getItem(DICTIONARY_STORE_KEY);

    expect(raw).toBeTruthy();

  });



  it('changing translation language does not delete saved words', async () => {

    await saveWord('salam', 'tr-TR');

    await saveWord('ketab', 'tr-TR');

    await saveWord('hello', 'en-US');



    const settings = await updateDictionarySettings({ translationLanguage: 'fa' as never });

    expect(settings.translationLanguage).toBe('fa');



    const store = await loadDictionaryStore();

    expect(store.entries).toHaveLength(3);

    expect(store.entries.map((e) => `${e.practiceLanguage}:${e.word}`).sort()).toEqual([

      'en-US:hello',

      'tr-TR:ketab',

      'tr-TR:salam',

    ]);

  });



  it('switching practice language preserves all language-owned entries', async () => {

    await saveWord('run', 'tr-TR');

    await updateDictionarySettings({ practiceLanguage: 'en-US' as never });

    await saveWord('jump', 'en-US');

    await updateDictionarySettings({ practiceLanguage: 'tr-TR' as never });

    await saveWord('koşmak', 'tr-TR');



    const store = await loadDictionaryStore();

    expect(store.entries).toHaveLength(3);

    expect(store.settings.practiceLanguage).toBe('tr-TR');

  });

});

