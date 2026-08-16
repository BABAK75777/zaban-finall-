import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { defaultDictionarySettings } from '../src/dictionary/dictionaryStorage';
import { DICTIONARY_LANGUAGE_PICKER_TEST_IDS } from '../src/ui/DictionaryLanguagePicker';
import { DictionarySettingsModal } from '../src/ui/DictionarySettingsModal';
import { DICTIONARY_SETTINGS_TEST_IDS } from '../src/ui/DictionarySettingsSection';
import { getTheme } from '../src/theme/themes';

describe('DictionarySettingsModal language selector', () => {
  const theme = getTheme('dark');

  function renderModal(
    props: Partial<React.ComponentProps<typeof DictionarySettingsModal>> = {}
  ) {
    const settings = props.settings ?? {
      ...defaultDictionarySettings(),
      translationLanguage: 'fa' as const,
      practiceLanguage: 'en-US' as const,
    };
    return render(
      <TestSafeAreaProvider>
        <DictionarySettingsModal
          visible
          onClose={() => {}}
          theme={theme}
          settings={settings}
          entries={[]}
          onChange={() => {}}
          onEntriesChange={() => {}}
          {...props}
        />
      </TestSafeAreaProvider>
    );
  }

  it('renders Dictionary translation language control', () => {
    const { getByTestId, getByText } = renderModal();
    expect(getByTestId(DICTIONARY_SETTINGS_TEST_IDS.languageRow)).toBeTruthy();
    expect(getByText('Translate meanings to')).toBeTruthy();
    expect(getByText('Persian')).toBeTruthy();
  });

  it('opens the Dictionary language selector on one tap', () => {
    const { getByTestId, queryByTestId } = renderModal();
    expect(queryByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.modal)).toBeNull();

    fireEvent.press(getByTestId(DICTIONARY_SETTINGS_TEST_IDS.languageRow));

    expect(getByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.modal)).toBeTruthy();
    expect(
      getByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.option('fa')).props.accessibilityState
    ).toEqual(expect.objectContaining({ selected: true }));
  });

  it('commits translationLanguage only (not practiceLanguage) on select', () => {
    const onChange = jest.fn();
    const settings = {
      ...defaultDictionarySettings(),
      translationLanguage: 'fa' as const,
      practiceLanguage: 'en-US' as const,
    };
    const { getByTestId } = renderModal({ settings, onChange });

    fireEvent.press(getByTestId(DICTIONARY_SETTINGS_TEST_IDS.languageRow));
    fireEvent.press(getByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.option('tr-TR')));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ translationLanguage: 'tr-TR' });
    expect(onChange.mock.calls[0][0]).not.toHaveProperty('practiceLanguage');
  });

  it('closes selector without changing language', () => {
    const onChange = jest.fn();
    const { getByTestId, queryByTestId } = renderModal({ onChange });

    fireEvent.press(getByTestId(DICTIONARY_SETTINGS_TEST_IDS.languageRow));
    fireEvent.press(getByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.close));

    expect(queryByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.modal)).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
