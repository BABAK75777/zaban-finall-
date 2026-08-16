export type WordHighlightClearReason =
  | 'lookup_closed'
  | 'navigation'
  | 'app_background'
  | 'lookup_error'
  | 'text_replaced';

export function logWordHighlightSet(word: string): void {
  console.log(`[WORD_HIGHLIGHT] set word=${word}`);
}

export function logWordHighlightCleared(reason: WordHighlightClearReason): void {
  console.log(`[WORD_HIGHLIGHT] cleared reason=${reason}`);
}

export function nextHighlightedWord(_current: string | null, word: string): string {
  return word;
}

export function clearedHighlightedWord(
  current: string | null,
  _reason: WordHighlightClearReason
): string | null {
  return current === null ? null : null;
}
