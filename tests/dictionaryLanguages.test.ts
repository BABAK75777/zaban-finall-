import { describe, expect, it } from 'vitest';
import { DICTIONARY_LANGUAGES } from '../apps/mobile/src/dictionary/dictionaryLanguages';

describe('dictionary settings UI constants', () => {
  it('supports all required translation languages', () => {
    expect(DICTIONARY_LANGUAGES).toHaveLength(13);
    expect(DICTIONARY_LANGUAGES.map((l) => l.label)).toContain('English');
    expect(DICTIONARY_LANGUAGES.map((l) => l.label)).toContain('Persian');
    expect(DICTIONARY_LANGUAGES.map((l) => l.label)).toContain('Urdu');
  });
});
