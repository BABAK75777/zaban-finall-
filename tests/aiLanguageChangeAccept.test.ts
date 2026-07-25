import { describe, expect, it, vi } from 'vitest';
import {
  buildLanguageSwitchGeneratePayload,
  buildLanguageSwitchRegeneratePrompt,
  resolveAiLanguageAcceptAction,
} from '../apps/mobile/src/ai/aiLanguageChange';

describe('AI language Accept behavior', () => {
  it('same-language Accept is a no-op', () => {
    expect(
      resolveAiLanguageAcceptAction({
        savedLanguageId: 'en-US',
        acceptedLanguageId: 'en-US',
        hasGeneratedText: true,
      })
    ).toBe('noop');
  });

  it('compares stable IDs not labels (aliases map to same id)', () => {
    expect(
      resolveAiLanguageAcceptAction({
        savedLanguageId: 'en-US',
        acceptedLanguageId: 'en',
        hasGeneratedText: true,
      })
    ).toBe('noop');
  });

  it('different language with existing text regenerates', () => {
    expect(
      resolveAiLanguageAcceptAction({
        savedLanguageId: 'en-US',
        acceptedLanguageId: 'en-GB',
        hasGeneratedText: true,
      })
    ).toBe('save_and_regenerate');
  });

  it('different language with no text saves only', () => {
    expect(
      resolveAiLanguageAcceptAction({
        savedLanguageId: 'en-US',
        acceptedLanguageId: 'en-GB',
        hasGeneratedText: false,
      })
    ).toBe('save_only');
  });

  it('whitespace-only text counts as no generated content', () => {
    expect(
      resolveAiLanguageAcceptAction({
        savedLanguageId: 'fr-FR',
        acceptedLanguageId: 'de-DE',
        hasGeneratedText: '   '.trim().length > 0,
      })
    ).toBe('save_only');
  });

  it('language-switch payload uses en-GB British instruction', () => {
    const payload = buildLanguageSwitchGeneratePayload(
      'en-GB',
      'I like the color of my favorite apartment.'
    );
    expect(payload.targetLanguage).toBe('en-GB');
    expect(payload.targetLocale).toBe('en-GB');
    expect(payload.targetLanguageInstruction.toLowerCase()).toContain('british');
    expect(payload.prompt).toContain('color of my favorite apartment');
    expect(buildLanguageSwitchRegeneratePrompt('hello').toLowerCase()).toContain('reference text');
  });

  it('language-switch payload uses en-US American instruction', () => {
    const payload = buildLanguageSwitchGeneratePayload('en-US', 'I colour the flat.');
    expect(payload.targetLanguage).toBe('en-US');
    expect(payload.targetLocale).toBe('en-US');
    expect(payload.targetLanguageInstruction.toLowerCase()).toContain('american');
  });
});

describe('AI language change race token', () => {
  it('ignores stale AI result after a newer language change token', async () => {
    const tokenRef = { current: 1 };
    const apply = vi.fn();

    const runGenerate = async (tokenAtStart: number, text: string) => {
      await Promise.resolve();
      if (tokenAtStart !== tokenRef.current) return;
      apply(text);
    };

    const us = runGenerate(tokenRef.current, 'US text');
    tokenRef.current += 1;
    const gb = runGenerate(tokenRef.current, 'UK text');
    await Promise.all([us, gb]);

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith('UK text');
  });
});
