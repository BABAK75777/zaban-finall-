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

  it('coerces in-progress regional practice aliases to active default', () => {
    const settings = normalizeDictionarySettings({
      version: 1,
      practiceLanguage: 'fr-CA',
      translationLanguage: 'fa',
      saveWordsOnLookup: true,
      useDictionaryInAi: true,
    } as never);
    // fr-CA → fr-FR (registry) → en-US (product availability)
    expect(settings.practiceLanguage).toBe('en-US');
    expect(settings.translationLanguage).toBe('fa');
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

  it('stale unavailable practiceLanguage cannot remain after normalize', () => {
    const settings = normalizeDictionarySettings({
      version: 1,
      practiceLanguage: 'de-DE',
      translationLanguage: 'fa',
      saveWordsOnLookup: true,
      useDictionaryInAi: true,
    } as never);
    expect(settings.practiceLanguage).toBe('en-US');
  });

  it('persists active practice language across reload', async () => {
    await updateDictionarySettings({ practiceLanguage: 'tr-TR' as never });
    const store = await loadDictionaryStore();
    expect(store.settings.practiceLanguage).toBe('tr-TR');
    expect(store.settings.translationLanguage).toBe('fa');
  });

  it('rejects unavailable practiceLanguage updates (keeps prior active)', async () => {
    await updateDictionarySettings({ practiceLanguage: 'en-US' as never });
    await updateDictionarySettings({ practiceLanguage: 'en-GB' as never });
    const store = await loadDictionaryStore();
    expect(store.settings.practiceLanguage).toBe('en-US');
  });

  it('keeps practice and translation fields separate for active langs', async () => {
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
    await updateDictionarySettings({ practiceLanguage: 'tr-TR' as never });
    const store = await loadDictionaryStore();
    expect(store.settings.practiceLanguage).toBe('tr-TR');
    expect(store.settings.translationLanguage).toBe('fa');

    await updateDictionarySettings({ translationLanguage: 'en-US' as never });
    const again = await loadDictionaryStore();
    expect(again.settings.practiceLanguage).toBe('tr-TR');
    expect(again.settings.translationLanguage).toBe('en-US');
  });

  it('rejects unavailable Dictionary translationLanguage updates', async () => {
    await updateDictionarySettings({
      practiceLanguage: 'en-US' as never,
      translationLanguage: 'fa' as never,
    });
    await updateDictionarySettings({ translationLanguage: 'de-DE' as never });
    const store = await loadDictionaryStore();
    expect(store.settings.translationLanguage).toBe('fa');
    expect(store.settings.practiceLanguage).toBe('en-US');
  });

  it('offline/error path does not reset selection when saving fails after change', async () => {
    await updateDictionarySettings({ practiceLanguage: 'tr-TR' as never });
    const raw = await AsyncStorage.getItem(DICTIONARY_STORE_KEY);
    expect(raw).toContain('tr-TR');
    const again = await loadDictionaryStore();
    expect(again.settings.practiceLanguage).toBe('tr-TR');
  });
});
