import {
  DICTIONARY_LANGUAGES,
  PRACTICE_LANGUAGES,
  dictionaryLanguageLabel,
} from '../src/dictionary/dictionaryLanguages';

describe('dictionary / practice language labels', () => {
  it('lists all registry languages for pickers', () => {
    expect(DICTIONARY_LANGUAGES.length).toBe(PRACTICE_LANGUAGES.length);
    expect(DICTIONARY_LANGUAGES.map((l) => l.label)).toContain('English — United States');
    expect(DICTIONARY_LANGUAGES.map((l) => l.label)).toContain('English — United Kingdom');
    expect(DICTIONARY_LANGUAGES.map((l) => l.label)).toContain('Persian');
  });

  it('labels stable ids', () => {
    expect(dictionaryLanguageLabel('en-US')).toBe('English — United States');
    expect(dictionaryLanguageLabel('en-GB')).toBe('English — United Kingdom');
  });
});
