import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultDictionarySettings,
  loadDictionaryStore,
  resetDictionaryWriteChainForTests,
  updateDictionarySettings,
} from '../src/dictionary/dictionaryStorage';

const indexPath = path.join(__dirname, '..', 'app', 'index.tsx');

describe('language selector wiring + preference separation', () => {
  const indexSrc = fs.readFileSync(indexPath, 'utf8');

  beforeEach(async () => {
    resetDictionaryWriteChainForTests();
    await AsyncStorage.clear();
  });

  it('Settings Languages uses openAfterSettings (avoids nested Modal)', () => {
    // The Languages row must close Settings before presenting AiGenerationLanguageModal.
    const languagesBlock = indexSrc.slice(
      indexSrc.indexOf('testID={READING_TEST_IDS.settingsLanguages}') - 500,
      indexSrc.indexOf('testID={READING_TEST_IDS.settingsLanguages}') + 80
    );
    expect(languagesBlock).toContain('openAfterSettings');
    expect(languagesBlock).toContain('setShowAiLanguageModal(true)');
    // Guard against regressing to a direct nested-modal open on that row.
    expect(languagesBlock).not.toMatch(/onPress=\{\(\)\s*=>\s*setShowAiLanguageModal\(true\)\}/);
  });

  it('Dictionary settings modal hosts an in-shell picker (no sibling nested Modal)', () => {
    const modalSrc = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'ui', 'DictionarySettingsModal.tsx'),
      'utf8'
    );
    expect(modalSrc).toContain('DictionaryLanguagePicker');
    expect(modalSrc).toContain('onOpenLanguagePicker={() => setPickerOpen(true)}');
    // Picker must live inside FullScreenModalShell, not as a second RN Modal sibling.
    const shellClose = modalSrc.indexOf('</FullScreenModalShell>');
    const pickerIdx = modalSrc.indexOf('<DictionaryLanguagePicker');
    expect(pickerIdx).toBeGreaterThan(-1);
    expect(pickerIdx).toBeLessThan(shellClose);
  });

  it('changing translationLanguage does not modify practiceLanguage', async () => {
    await updateDictionarySettings({
      practiceLanguage: 'en-US' as never,
      translationLanguage: 'fa' as never,
    });
    await updateDictionarySettings({ translationLanguage: 'tr-TR' as never });
    const store = await loadDictionaryStore();
    expect(store.settings.translationLanguage).toBe('tr-TR');
    expect(store.settings.practiceLanguage).toBe('en-US');
  });

  it('changing practiceLanguage does not modify translationLanguage', async () => {
    await updateDictionarySettings({
      practiceLanguage: 'en-US' as never,
      translationLanguage: 'fa' as never,
    });
    await updateDictionarySettings({ practiceLanguage: 'tr-TR' as never });
    const store = await loadDictionaryStore();
    expect(store.settings.practiceLanguage).toBe('tr-TR');
    expect(store.settings.translationLanguage).toBe('fa');
  });

  it('defaults keep Dictionary and AI language keys separate', () => {
    const settings = defaultDictionarySettings();
    expect(settings.practiceLanguage).toBe('en-US');
    expect(settings.translationLanguage).toBe('fa');
    expect(settings.practiceLanguage).not.toBe(settings.translationLanguage);
  });
});
