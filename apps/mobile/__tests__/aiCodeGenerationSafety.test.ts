import {
  CODE_GENERATION_USER_MESSAGE,
  guardAiInput,
  guardDictionaryLookupInput,
} from '../src/utils/aiPromptValidation';

describe('aiCodeGenerationSafety mobile contract', () => {
  it('blocks English code requests before network', () => {
    const result = guardAiInput('Give me Python code', { source: 'ai_story_modal' });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.userMessage).toBe(CODE_GENERATION_USER_MESSAGE);
    }
  });

  it('allows math formula practice prompts', () => {
    const result = guardAiInput('Explain E = mc^2 in simple English', {
      source: 'ai_story_modal',
    });
    expect(result.allowed).toBe(true);
  });

  it('blocks dictionary lookup for code-generation sentences', () => {
    const result = guardDictionaryLookupInput({
      word: 'login',
      context: 'Write JavaScript code for a login page',
      source: 'dictionary_lookup_mobile',
    });
    expect(result.allowed).toBe(false);
  });
});
