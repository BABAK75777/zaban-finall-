import { useCallback, useState } from 'react';
import {
  clearedHighlightedWord,
  logWordHighlightCleared,
  logWordHighlightSet,
  nextHighlightedWord,
  type WordHighlightClearReason,
} from './wordHighlight';

export function useWordHighlight() {
  const [highlightedWord, setHighlightedWordState] = useState<string | null>(null);

  const setHighlightedWord = useCallback((word: string) => {
    logWordHighlightSet(word);
    setHighlightedWordState(nextHighlightedWord(null, word));
  }, []);

  const clearHighlightedWord = useCallback((reason: WordHighlightClearReason) => {
    setHighlightedWordState((current) => {
      const next = clearedHighlightedWord(current, reason);
      if (current !== null && next === null) {
        logWordHighlightCleared(reason);
      }
      return next;
    });
  }, []);

  return { highlightedWord, setHighlightedWord, clearHighlightedWord };
}
