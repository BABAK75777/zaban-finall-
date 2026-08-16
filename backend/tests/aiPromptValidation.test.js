import { describe, expect, it } from 'vitest';
import {
  AI_PROMPT_VALIDATION_MESSAGE,
  CODE_GENERATION_USER_MESSAGE,
  guardAiInput,
  validateAiPrompt,
} from '@zaban/ai-prompt-validation';

describe('backend ai prompt validation contract', () => {
  it('uses the shared friendly rejection message for unsafe prompts', () => {
    const result = validateAiPrompt('<script>alert(1)</script>');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(AI_PROMPT_VALIDATION_MESSAGE);
    }
  });

  it('blocks multilingual code generation prompts', () => {
    const result = guardAiInput('کد پایتون بنویس', { source: 'ai_generate' });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.userMessage).toBe(CODE_GENERATION_USER_MESSAGE);
    }
  });
});
