import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { WordLookupSheet, WORD_LOOKUP_TEST_IDS } from '../src/ui/WordLookupSheet';
import { getTheme } from '../src/theme/themes';

describe('WordLookupSheet', () => {
  const theme = getTheme('dark');

  it('shows meaning and save star', () => {
    const onToggleSave = jest.fn();
    const { getByTestId } = render(
      <WordLookupSheet
        visible
        theme={theme}
        displayWord="hello"
        targetLanguage="fa"
        meaning="سلام"
        loading={false}
        error={null}
        savedToDictionary={false}
        textAppearanceCount={1}
        lookupCount={1}
        canToggleSave
        onClose={() => {}}
        onToggleSave={onToggleSave}
      />
    );

    expect(getByTestId(WORD_LOOKUP_TEST_IDS.meaning).props.children).toBe('سلام');
    expect(getByTestId(WORD_LOOKUP_TEST_IDS.saveStar)).toBeTruthy();
    fireEvent.press(getByTestId(WORD_LOOKUP_TEST_IDS.saveStar));
    expect(onToggleSave).toHaveBeenCalledTimes(1);
  });

  it('shows cached meaning while refreshing', () => {
    const { getByTestId, queryByTestId } = render(
      <WordLookupSheet
        visible
        theme={theme}
        displayWord="hello"
        targetLanguage="fa"
        meaning="سلام"
        loading
        error={null}
        savedToDictionary={false}
        textAppearanceCount={1}
        lookupCount={1}
        canToggleSave={false}
        onClose={() => {}}
        onToggleSave={() => {}}
      />
    );

    expect(getByTestId(WORD_LOOKUP_TEST_IDS.meaning).props.children).toBe('سلام');
    expect(queryByTestId(WORD_LOOKUP_TEST_IDS.meaning)).toBeTruthy();
  });

  it('shows practiced progress when word appeared in 3 texts', () => {
    const { getByText } = render(
      <WordLookupSheet
        visible
        theme={theme}
        displayWord="run"
        targetLanguage="fa"
        meaning="دویدن"
        loading={false}
        error={null}
        savedToDictionary
        textAppearanceCount={3}
        lookupCount={2}
        canToggleSave
        onClose={() => {}}
        onToggleSave={() => {}}
      />
    );

    expect(getByText('Practiced in 3 texts — well done!')).toBeTruthy();
  });
});
