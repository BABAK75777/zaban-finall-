import { DICTIONARY_LANGUAGES, dictionaryLanguageLabel } from '../src/dictionary/dictionaryLanguages';

describe('dictionaryLanguages', () => {
  it('lists exactly 13 supported translation languages', () => {
    expect(DICTIONARY_LANGUAGES).toHaveLength(13);
    expect(DICTIONARY_LANGUAGES.map((l) => l.label)).toEqual([
      'Arabic',
      'English',
      'French',
      'German',
      'Hindi',
      'Korean',
      'Persian',
      'Portuguese',
      'Russian',
      'Spanish',
      'Turkish',
      'Ukrainian',
      'Urdu',
    ]);
  });

  it('resolves labels by code', () => {
    expect(dictionaryLanguageLabel('en')).toBe('English');
    expect(dictionaryLanguageLabel('fa')).toBe('Persian');
    expect(dictionaryLanguageLabel('ur')).toBe('Urdu');
  });
});
