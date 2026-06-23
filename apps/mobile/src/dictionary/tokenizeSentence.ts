/** Split sentence into tappable word tokens and literal gaps. */
export type SentenceToken =
  | { type: 'word'; display: string; lookup: string }
  | { type: 'text'; value: string };

const WORD_PATTERN = /[\p{L}\p{N}'’-]+/gu;

export function normalizeLookupWord(word: string): string {
  return word
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .toLowerCase();
}

export function tokenizeSentence(text: string): SentenceToken[] {
  if (!text) return [];

  const tokens: SentenceToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const re = new RegExp(WORD_PATTERN.source, 'gu');
  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    const display = match[0];
    const lookup = normalizeLookupWord(display);

    if (start > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, start) });
    }

    if (lookup) {
      tokens.push({ type: 'word', display, lookup });
    } else {
      tokens.push({ type: 'text', value: display });
    }

    lastIndex = start + display.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens;
}

/** Split reading text into rough sentences for practice-word checks. */
export function splitTextIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Count sentences that contain the word at least once. */
export function countSentencesWithWord(word: string, fullText: string): number {
  if (!normalizeLookupWord(word)) return 0;
  return splitTextIntoSentences(fullText).filter((sentence) => countWordInText(word, sentence) > 0)
    .length;
}

/** Count how many times a word appears in full text (case-insensitive). */
export function countWordInText(word: string, fullText: string): number {
  const normalized = normalizeLookupWord(word);
  if (!normalized) return 0;

  const re = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(normalized)}(?=[^\\p{L}\\p{N}]|$)`,
    'giu'
  );
  const matches = fullText.match(re);
  return matches?.length ?? 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Stable id for a reading body (for appearance tracking). */
export function hashReadingText(text: string): string {
  let hash = 2166136261;
  const trimmed = text.trim();
  for (let i = 0; i < trimmed.length; i += 1) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `t${(hash >>> 0).toString(36)}`;
}
