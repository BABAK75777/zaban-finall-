import { describe, expect, it } from 'vitest';
import {
  buildDictionaryLookupMessages,
  isDictionaryLanguageCode,
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
    expect(messages[1].content).toContain('Persian');
  });

  it('parses JSON lookup responses', () => {
    const parsed = parseDictionaryLookupResponse(
      '{"meaning":"سلام","partOfSpeech":"interjection"}'
    );
    expect(parsed?.meaning).toBe('سلام');
    expect(parsed?.partOfSpeech).toBe('interjection');
  });
});
