import { describe, expect, it } from 'vitest';
import { buildAiGenerateMessages, resolveGenerateOutputLanguage } from '../backend/utils/resolveOutputLanguage.js';
import { getAiInstruction, migrateLanguageId } from '../packages/dictionary-languages/index.js';

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
      ['fr-FR', 'French', /french/i],
      ['de-DE', 'German', /german/i],
      ['tr-TR', 'Turkish', /turkish/i],
      ['ko-KR', 'Korean', /korean/i],
      ['zh-Hans', 'Chinese', /chinese/i],
    ];
    for (const [code, name, re] of cases) {
      const text = payloadLanguageBlock(code, name);
      expect(text.toLowerCase()).not.toContain('persian (farsi)');
      expect(text).toMatch(re);
    }
  });

  it('dictionary translation language does not override AI instruction for practice language', () => {
    const aiCode = migrateLanguageId('en-GB');
    const instruction = getAiInstruction(aiCode).toLowerCase();
    expect(instruction).toContain('british');
    expect(instruction).not.toContain('persian (farsi)');
    // Simulated: translationLanguage=fa must not rewrite AI instruction for en-GB
    const translationLanguage = 'fa';
    expect(getAiInstruction(aiCode)).not.toBe(getAiInstruction(translationLanguage));
  });

  it('migrated regional Portuguese/Spanish/Chinese map to canonical AI instructions', () => {
    expect(migrateLanguageId('pt-PT')).toBe('pt-BR');
    expect(migrateLanguageId('es-MX')).toBe('es-ES');
    expect(migrateLanguageId('zh-Hant')).toBe('zh-Hans');
    expect(getAiInstruction('pt-PT').toLowerCase()).toContain('portuguese');
    expect(getAiInstruction('es-MX').toLowerCase()).toContain('spanish');
    expect(getAiInstruction('zh-Hant').toLowerCase()).toContain('chinese');
  });
});
