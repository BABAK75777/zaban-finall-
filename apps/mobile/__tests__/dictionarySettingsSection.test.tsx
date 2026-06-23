import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  DictionarySettingsSection,
  DICTIONARY_SETTINGS_TEST_IDS,
} from '../src/ui/DictionarySettingsSection';
import { SAVED_WORDS_LIST_TEST_IDS } from '../src/ui/SavedWordsList';
import { defaultDictionarySettings } from '../src/dictionary';
import { getTheme } from '../src/theme/themes';

describe('DictionarySettingsSection', () => {
  const theme = getTheme('dark');

  it('shows language selector row instead of chips', () => {
    const { getByTestId, queryByTestId } = render(
      <DictionarySettingsSection
        theme={theme}
        settings={defaultDictionarySettings()}
        entries={[]}
        onEntriesChange={() => {}}
        onOpenLanguagePicker={() => {}}
      />
    );

    expect(getByTestId(DICTIONARY_SETTINGS_TEST_IDS.languageRow)).toBeTruthy();
    expect(queryByTestId('dictionary-lang-fa')).toBeNull();
  });

  it('opens language picker via callback', () => {
    const onOpenLanguagePicker = jest.fn();
    const { getByTestId } = render(
      <DictionarySettingsSection
        theme={theme}
        settings={{ ...defaultDictionarySettings(), translationLanguage: 'de' }}
        entries={[]}
        onEntriesChange={() => {}}
        onOpenLanguagePicker={onOpenLanguagePicker}
      />
    );

    fireEvent.press(getByTestId(DICTIONARY_SETTINGS_TEST_IDS.languageRow));
    expect(onOpenLanguagePicker).toHaveBeenCalledTimes(1);
  });

  it('shows inline saved words list', () => {
    const { getByTestId } = render(
      <DictionarySettingsSection
        theme={theme}
        settings={defaultDictionarySettings()}
        entries={[]}
        onEntriesChange={() => {}}
        onOpenLanguagePicker={() => {}}
      />
    );

    expect(getByTestId(SAVED_WORDS_LIST_TEST_IDS.wordInput)).toBeTruthy();
    expect(getByTestId(SAVED_WORDS_LIST_TEST_IDS.addBtn)).toBeTruthy();
  });
});
