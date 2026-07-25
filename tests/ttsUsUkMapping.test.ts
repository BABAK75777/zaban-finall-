import { describe, expect, it } from 'vitest';
import { buildOpenRouterSpeechBody } from '../backend/utils/openrouter.js';
import {
  getTtsInstruction,
  getTtsLocale,
  resolveTtsLocaleWithFallback,
} from '../packages/dictionary-languages/index.js';

describe('TTS US/UK mapping at provider request boundary', () => {
  it('builds distinct OpenRouter bodies for en-US and en-GB', () => {
    const usLocale = getTtsLocale('en-US');
    const ukLocale = getTtsLocale('en-GB');
    const usInstr = getTtsInstruction('en-US');
    const ukInstr = getTtsInstruction('en-GB');

    const usBody = buildOpenRouterSpeechBody({
      model: 'x-ai/grok-voice-tts-1.0',
      text: 'Hello',
      voice: 'Ara',
      responseFormat: 'mp3',
      speed: 1,
      locale: usLocale,
      instructions: usInstr,
    });
    const ukBody = buildOpenRouterSpeechBody({
      model: 'x-ai/grok-voice-tts-1.0',
      text: 'Hello',
      voice: 'Ara',
      responseFormat: 'mp3',
      speed: 1,
      locale: ukLocale,
      instructions: ukInstr,
    });

    expect(usLocale).toBe('en-US');
    expect(ukLocale).toBe('en-GB');
    expect(usBody.instructions).not.toBe(ukBody.instructions);
    expect(String(usBody.instructions).toLowerCase()).toContain('american');
    expect(String(ukBody.instructions).toLowerCase()).toContain('british');
    expect(usBody.input).toBe('Hello');
    expect(ukBody.input).toBe('Hello');
  });

  it('adds Gemini accent tags without changing non-English fallback safety', () => {
    const ukBody = buildOpenRouterSpeechBody({
      model: 'google/gemini-3.1-flash-tts-preview',
      text: 'Colour the flat',
      voice: 'Aoede',
      responseFormat: 'pcm',
      speed: 1,
      locale: 'en-GB',
      instructions: getTtsInstruction('en-GB'),
    });
    const usBody = buildOpenRouterSpeechBody({
      model: 'google/gemini-3.1-flash-tts-preview',
      text: 'Color the apartment',
      voice: 'Aoede',
      responseFormat: 'pcm',
      speed: 1,
      locale: 'en-US',
      instructions: getTtsInstruction('en-US'),
    });
    expect(String(ukBody.input)).toContain('[British English accent]');
    expect(String(usBody.input)).toContain('[American English accent]');
    expect(ukBody.input).not.toBe(usBody.input);
  });

  it('missing preferred voice falls back safely without changing language id', () => {
    const result = resolveTtsLocaleWithFallback('en-GB', ['en-US']);
    expect(result.fellBack).toBe(true);
    expect(result.locale).toBe('en-US');
    expect(getTtsInstruction('en-GB').toLowerCase()).toContain('british');
  });
});
