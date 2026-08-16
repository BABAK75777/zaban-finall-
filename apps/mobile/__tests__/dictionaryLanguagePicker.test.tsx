import { Alert } from 'react-native';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  DictionaryLanguagePicker,
  DICTIONARY_LANGUAGE_PICKER_TEST_IDS,
} from '../src/ui/DictionaryLanguagePicker';
import { getTheme } from '../src/theme/themes';
import {
  getVisibleDictionaryLanguages,
  IN_PROGRESS_DIALOG_BUTTON,
  IN_PROGRESS_DIALOG_MESSAGE,
  IN_PROGRESS_DIALOG_TITLE,
  LANGUAGE_REQUEST_CTA_LABEL,
} from '../src/dictionary/languageAvailability';

describe('DictionaryLanguagePicker availability', () => {
  const theme = getTheme('dark');
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('renders nothing when hidden', () => {
    const { queryByTestId } = render(
      <DictionaryLanguagePicker
        visible={false}
        theme={theme}
        selected="fa"
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    expect(queryByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.modal)).toBeNull();
  });

  it('shows exactly 9 product-visible Dictionary languages', () => {
    const { getByTestId, queryByTestId } = render(
      <DictionaryLanguagePicker
        visible
        theme={theme}
        selected="fa"
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    expect(getByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.modal)).toBeTruthy();
    const visible = getVisibleDictionaryLanguages();
    expect(visible).toHaveLength(9);
    for (const lang of visible) {
      expect(getByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.option(lang.id))).toBeTruthy();
    }
    expect(queryByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.option('ja-JP'))).toBeNull();
    expect(queryByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.option('ar'))).toBeNull();
  });

  it('selects an active language immediately and closes', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <DictionaryLanguagePicker
        visible
        theme={theme}
        selected="fa"
        onSelect={onSelect}
        onClose={onClose}
      />
    );
    fireEvent.press(getByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.option('tr-TR')));
    expect(onSelect).toHaveBeenCalledWith('tr-TR');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('In Progress tap shows dialog and does not change translationLanguage', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <DictionaryLanguagePicker
        visible
        theme={theme}
        selected="fa"
        onSelect={onSelect}
        onClose={onClose}
      />
    );
    fireEvent.press(getByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.option('de-DE')));
    expect(alertSpy).toHaveBeenCalledWith(
      IN_PROGRESS_DIALOG_TITLE,
      IN_PROGRESS_DIALOG_MESSAGE,
      expect.arrayContaining([expect.objectContaining({ text: IN_PROGRESS_DIALOG_BUTTON })])
    );
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes without selecting when X is pressed', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <DictionaryLanguagePicker
        visible
        theme={theme}
        selected="fa"
        onSelect={onSelect}
        onClose={onClose}
      />
    );
    fireEvent.press(getByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.close));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders language request CTA text without inventing a form URL', () => {
    const { getByTestId } = render(
      <DictionaryLanguagePicker
        visible
        theme={theme}
        selected="fa"
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    expect(getByTestId(DICTIONARY_LANGUAGE_PICKER_TEST_IDS.languageRequestCta).props.children).toBe(
      LANGUAGE_REQUEST_CTA_LABEL
    );
  });
});
