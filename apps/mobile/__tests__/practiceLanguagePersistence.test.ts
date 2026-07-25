import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultDictionarySettings,
  normalizeDictionarySettings,
  loadDictionaryStore,
  saveDictionaryStore,
  updateDictionarySettings,
  DICTIONARY_STORE_KEY,
  resetDictionaryWriteChainForTests,
} from '../src/dictionary/dictionaryStorage';

describe('dictionary language persistence', () => {
  beforeEach(async () => {
    resetDictionaryWriteChainForTests();
    await AsyncStorage.clear();
  });

  it('defaults practice to en-US and meanings to fa', () => {
    const settings = defaultDictionarySettings();
    expect(settings.practiceLanguage).toBe('en-US');
    expect(settings.translationLanguage).toBe('fa');
  });

  it('migrates legacy translationLanguage-only stores', () => {
    const settings = normalizeDictionarySettings({
      version: 1,
      translationLanguage: 'en',
      saveWordsOnLookup: true,
      useDictionaryInAi: true,
    } as never);
    expect(settings.practiceLanguage).toBe('en-US');
    expect(settings.translationLanguage).toBe('en-US');
  });

  it('invalid stored practice language falls back safely', () => {
    const settings = normalizeDictionarySettings({
      version: 1,
      practiceLanguage: 'not-a-lang',
      translationLanguage: 'fa',
      saveWordsOnLookup: true,
      useDictionaryInAi: true,
    } as never);
    expect(settings.practiceLanguage).toBe('en-US');
    expect(settings.translationLanguage).toBe('fa');
  });

  it('persists practice language across reload', async () => {
    await updateDictionarySettings({ practiceLanguage: 'en-GB' as never });
    const store = await loadDictionaryStore();
    expect(store.settings.practiceLanguage).toBe('en-GB');
    expect(store.settings.translationLanguage).toBe('fa');
  });

  it('offline/error path does not reset selection when saving fails after change', async () => {
    await updateDictionarySettings({ practiceLanguage: 'de-DE' as never });
    const raw = await AsyncStorage.getItem(DICTIONARY_STORE_KEY);
    expect(raw).toContain('de-DE');
    const again = await loadDictionaryStore();
    expect(again.settings.practiceLanguage).toBe('de-DE');
  });

  it('keeps practice and translation fields separate', async () => {
    await saveDictionaryStore({
      version: 1,
      settings: {
        version: 1,
        practiceLanguage: 'en-US' as never,
        translationLanguage: 'fa' as never,
        saveWordsOnLookup: true,
        useDictionaryInAi: true,
      },
      entries: [],
    });
    await updateDictionarySettings({ practiceLanguage: 'fr-FR' as never });
    const store = await loadDictionaryStore();
    expect(store.settings.practiceLanguage).toBe('fr-FR');
    expect(store.settings.translationLanguage).toBe('fa');
  });
});
