import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  DictionarySettingsSection,
  DICTIONARY_SETTINGS_TEST_IDS,
} from '../src/ui/DictionarySettingsSection';
import { SAVED_WORDS_LIST_TEST_IDS } from '../src/ui/SavedWordsList';
import { defaultDictionarySettings } from '../src/dictionary/dictionaryStorage';
import { getTheme } from '../src/theme/themes';

describe('DictionarySettingsSection', () => {
  const theme = getTheme('dark');
  const noop = () => {};

  it('shows practice and meanings language rows', () => {
    const { getByTestId, queryByTestId } = render(
      <DictionarySettingsSection
        theme={theme}
        settings={defaultDictionarySettings()}
        entries={[]}
        onEntriesChange={noop}
        onOpenPracticeLanguagePicker={noop}
        onOpenLanguagePicker={noop}
      />
    );

    expect(getByTestId(DICTIONARY_SETTINGS_TEST_IDS.practiceLanguageRow)).toBeTruthy();
    expect(getByTestId(DICTIONARY_SETTINGS_TEST_IDS.languageRow)).toBeTruthy();
    expect(queryByTestId('dictionary-lang-fa')).toBeNull();
  });

  it('opens practice and meanings pickers via callbacks', () => {
    const onOpenPracticeLanguagePicker = jest.fn();
    const onOpenLanguagePicker = jest.fn();
    const { getByTestId } = render(
      <DictionarySettingsSection
        theme={theme}
        settings={{ ...defaultDictionarySettings(), translationLanguage: 'de-DE' as never }}
        entries={[]}
        onEntriesChange={noop}
        onOpenPracticeLanguagePicker={onOpenPracticeLanguagePicker}
        onOpenLanguagePicker={onOpenLanguagePicker}
      />
    );

    fireEvent.press(getByTestId(DICTIONARY_SETTINGS_TEST_IDS.practiceLanguageRow));
    fireEvent.press(getByTestId(DICTIONARY_SETTINGS_TEST_IDS.languageRow));
    expect(onOpenPracticeLanguagePicker).toHaveBeenCalledTimes(1);
    expect(onOpenLanguagePicker).toHaveBeenCalledTimes(1);
  });

  it('shows inline saved words list', () => {
    const { getByTestId } = render(
      <DictionarySettingsSection
        theme={theme}
        settings={defaultDictionarySettings()}
        entries={[]}
        onEntriesChange={noop}
        onOpenPracticeLanguagePicker={noop}
        onOpenLanguagePicker={noop}
      />
    );

    expect(getByTestId(SAVED_WORDS_LIST_TEST_IDS.wordInput)).toBeTruthy();
    expect(getByTestId(SAVED_WORDS_LIST_TEST_IDS.addBtn)).toBeTruthy();
  });
});
