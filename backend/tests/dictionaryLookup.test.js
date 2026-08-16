import { describe, expect, it } from 'vitest';
import {
  buildDictionaryLookupMessages,
  dictionaryPromptMentionsPersianOutput,
  isDictionaryLanguageCode,
  isPrimarilyPersianScript,
  parseDictionaryLookupResponse,
} from '../utils/dictionaryLookup.js';

describe('dictionaryLookup', () => {
  it('accepts supported language codes', () => {
    expect(isDictionaryLanguageCode('fa')).toBe(true);
    expect(isDictionaryLanguageCode('en')).toBe(true);
    expect(isDictionaryLanguageCode('uk')).toBe(true);
    expect(isDictionaryLanguageCode('xx')).toBe(false);
  });

  it('builds lookup messages with target language', () => {
    const messages = buildDictionaryLookupMessages({
      word: 'hello',
      context: 'Hello world.',
      targetLanguage: 'fa',
    });
    expect(messages[1].content).toContain('hello');
    expect(messages[1].content).toContain('fa');
  });

  it('requires English output for English target', () => {
    const messages = buildDictionaryLookupMessages({
      word: 'hello',
      targetLanguage: 'en',
      targetLanguageName: 'English',
    });
    expect(messages[1].content).toContain('English');
    expect(messages[1].content).toContain('Do NOT use Persian or Farsi');
    expect(dictionaryPromptMentionsPersianOutput(messages[1].content, 'en')).toBe(false);
  });

  it('builds Russian lookup without Persian fallback wording', () => {
    const messages = buildDictionaryLookupMessages({
      word: 'hello',
      targetLanguage: 'ru',
      targetLanguageName: 'Russian',
    });
    expect(messages[1].content).toContain('Russian');
    expect(messages[1].content).toContain('Do NOT use Persian or Farsi');
  });

  it('parses JSON lookup responses', () => {
    const parsed = parseDictionaryLookupResponse(
      '{"meaning":"سلام","partOfSpeech":"interjection"}'
    );
    expect(parsed?.meaning).toBe('سلام');
    expect(parsed?.partOfSpeech).toBe('interjection');
  });

  it('detects primarily Persian script', () => {
    expect(isPrimarilyPersianScript('سلام دنیا')).toBe(true);
    expect(isPrimarilyPersianScript('hello world')).toBe(false);
  });
});
