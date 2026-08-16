import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SavedWordsList, SAVED_WORDS_LIST_TEST_IDS } from '../src/ui/SavedWordsList';
import type { DictionaryEntry } from '../src/dictionary';
import { getTheme } from '../src/theme/themes';

const theme = getTheme('dark');

function entry(
  word: string,
  practiceLanguage: 'tr-TR' | 'en-US',
  overrides: Partial<DictionaryEntry> = {}
): DictionaryEntry {
  return {
    word,
    displayWord: word,
    meaning: 'meaning',
    practiceLanguage,
    targetLanguage: practiceLanguage,
    savedAt: Date.now(),
    lookupCount: 1,
    textAppearanceCount: 0,
    ...overrides,
  };
}

describe('SavedWordsList', () => {
  it('does not show a meaning input when adding words', () => {
    const { getByTestId, queryByTestId } = render(
      <SavedWordsList
        theme={theme}
        entries={[]}
        practiceLanguage="tr-TR"
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
        entries={[entry('kitap', 'tr-TR', { meaning: 'book' })]}
        practiceLanguage="tr-TR"
        onEntriesChange={() => {}}
      />
    );

    expect(getByTestId(SAVED_WORDS_LIST_TEST_IDS.item('kitap'))).toBeTruthy();
    expect(queryByText('book')).toBeNull();
  });

  it('shows only Turkish words when practiceLanguage is tr-TR', () => {
    const mixed = [entry('kitap', 'tr-TR'), entry('book', 'en-US')];
    const { getByTestId, queryByTestId } = render(
      <SavedWordsList
        theme={theme}
        entries={mixed}
        practiceLanguage="tr-TR"
        onEntriesChange={() => {}}
      />
    );

    expect(getByTestId(SAVED_WORDS_LIST_TEST_IDS.item('kitap'))).toBeTruthy();
    expect(queryByTestId(SAVED_WORDS_LIST_TEST_IDS.item('book'))).toBeNull();
  });

  it('shows only English words when practiceLanguage is en-US', () => {
    const mixed = [entry('kitap', 'tr-TR'), entry('book', 'en-US')];
    const { getByTestId, queryByTestId } = render(
      <SavedWordsList
        theme={theme}
        entries={mixed}
        practiceLanguage="en-US"
        onEntriesChange={() => {}}
      />
    );

    expect(getByTestId(SAVED_WORDS_LIST_TEST_IDS.item('book'))).toBeTruthy();
    expect(queryByTestId(SAVED_WORDS_LIST_TEST_IDS.item('kitap'))).toBeNull();
  });

  it('adds a word with current practice language ownership', () => {
    const onEntriesChange = jest.fn();
    const { getByTestId } = render(
      <SavedWordsList
        theme={theme}
        entries={[]}
        practiceLanguage="tr-TR"
        onEntriesChange={onEntriesChange}
      />
    );

    fireEvent.changeText(getByTestId(SAVED_WORDS_LIST_TEST_IDS.wordInput), 'merhaba');
    fireEvent.press(getByTestId(SAVED_WORDS_LIST_TEST_IDS.addBtn));

    expect(onEntriesChange).toHaveBeenCalledTimes(1);
    const next = onEntriesChange.mock.calls[0][0] as DictionaryEntry[];
    expect(next).toHaveLength(1);
    expect(next[0].displayWord).toBe('merhaba');
    expect(next[0].practiceLanguage).toBe('tr-TR');
  });

  it('deletes only the matching practice-language record', () => {
    const onEntriesChange = jest.fn();
    const mixed = [entry('no', 'tr-TR'), entry('no', 'en-US')];
    const { getByTestId } = render(
      <SavedWordsList
        theme={theme}
        entries={mixed}
        practiceLanguage="tr-TR"
        onEntriesChange={onEntriesChange}
      />
    );

    fireEvent.press(getByTestId(SAVED_WORDS_LIST_TEST_IDS.delete('no')));

    expect(onEntriesChange).toHaveBeenCalledTimes(1);
    const next = onEntriesChange.mock.calls[0][0] as DictionaryEntry[];
    expect(next).toHaveLength(1);
    expect(next[0].practiceLanguage).toBe('en-US');
  });
});
