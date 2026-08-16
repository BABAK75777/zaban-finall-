import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { WordLookupSheet, WORD_LOOKUP_TEST_IDS } from '../src/ui/WordLookupSheet';
import { getTheme } from '../src/theme/themes';

describe('WordLookupSheet', () => {
  const theme = getTheme('dark');

  function renderSheet(props: Partial<React.ComponentProps<typeof WordLookupSheet>> = {}) {
    return render(
      <TestSafeAreaProvider>
        <WordLookupSheet
          visible
          theme={theme}
          displayWord="hello"
          targetLanguage="fa"
          meaning="سلام"
          loading={false}
          error={null}
          savedToDictionary={false}
          practiceUsedCount={0}
          practiceTargetUses={3}
          practiceStarred={false}
          lookupCount={1}
          canToggleSave
          onClose={() => {}}
          onToggleSave={() => {}}
          {...props}
        />
      </TestSafeAreaProvider>
    );
  }

  it('shows meaning and save star', () => {
    const onToggleSave = jest.fn();
    const { getByTestId } = renderSheet({ onToggleSave });

    expect(getByTestId(WORD_LOOKUP_TEST_IDS.meaning).props.children).toBe('سلام');
    expect(getByTestId(WORD_LOOKUP_TEST_IDS.saveStar)).toBeTruthy();
    fireEvent.press(getByTestId(WORD_LOOKUP_TEST_IDS.saveStar));
    expect(onToggleSave).toHaveBeenCalledTimes(1);
  });

  it('shows cached meaning while refreshing', () => {
    const { getByTestId, queryByTestId } = renderSheet({
      loading: true,
      canToggleSave: false,
    });

    expect(getByTestId(WORD_LOOKUP_TEST_IDS.meaning).props.children).toBe('سلام');
    expect(queryByTestId(WORD_LOOKUP_TEST_IDS.meaning)).toBeTruthy();
  });

  it('shows practice progress for saved words', () => {
    const { getByText } = renderSheet({
      displayWord: 'run',
      meaning: 'دویدن',
      savedToDictionary: true,
      practiceUsedCount: 2,
      practiceTargetUses: 5,
      practiceStarred: true,
      lookupCount: 2,
    });

    expect(getByText('★ Practice progress: 2/5')).toBeTruthy();
  });
});
