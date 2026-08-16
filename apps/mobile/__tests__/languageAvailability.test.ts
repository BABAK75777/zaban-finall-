import {
  assertPracticeLanguageProcessable,
  ensureProcessablePracticeLanguage,
  getVisibleDictionaryLanguages,
  getVisiblePracticeLanguages,
  isDictionaryLanguageProductActive,
  isPracticeLanguageProductActive,
  IN_PROGRESS_DIALOG_BUTTON,
  IN_PROGRESS_DIALOG_MESSAGE,
  IN_PROGRESS_DIALOG_TITLE,
  LANGUAGE_REQUEST_CTA_LABEL,
} from '../src/dictionary/languageAvailability';
import { DEFAULT_PRACTICE_LANGUAGE } from '../src/dictionary/dictionaryLanguages';

describe('languageAvailability product layer', () => {
  it('Practice visible list is exactly 8 (2 active + 6 in progress)', () => {
    const list = getVisiblePracticeLanguages();
    expect(list).toHaveLength(8);
    expect(list.filter((l) => l.status === 'active')).toHaveLength(2);
    expect(list.filter((l) => l.status === 'in_progress')).toHaveLength(6);
    expect(list.map((l) => l.id)).toEqual([
      'en-US',
      'tr-TR',
      'fr-FR',
      'de-DE',
      'ru-RU',
      'en-GB',
      'it-IT',
      'es-ES',
    ]);
  });

  it('Dictionary visible list is exactly 9 (3 active + 6 in progress)', () => {
    const list = getVisibleDictionaryLanguages();
    expect(list).toHaveLength(9);
    expect(list.filter((l) => l.status === 'active')).toHaveLength(3);
    expect(list.filter((l) => l.status === 'in_progress')).toHaveLength(6);
    expect(list.map((l) => l.id)).toEqual([
      'en-US',
      'tr-TR',
      'fa',
      'fr-FR',
      'de-DE',
      'ru-RU',
      'en-GB',
      'it-IT',
      'es-ES',
    ]);
  });

  it('central Practice guard allows only active languages', () => {
    expect(assertPracticeLanguageProcessable('en-US')).toEqual({
      allowed: true,
      languageId: 'en-US',
    });
    expect(assertPracticeLanguageProcessable('tr-TR').allowed).toBe(true);
    const blocked = ['fr-FR', 'de-DE', 'ru-RU', 'en-GB', 'it-IT', 'es-ES', 'ja-JP', 'ar'] as const;
    for (const id of blocked) {
      const result = assertPracticeLanguageProcessable(id);
      expect({ id, result }).toEqual({
        id,
        result: {
          allowed: false,
          languageId: expect.any(String),
          reason: 'unavailable',
        },
      });
      expect(isPracticeLanguageProductActive(id)).toBe(false);
    }
  });

  it('stale stored Practice language cannot pass ensureProcessable', () => {
    expect(ensureProcessablePracticeLanguage('fr-FR')).toBe(DEFAULT_PRACTICE_LANGUAGE);
    expect(ensureProcessablePracticeLanguage('de-DE')).toBe(DEFAULT_PRACTICE_LANGUAGE);
    expect(ensureProcessablePracticeLanguage('ja-JP')).toBe(DEFAULT_PRACTICE_LANGUAGE);
  });

  it('Dictionary active set includes Persian; in progress cannot be active', () => {
    expect(isDictionaryLanguageProductActive('fa')).toBe(true);
    expect(isDictionaryLanguageProductActive('en-US')).toBe(true);
    expect(isDictionaryLanguageProductActive('tr-TR')).toBe(true);
    expect(isDictionaryLanguageProductActive('fr-FR')).toBe(false);
  });

  it('In Progress dialog copy constants match product requirement', () => {
    expect(IN_PROGRESS_DIALOG_TITLE).toBe('In Progress');
    expect(IN_PROGRESS_DIALOG_MESSAGE).toBe("Sorry, this language isn’t available yet.");
    expect(IN_PROGRESS_DIALOG_BUTTON).toBe('OK');
  });

  it('language request CTA label references mamlio.com without inventing a form path', () => {
    expect(LANGUAGE_REQUEST_CTA_LABEL.toLowerCase()).toContain('mamlio.com');
    expect(LANGUAGE_REQUEST_CTA_LABEL).not.toMatch(/\/language-request|\/request-language/i);
  });
});
