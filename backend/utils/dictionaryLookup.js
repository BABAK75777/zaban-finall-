import { resolveOutputLanguageFromCode } from './resolveOutputLanguage.js';

/** @type {Set<string>} */
export const DICTIONARY_LANGUAGE_CODES = new Set([
  'ar',
  'en',
  'fr',
  'de',
  'hi',
  'ko',
  'fa',
  'pt',
  'ru',
  'es',
  'tr',
  'uk',
  'ur',
]);

/**
 * @param {string} code
 * @returns {boolean}
 */
export function isDictionaryLanguageCode(code) {
  return typeof code === 'string' && DICTIONARY_LANGUAGE_CODES.has(code.trim().toLowerCase());
}

/**
 * @param {{ word: string, context?: string, targetLanguage: string, sourceLanguage?: string }} params
 * @returns {{ role: string, content: string }[]}
 */
export function buildDictionaryLookupMessages({ word, context, targetLanguage, sourceLanguage }) {
  const target = resolveOutputLanguageFromCode(targetLanguage);
  const targetLabel = target?.language ?? targetLanguage;
  const sourceLabel =
    sourceLanguage && resolveOutputLanguageFromCode(sourceLanguage)
      ? resolveOutputLanguageFromCode(sourceLanguage).language
      : 'the source language of the passage';

  const contextLine =
    context && context.trim()
      ? `Sentence context: "${context.trim().slice(0, 280)}"`
      : 'No sentence context provided.';

  return [
    {
      role: 'system',
      content:
        'You are a concise bilingual dictionary for language learners. Return ONLY valid JSON with keys "meaning" (string) and "partOfSpeech" (string, optional). No markdown, no extra keys.',
    },
    {
      role: 'user',
      content: `Word: "${word}"
${contextLine}
Source language: ${sourceLabel}
Explain the word briefly for a learner in ${targetLabel}.
JSON example: {"meaning":"...","partOfSpeech":"noun"}`,
    },
  ];
}

/**
 * @param {string} raw
 * @returns {{ meaning: string, partOfSpeech?: string } | null}
 */
export function parseDictionaryLookupResponse(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const trimmed = raw.trim();

  try {
    const direct = JSON.parse(trimmed);
    if (direct && typeof direct.meaning === 'string' && direct.meaning.trim()) {
      return {
        meaning: direct.meaning.trim(),
        partOfSpeech:
          typeof direct.partOfSpeech === 'string' ? direct.partOfSpeech.trim() : undefined,
      };
    }
  } catch {
    /* fall through */
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed.meaning === 'string' && parsed.meaning.trim()) {
        return {
          meaning: parsed.meaning.trim(),
          partOfSpeech:
            typeof parsed.partOfSpeech === 'string' ? parsed.partOfSpeech.trim() : undefined,
        };
      }
    } catch {
      /* ignore */
    }
  }

  if (trimmed.length > 0 && trimmed.length < 500 && !trimmed.startsWith('{')) {
    return { meaning: trimmed };
  }

  return null;
}
