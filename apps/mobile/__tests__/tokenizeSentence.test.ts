import {
  countWordInText,
  hashReadingText,
  normalizeLookupWord,
  tokenizeSentence,
} from '../src/dictionary/tokenizeSentence';

describe('tokenizeSentence', () => {
  it('splits words and keeps punctuation gaps', () => {
    const tokens = tokenizeSentence('Hello, world!');
    expect(tokens.filter((t) => t.type === 'word').map((t) => t.display)).toEqual([
      'Hello',
      'world',
    ]);
    expect(tokens.some((t) => t.type === 'text' && t.value.includes(','))).toBe(true);
  });

  it('normalizes lookup keys', () => {
    expect(normalizeLookupWord('"Hello,"')).toBe('hello');
  });

  it('counts word occurrences in text', () => {
    const text = 'The cat sat. Another cat ran.';
    expect(countWordInText('cat', text)).toBe(2);
  });

  it('hashes reading text consistently', () => {
    expect(hashReadingText('abc')).toBe(hashReadingText('abc'));
    expect(hashReadingText('abc')).not.toBe(hashReadingText('abcd'));
  });
});
