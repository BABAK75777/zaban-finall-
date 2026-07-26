import { describe, expect, it } from 'vitest';
import { buildOpenRouterSpeechBody } from '../backend/utils/openrouter.js';
import {
  AI_GENERATION_LANGUAGE_IDS,
  buildTtsCacheVoiceKey,
  enumerateAiTtsVoiceMappings,
  getTtsInstruction,
  getTtsLocale,
  normalizeTtsGender,
  resolveProviderVoiceId,
  resolveTtsVoiceMapping,
} from '../packages/dictionary-languages/index.js';

const GROK = 'x-ai/grok-voice-tts-1.0';
const GEMINI = 'google/gemini-3.1-flash-tts-preview';

describe('TTS voice gender × language matrix (58 cases)', () => {
  it('exposes exactly 29 AI generation languages', () => {
    expect(AI_GENERATION_LANGUAGE_IDS).toHaveLength(29);
  });

  it('enumerates 58 deterministic mappings with no null/undefined slips', () => {
    const rows = enumerateAiTtsVoiceMappings();
    expect(rows).toHaveLength(58);

    for (const row of rows) {
      expect(row.ok).toBe(true);
      expect(row.unsupportedReason).toBeNull();
      expect(AI_GENERATION_LANGUAGE_IDS).toContain(row.languageId);
      expect(row.locale).toBe(getTtsLocale(row.languageId));
      expect(row.gender === 'female' || row.gender === 'male').toBe(true);
      expect(row.appVoice).toBe(row.gender);
      expect(typeof row.accentInstruction).toBe('string');
      expect(row.accentInstruction.length).toBeGreaterThan(0);
      expect(row.providerVoiceByModel[GROK]).toBeTruthy();
      expect(row.providerVoiceByModel[GEMINI]).toBeTruthy();
      expect(row.locale).toBeTruthy();
      expect(row.languageId).toBeTruthy();
    }
  });

  it('never maps a language onto an unrelated language id', () => {
    for (const languageId of AI_GENERATION_LANGUAGE_IDS) {
      for (const gender of ['female', 'male'] as const) {
        const mapping = resolveTtsVoiceMapping({ languageId, gender });
        expect(mapping.languageId).toBe(languageId);
        expect(mapping.locale).toBe(getTtsLocale(languageId));
      }
    }
  });

  it('female and male provider requests differ for every language when gendered voices exist', () => {
    for (const languageId of AI_GENERATION_LANGUAGE_IDS) {
      const female = resolveTtsVoiceMapping({ languageId, gender: 'female' });
      const male = resolveTtsVoiceMapping({ languageId, gender: 'male' });

      expect(female.gender).toBe('female');
      expect(male.gender).toBe('male');
      expect(resolveProviderVoiceId(GROK, 'female')).not.toBe(
        resolveProviderVoiceId(GROK, 'male')
      );
      expect(resolveProviderVoiceId(GEMINI, 'female')).not.toBe(
        resolveProviderVoiceId(GEMINI, 'male')
      );

      const femaleBody = buildOpenRouterSpeechBody({
        model: GROK,
        text: 'Sample',
        voice: female.appVoice,
        responseFormat: 'mp3',
        speed: 1,
        locale: female.locale,
        instructions: female.accentInstruction,
      });
      const maleBody = buildOpenRouterSpeechBody({
        model: GROK,
        text: 'Sample',
        voice: male.appVoice,
        responseFormat: 'mp3',
        speed: 1,
        locale: male.locale,
        instructions: male.accentInstruction,
      });

      expect(femaleBody.voice).toBe('ara');
      expect(maleBody.voice).toBe('rex');
      expect(femaleBody.voice).not.toBe(maleBody.voice);
      expect(buildTtsCacheVoiceKey(female)).not.toBe(buildTtsCacheVoiceKey(male));
    }
  });

  it('AI Woman does not resolve to the male Grok/Gemini voice', () => {
    const womanGrok = resolveProviderVoiceId(GROK, 'female');
    const manGrok = resolveProviderVoiceId(GROK, 'male');
    const womanGemini = resolveProviderVoiceId(GEMINI, 'female');
    const manGemini = resolveProviderVoiceId(GEMINI, 'male');
    expect(womanGrok).toBe('ara');
    expect(manGrok).toBe('rex');
    expect(womanGemini).toBe('Aoede');
    expect(manGemini).toBe('Puck');
    expect(womanGrok).not.toBe(manGrok);
    expect(womanGemini).not.toBe(manGemini);
  });

  it('unsupported language returns controlled result without throwing', () => {
    const mapping = resolveTtsVoiceMapping({
      languageId: 'xx-NOT-A-LANGUAGE',
      gender: 'female',
    });
    expect(mapping.ok).toBe(false);
    expect(mapping.unsupportedReason).toBe('unsupported_language');
    expect(mapping.gender).toBe('female');
    expect(mapping.languageId).toBe('en-US');
  });

  it('non-AI dictionary language does not silently speak as English', () => {
    const mapping = resolveTtsVoiceMapping({
      languageId: 'fa',
      gender: 'male',
    });
    expect(mapping.ok).toBe(false);
    expect(mapping.unsupportedReason).toBe('unsupported_language');
  });

  it('regional AI aliases still resolve (fr-CA → fr-FR)', () => {
    const mapping = resolveTtsVoiceMapping({
      languageId: 'fr-CA',
      gender: 'female',
    });
    expect(mapping.ok).toBe(true);
    expect(mapping.languageId).toBe('fr-FR');
    expect(mapping.locale).toBe(getTtsLocale('fr-FR'));
  });

  it('normalizeTtsGender uses stable tokens, not UI labels', () => {
    expect(normalizeTtsGender('female')).toBe('female');
    expect(normalizeTtsGender('male')).toBe('male');
    expect(normalizeTtsGender('woman')).toBe('female');
    expect(normalizeTtsGender('man')).toBe('male');
    expect(normalizeTtsGender('Ara')).toBe('female');
    expect(normalizeTtsGender('Rex')).toBe('male');
  });
});

describe('US / UK × gender matrix', () => {
  it('builds four distinct provider configurations', () => {
    const cases = [
      { languageId: 'en-US', gender: 'female' as const },
      { languageId: 'en-US', gender: 'male' as const },
      { languageId: 'en-GB', gender: 'female' as const },
      { languageId: 'en-GB', gender: 'male' as const },
    ];

    const bodies = cases.map(({ languageId, gender }) => {
      const mapping = resolveTtsVoiceMapping({ languageId, gender });
      expect(mapping.locale).toBe(languageId);
      expect(mapping.gender).toBe(gender);
      expect(String(mapping.accentInstruction).toLowerCase()).toContain(
        languageId === 'en-US' ? 'american' : 'british'
      );
      return {
        cacheKey: buildTtsCacheVoiceKey(mapping),
        body: buildOpenRouterSpeechBody({
          model: GROK,
          text: 'On Saturday afternoon, Clara parked her car near the old theatre.',
          voice: mapping.appVoice,
          responseFormat: 'mp3',
          speed: 1,
          locale: mapping.locale,
          instructions: mapping.accentInstruction,
        }),
        gemini: buildOpenRouterSpeechBody({
          model: GEMINI,
          text: 'On Saturday afternoon, Clara parked her car near the old theatre.',
          voice: mapping.appVoice,
          responseFormat: 'pcm',
          speed: 1,
          locale: mapping.locale,
          instructions: getTtsInstruction(languageId),
        }),
      };
    });

    const cacheKeys = new Set(bodies.map((b) => b.cacheKey));
    expect(cacheKeys.size).toBe(4);

    expect(bodies[0].body.voice).toBe('ara');
    expect(bodies[1].body.voice).toBe('rex');
    expect(bodies[2].body.voice).toBe('ara');
    expect(bodies[3].body.voice).toBe('rex');

    expect(bodies[0].body.instructions).not.toBe(bodies[2].body.instructions);
    expect(bodies[0].gemini.input).toContain('[American English accent]');
    expect(bodies[2].gemini.input).toContain('[British English accent]');
    expect(bodies[0].body.voice).not.toBe(bodies[1].body.voice);
    expect(bodies[2].body.voice).not.toBe(bodies[3].body.voice);
  });
});
