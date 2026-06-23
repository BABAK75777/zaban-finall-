/** Languages available for on-screen word translation (meanings). */
export const DICTIONARY_LANGUAGES = [
  { code: 'ar', label: 'Arabic' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ko', label: 'Korean' },
  { code: 'fa', label: 'Persian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'es', label: 'Spanish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'ur', label: 'Urdu' },
] as const;

export type DictionaryLanguageCode = (typeof DICTIONARY_LANGUAGES)[number]['code'];

export const DEFAULT_DICTIONARY_LANGUAGE: DictionaryLanguageCode = 'fa';

export function isDictionaryLanguageCode(value: unknown): value is DictionaryLanguageCode {
  return (
    typeof value === 'string' &&
    DICTIONARY_LANGUAGES.some((lang) => lang.code === value)
  );
}

export function dictionaryLanguageLabel(code: DictionaryLanguageCode): string {
  return DICTIONARY_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
