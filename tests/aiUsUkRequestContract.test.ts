import { describe, expect, it } from 'vitest';
import {
  getAiInstruction,
  resolvePracticeLanguage,
} from '../packages/dictionary-languages/index.js';
import {
  buildAiGenerateMessages,
  resolveGenerateOutputLanguage,
} from '../backend/utils/resolveOutputLanguage.js';

/** Deterministic mocked AI request builder — no live network. */
function buildClientGeneratePayload(practiceLanguageId: string, prompt: string) {
  const outputLanguage = resolveGenerateOutputLanguage(
    practiceLanguageId,
    resolvePracticeLanguage(practiceLanguageId)?.label ?? practiceLanguageId,
    prompt,
    {
      targetLocale: resolvePracticeLanguage(practiceLanguageId)?.locale,
      targetLanguageInstruction: getAiInstruction(practiceLanguageId),
    }
  );
  return {
    targetLanguage: outputLanguage.code,
    targetLanguageName: outputLanguage.language,
    targetLocale: outputLanguage.locale,
    targetLanguageInstruction: outputLanguage.instruction,
    messages: buildAiGenerateMessages({
      trimmedPrompt: prompt,
      difficultyLabel: 'B1',
      cefrLevel: 'B1',
      cefrGuidance: 'intermediate',
      toneLabel: 'neutral',
      voice: 'female',
      sentenceTarget: 20,
      wordsMin: 8,
      wordsMax: 16,
      styleHint: 'medium',
      outputLanguage,
    }),
  };
}

describe('en-US vs en-GB AI request contract (mocked)', () => {
  const persianPrompt = 'یک متن کوتاه درباره سفر بنویس';

  it('builds distinct locale/variant payloads and never falls back to Persian', () => {
    const us = buildClientGeneratePayload('en-US', persianPrompt);
    const uk = buildClientGeneratePayload('en-GB', persianPrompt);

    expect(us.targetLanguage).toBe('en-US');
    expect(uk.targetLanguage).toBe('en-GB');
    expect(us.targetLocale).toBe('en-US');
    expect(uk.targetLocale).toBe('en-GB');
    expect(us.targetLanguageInstruction).not.toEqual(uk.targetLanguageInstruction);

    const usText = us.messages.map((m) => m.content).join('\n').toLowerCase();
    const ukText = uk.messages.map((m) => m.content).join('\n').toLowerCase();

    expect(usText).toContain('american');
    expect(usText).toMatch(/color/);
    expect(usText).not.toContain('persian (farsi)');
    expect(ukText).toContain('british');
    expect(ukText).toMatch(/colour/);
    expect(ukText).not.toContain('persian (farsi)');
    expect(usText).not.toEqual(ukText);
  });
});
