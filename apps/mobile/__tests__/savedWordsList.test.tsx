import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SavedWordsList, SAVED_WORDS_LIST_TEST_IDS } from '../src/ui/SavedWordsList';
import type { DictionaryEntry } from '../src/dictionary';
import { getTheme } from '../src/theme/themes';

const theme = getTheme('dark');

const sampleEntries: DictionaryEntry[] = [
  {
    word: 'hello',
    displayWord: 'hello',
    meaning: 'سلام',
    targetLanguage: 'fa',
    savedAt: Date.now(),
    lookupCount: 1,
    textAppearanceCount: 0,
  },
  {
    word: 'world',
    displayWord: 'world',
    meaning: 'دنیا',
    targetLanguage: 'fa',
    savedAt: Date.now(),
    lookupCount: 0,
    textAppearanceCount: 0,
  },
];

describe('SavedWordsList', () => {
  it('does not show a meaning input when adding words', () => {
    const { getByTestId, queryByTestId } = render(
      <SavedWordsList
        theme={theme}
        entries={[]}
        targetLanguage="fa"
        onEntriesChange={() => {}}
      />
    );

    expect(getByTestId(SAVED_WORDS_LIST_TEST_IDS.wordInput)).toBeTruthy();
    expect(getByTestId(SAVED_WORDS_LIST_TEST_IDS.addBtn)).toBeTruthy();
    expect(queryByTestId('saved-words-meaning-input')).toBeNull();
  });

  it('shows only the word in each list item, not the meaning', () => {
    const { getByTestId, queryByText } = render(
      <SavedWordsList
        theme={theme}
        entries={sampleEntries}
        targetLanguage="fa"
        onEntriesChange={() => {}}
      />
    );

    expect(getByTestId(SAVED_WORDS_LIST_TEST_IDS.item('hello'))).toBeTruthy();
    expect(getByTestId(SAVED_WORDS_LIST_TEST_IDS.list)).toBeTruthy();
    expect(queryByText('سلام')).toBeNull();
    expect(queryByText('دنیا')).toBeNull();
  });

  it('adds a word without requiring a meaning', () => {
    const onEntriesChange = jest.fn();
    const { getByTestId } = render(
      <SavedWordsList
        theme={theme}
        entries={[]}
        targetLanguage="fa"
        onEntriesChange={onEntriesChange}
      />
    );

    fireEvent.changeText(getByTestId(SAVED_WORDS_LIST_TEST_IDS.wordInput), 'run');
    fireEvent.press(getByTestId(SAVED_WORDS_LIST_TEST_IDS.addBtn));

    expect(onEntriesChange).toHaveBeenCalledTimes(1);
    const next = onEntriesChange.mock.calls[0][0] as DictionaryEntry[];
    expect(next).toHaveLength(1);
    expect(next[0].displayWord).toBe('run');
    expect(next[0].meaning).toBe('');
  });
});
