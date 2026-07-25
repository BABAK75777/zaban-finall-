import { describe, expect, it } from 'vitest';
import { buildAiGenerateMessages, resolveGenerateOutputLanguage } from '../backend/utils/resolveOutputLanguage.js';

function payloadLanguageBlock(code: string, name: string) {
  const messages = buildAiGenerateMessages({
    trimmedPrompt: 'Daily conversation about coffee',
    difficultyLabel: 'B1',
    cefrLevel: 'B1',
    cefrGuidance: 'intermediate',
    toneLabel: 'neutral',
    voice: 'female',
    sentenceTarget: 20,
    wordsMin: 8,
    wordsMax: 16,
    styleHint: 'medium',
    outputLanguage: { language: name, code, explicit: true },
  });
  return messages.map((m) => m.content).join('\n');
}

describe('AI generate language contract', () => {
  it('uses client practice language over prompt text', () => {
    const resolved = resolveGenerateOutputLanguage(
      'en-US',
      'English — United States',
      'یک متن کوتاه درباره سفر بنویس'
    );
    expect(resolved.code).toBe('en-US');
    expect(resolved.explicit).toBe(true);
  });

  it('does not let UI/device language override — Persian setting stays Persian', () => {
    const resolved = resolveGenerateOutputLanguage('fa', 'Persian', 'Write about coffee');
    expect(resolved.code).toBe('fa');
  });

  it('US payload asks for American spelling cues', () => {
    const text = payloadLanguageBlock('en-US', 'English — United States').toLowerCase();
    expect(text).toContain('american');
    expect(text).toMatch(/color/);
    expect(text).toMatch(/favorite/);
  });

  it('UK payload asks for British spelling cues', () => {
    const text = payloadLanguageBlock('en-GB', 'English — United Kingdom').toLowerCase();
    expect(text).toContain('british');
    expect(text).toMatch(/colour/);
    expect(text).toMatch(/favourite/);
  });

  it('French / German / Turkish / Korean / Chinese payloads are not Persian', () => {
    const cases: Array<[string, string, RegExp]> = [
      ['fr-FR', 'French — France', /french/i],
      ['de-DE', 'German', /german/i],
      ['tr-TR', 'Turkish — Turkey', /turkish/i],
      ['ko-KR', 'Korean', /korean/i],
      ['zh-Hans', 'Chinese — Simplified', /simplified chinese/i],
      ['zh-Hant', 'Chinese — Traditional', /traditional chinese/i],
    ];
    for (const [code, name, re] of cases) {
      const text = payloadLanguageBlock(code, name);
      expect(text.toLowerCase()).not.toContain('persian (farsi)');
      expect(text).toMatch(re);
    }
  });

  it('keeps Portuguese Brazil and Portugal instructions distinct', () => {
    const br = payloadLanguageBlock('pt-BR', 'Portuguese — Brazil').toLowerCase();
    const pt = payloadLanguageBlock('pt-PT', 'Portuguese — Portugal').toLowerCase();
    expect(br).toContain('brazilian');
    expect(pt).toContain('portugal');
    expect(br).not.toEqual(pt);
  });

  it('keeps Spanish regional instructions distinct', () => {
    const es = payloadLanguageBlock('es-ES', 'Spanish — Spain').toLowerCase();
    const mx = payloadLanguageBlock('es-MX', 'Spanish — Mexico').toLowerCase();
    expect(es).toContain('spain');
    expect(mx).toMatch(/mexico|latam|latin america/);
  });
});
