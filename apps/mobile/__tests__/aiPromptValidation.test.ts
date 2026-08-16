import {
  AI_PROMPT_MAX_LENGTH,
  AI_PROMPT_VALIDATION_MESSAGE,
  escapeAiPromptForDisplay,
  validateAiPrompt,
} from '../src/utils/aiPromptValidation';

describe('aiPromptValidation', () => {
  it('accepts a normal plain-language prompt', () => {
    expect(validateAiPrompt('Practice travel vocabulary in German.')).toEqual({
      ok: true,
      prompt: 'Practice travel vocabulary in German.',
    });
  });

  it('rejects prompts longer than 1000 characters', () => {
    const result = validateAiPrompt('x'.repeat(AI_PROMPT_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(AI_PROMPT_VALIDATION_MESSAGE);
    }
  });

  it('rejects script tags', () => {
    const result = validateAiPrompt('<script>alert(1)</script>');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(AI_PROMPT_VALIDATION_MESSAGE);
    }
  });

  it('rejects code fences', () => {
    const result = validateAiPrompt('Try ```code``` here');
    expect(result.ok).toBe(false);
  });

  it('rejects javascript: URIs', () => {
    const result = validateAiPrompt('visit javascript:alert(1)');
    expect(result.ok).toBe(false);
  });

  it('escapes unsafe markup for display', () => {
    const escaped = escapeAiPromptForDisplay('<img onerror=1 />');
    expect(escaped).not.toMatch(/[<>]/);
    expect(escaped).toContain('&lt;img');
  });
});
