import { describe, expect, it } from 'vitest';
import {
  CODE_GENERATION_NOT_ALLOWED_REASON,
  CODE_GENERATION_USER_MESSAGE,
  guardAiInput,
  guardDictionaryLookupInput,
  isCodeGenerationRequest,
  isMathOrPhysicsFormulaRequest,
} from '@zaban/ai-prompt-validation';

describe('ai code generation safety', () => {
  const blockedCases = [
    ['en', 'Write JavaScript code for a login page'],
    ['en', 'Give me Python code'],
    ['en', 'Build me an Android app'],
    ['fa', 'کد جاوااسکریپت بده'],
    ['fa', 'برام برنامه بنویس'],
    ['fa', 'کد پایتون بنویس'],
    ['ru', 'Напиши код на Python'],
    ['ur', 'Python code likho'],
    ['hi', 'Python code likho'],
    ['tr', 'Bana JavaScript kodu yaz'],
  ] as const;

  const allowedCases = [
    ['en', 'Explain E = mc^2 in simple English'],
    ['en', 'Solve a^2 + b^2 = c^2 example'],
    ['fa', 'فرمول نیرو F = ma را توضیح بده'],
    ['fa', 'معادله درجه دو را توضیح بده'],
    ['en', 'Explain this physics formula'],
    ['en', 'Give me English practice sentences about math'],
    ['en', 'Write a short story about travel in German.'],
    ['en', 'Translate the word hello into Spanish'],
  ] as const;

  it.each(blockedCases)('blocks code generation (%s): %s', (language, input) => {
    expect(isCodeGenerationRequest(input)).toBe(true);
    const result = guardAiInput(input, { source: `test_${language}` });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe(CODE_GENERATION_NOT_ALLOWED_REASON);
      expect(result.outputText).toBe('');
      expect(result.userMessage).toBe(CODE_GENERATION_USER_MESSAGE);
    }
  });

  it.each(allowedCases)('allows language learning and math (%s): %s', (language, input) => {
    expect(isCodeGenerationRequest(input)).toBe(false);
    const result = guardAiInput(input, { source: `test_${language}` });
    expect(result.allowed).toBe(true);
    if (result.allowed && input.includes('formula') || input.includes('فرمول') || input.includes('mc')) {
      expect(
        isMathOrPhysicsFormulaRequest(input) || result.kind === 'normal'
      ).toBe(true);
    }
  });

  it('blocks dictionary lookup when sentence is a code request', () => {
    const result = guardDictionaryLookupInput({
      word: 'Python',
      context: 'Python code likho',
      source: 'dictionary_lookup',
    });
    expect(result.allowed).toBe(false);
  });

  it('allows dictionary lookup for normal reading sentences', () => {
    const result = guardDictionaryLookupInput({
      word: 'energy',
      context: 'Explain E = mc^2 in simple English',
      source: 'dictionary_lookup',
    });
    expect(result.allowed).toBe(true);
  });
});
