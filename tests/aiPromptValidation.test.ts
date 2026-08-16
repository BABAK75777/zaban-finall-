import { describe, expect, it } from 'vitest';
import {
  AI_PROMPT_MAX_LENGTH,
  AI_PROMPT_VALIDATION_MESSAGE,
  escapeAiPromptForDisplay,
  validateAiPrompt,
} from '@zaban/ai-prompt-validation';

describe('validateAiPrompt', () => {
  it('accepts a normal plain-language prompt', () => {
    const result = validateAiPrompt('Write a short story about travel in German.');
    expect(result).toEqual({
      ok: true,
      prompt: 'Write a short story about travel in German.',
    });
  });

  it('rejects prompts longer than 1000 characters', () => {
    const result = validateAiPrompt('a'.repeat(AI_PROMPT_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(AI_PROMPT_VALIDATION_MESSAGE);
      expect(result.code).toBe('TOO_LONG');
    }
  });

  it('rejects script tags', () => {
    const result = validateAiPrompt('Hello <script>alert(1)</script>');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(AI_PROMPT_VALIDATION_MESSAGE);
    }
  });

  it('rejects markdown code fences', () => {
    const result = validateAiPrompt('Use ```js\nconsole.log(1)\n``` in the answer');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(AI_PROMPT_VALIDATION_MESSAGE);
    }
  });

  it('rejects javascript: URIs', () => {
    const result = validateAiPrompt('Open javascript:alert(1) please');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(AI_PROMPT_VALIDATION_MESSAGE);
    }
  });
});

describe('escapeAiPromptForDisplay', () => {
  it('escapes HTML-sensitive characters', () => {
    expect(escapeAiPromptForDisplay('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  it('never leaves raw angle brackets in escaped output', () => {
    const escaped = escapeAiPromptForDisplay('<b>bold</b>');
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
  });
});
