import {
  analyzeOcrContentLanguage,
  getLanguageMismatchMessage,
  validateOcrContentForPractice,
  validatePracticeLanguageForOcrEntry,
} from '../src/ocr/ocrPracticeLanguageValidation';

describe('ocrPracticeLanguageValidation', () => {
  describe('validatePracticeLanguageForOcrEntry', () => {
    it('blocks unavailable practiceLanguage before OCR', () => {
      expect(validatePracticeLanguageForOcrEntry('fr-FR')).toEqual({
        status: 'LANGUAGE_UNAVAILABLE',
        practiceLanguageId: 'fr-FR',
      });
      expect(validatePracticeLanguageForOcrEntry('de-DE').status).toBe('LANGUAGE_UNAVAILABLE');
    });

    it('allows active practice languages', () => {
      expect(validatePracticeLanguageForOcrEntry('en-US')).toEqual({
        status: 'ALLOW',
        practiceLanguageId: 'en-US',
      });
      expect(validatePracticeLanguageForOcrEntry('tr-TR')).toEqual({
        status: 'ALLOW',
        practiceLanguageId: 'tr-TR',
      });
    });
  });

  describe('Turkish practice language', () => {
    it('allows Turkish content', () => {
      expect(
        validateOcrContentForPractice('tr-TR', 'Bugün hava güzel ve ben mutluyum.')
      ).toEqual({
        status: 'ALLOW',
        practiceLanguageId: 'tr-TR',
        detectedContentLanguage: 'tr',
      });
    });

    it('blocks English content', () => {
      expect(
        validateOcrContentForPractice('tr-TR', 'Hello world. This is a short English passage.')
      ).toEqual({
        status: 'LANGUAGE_MISMATCH',
        practiceLanguageId: 'tr-TR',
        detectedContentLanguage: 'en',
      });
    });

    it('blocks Persian content', () => {
      expect(validateOcrContentForPractice('tr-TR', 'سلام دنیا')).toEqual({
        status: 'LANGUAGE_MISMATCH',
        practiceLanguageId: 'tr-TR',
        detectedContentLanguage: 'fa',
      });
    });

    it('blocks mixed Persian + English content', () => {
      const mixed = 'سلام hello world';
      expect(analyzeOcrContentLanguage(mixed)).toBe('mixed');
      expect(validateOcrContentForPractice('tr-TR', mixed)).toEqual({
        status: 'LANGUAGE_MISMATCH',
        practiceLanguageId: 'tr-TR',
        detectedContentLanguage: 'mixed',
      });
    });
  });

  describe('English US practice language', () => {
    it('allows English content', () => {
      expect(
        validateOcrContentForPractice('en-US', 'Hello world. This is a short English passage.')
      ).toEqual({
        status: 'ALLOW',
        practiceLanguageId: 'en-US',
        detectedContentLanguage: 'en',
      });
    });

    it('blocks Turkish content', () => {
      expect(
        validateOcrContentForPractice('en-US', 'Bugün hava güzel ve ben mutluyum.')
      ).toEqual({
        status: 'LANGUAGE_MISMATCH',
        practiceLanguageId: 'en-US',
        detectedContentLanguage: 'tr',
      });
    });

    it('blocks Persian content', () => {
      expect(validateOcrContentForPractice('en-US', 'این یک متن فارسی است')).toEqual({
        status: 'LANGUAGE_MISMATCH',
        practiceLanguageId: 'en-US',
        detectedContentLanguage: 'fa',
      });
    });
  });

  describe('mismatch dialog copy', () => {
    it('uses Turkish message for tr-TR practice', () => {
      expect(getLanguageMismatchMessage('tr-TR')).toBe(
        'This content is not in Turkish. Please change your practice language.'
      );
    });

    it('uses English message for en-US practice', () => {
      expect(getLanguageMismatchMessage('en-US')).toBe(
        'This content is not in English. Please change your practice language.'
      );
    });
  });
});
