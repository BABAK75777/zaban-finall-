import { resolvePracticeOutputLanguage } from '../src/utils/resolvePracticeOutputLanguage';
import { resolveOutputLanguage } from '../src/utils/resolveOutputLanguage';

describe('resolvePracticeOutputLanguage', () => {
  it('uses selected practice language even when prompt names another language', () => {
    expect(
      resolvePracticeOutputLanguage('Write a short story in German about travel', 'en-US')
    ).toEqual({
      language: 'English — United States',
      code: 'en-US',
      explicit: true,
    });
  });

  it('does not let Persian prompt override English selection', () => {
    expect(
      resolvePracticeOutputLanguage('یک متن کوتاه درباره سفر بنویس', 'en-US')
    ).toEqual({
      language: 'English — United States',
      code: 'en-US',
      explicit: true,
    });
  });

  it('honors UK English selection', () => {
    expect(resolvePracticeOutputLanguage('coffee chat', 'en-GB')).toEqual({
      language: 'English — United Kingdom',
      code: 'en-GB',
      explicit: true,
    });
  });

  it('migrates legacy en code to en-US', () => {
    expect(resolvePracticeOutputLanguage('hello', 'en').code).toBe('en-US');
  });

  it('prompt helper still detects languages for diagnostics only', () => {
    expect(resolveOutputLanguage('Write in German about cats').code).toBe('de');
    expect(resolveOutputLanguage('داستان درباره ترکیب علم و هنر').explicit).toBe(false);
  });
});
