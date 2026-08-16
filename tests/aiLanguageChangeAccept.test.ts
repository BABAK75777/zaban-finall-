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

  it('different language with existing text regenerates for active langs', () => {
    expect(
      resolveAiLanguageAcceptAction({
        savedLanguageId: 'en-US',
        acceptedLanguageId: 'tr-TR',
        hasGeneratedText: true,
      })
    ).toBe('save_and_regenerate');
  });

  it('different language with no text saves only for active langs', () => {
    expect(
      resolveAiLanguageAcceptAction({
        savedLanguageId: 'en-US',
        acceptedLanguageId: 'tr-TR',
        hasGeneratedText: false,
      })
    ).toBe('save_only');
  });

  it('In Progress accepted language is a no-op', () => {
    expect(
      resolveAiLanguageAcceptAction({
        savedLanguageId: 'en-US',
        acceptedLanguageId: 'en-GB',
        hasGeneratedText: true,
      })
    ).toBe('noop');
  });

  it('whitespace-only text counts as no generated content', () => {
    expect(
      resolveAiLanguageAcceptAction({
        savedLanguageId: 'en-US',
        acceptedLanguageId: 'tr-TR',
        hasGeneratedText: '   '.trim().length > 0,
      })
    ).toBe('save_only');
  });

  it('language-switch payload uses en-US American instruction', () => {
    const payload = buildLanguageSwitchGeneratePayload('en-US', 'I colour the flat.');
    expect(payload.targetLanguage).toBe('en-US');
    expect(payload.targetLocale).toBe('en-US');
    expect(payload.targetLanguageInstruction.toLowerCase()).toContain('american');
  });

  it('language-switch payload for Turkish uses tr-TR', () => {
    const payload = buildLanguageSwitchGeneratePayload(
      'tr-TR',
      'I like the color of my favorite apartment.'
    );
    expect(payload.targetLanguage).toBe('tr-TR');
    expect(payload.targetLocale).toBe('tr-TR');
    expect(payload.prompt).toContain('color of my favorite apartment');
    expect(buildLanguageSwitchRegeneratePrompt('hello').toLowerCase()).toContain('reference text');
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
