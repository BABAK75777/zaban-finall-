import { describe, expect, it } from 'vitest';
import { DICTIONARY_LANGUAGES, PRACTICE_LANGUAGES } from '../apps/mobile/src/dictionary/dictionaryLanguages';

describe('dictionary settings UI constants', () => {
  it('supports expanded practice languages including US/UK English', () => {
    expect(DICTIONARY_LANGUAGES.length).toBe(PRACTICE_LANGUAGES.length);
    expect(DICTIONARY_LANGUAGES.map((l) => l.label)).toContain('English — United States');
    expect(DICTIONARY_LANGUAGES.map((l) => l.label)).toContain('Persian');
    expect(DICTIONARY_LANGUAGES.map((l) => l.label)).toContain('Urdu');
  });
});
