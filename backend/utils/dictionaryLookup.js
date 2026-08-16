import {
  isDictionaryLanguageCode,
  resolveDictionaryLanguage,
} from '@zaban/dictionary-languages';
import { resolveOutputLanguageFromCode } from './resolveOutputLanguage.js';

export { isDictionaryLanguageCode };

/**
 * @param {{ word: string, context?: string, targetLanguage: string, targetLanguageName?: string, sourceLanguage?: string }} params
 * @returns {{ role: string, content: string }[]}
 */
export function buildDictionaryLookupMessages({
  word,
  context,
  targetLanguage,
  targetLanguageName,
  sourceLanguage,
}) {
  const resolved =
    resolveDictionaryLanguage(targetLanguage) ?? resolveOutputLanguageFromCode(targetLanguage);
  const targetLabel = targetLanguageName ?? resolved?.language ?? targetLanguage;
  const targetCode = resolved?.code ?? targetLanguage.trim().toLowerCase();
  const sourceLabel =
    sourceLanguage && resolveOutputLanguageFromCode(sourceLanguage)
      ? resolveOutputLanguageFromCode(sourceLanguage).language
      : 'the source language of the passage';

  const contextLine =
    context && context.trim()
      ? `Sentence context: "${context.trim().slice(0, 280)}"`
      : 'No sentence context provided.';

  const meaningLanguageRule =
    targetCode === 'fa'
      ? `The JSON "meaning" field MUST be written entirely in ${targetLabel} (${targetCode}).`
      : `The JSON "meaning" field MUST be written entirely in ${targetLabel} (${targetCode}). Do NOT use Persian or Farsi in the meaning.`;

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
${meaningLanguageRule}
Give a brief learner-friendly gloss in ${targetLabel} only.
JSON example: {"meaning":"...","partOfSpeech":"noun"}`,
    },
  ];
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isPrimarilyPersianScript(text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  const persian = (text.match(/[\u0600-\u06FF]/g) || []).length;
  return persian / text.length > 0.35;
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

/**
 * @param {string} prompt
 * @param {string} targetCode
 * @returns {boolean}
 */
export function dictionaryPromptMentionsPersianOutput(prompt, targetCode) {
  if (targetCode === 'fa') return false;
  if (/do not use persian|do not use farsi|must not use persian/i.test(prompt)) {
    return false;
  }
  return /\b(?:in|to|write|explain|translate to)\s+(?:persian|farsi)\b/i.test(prompt)
    || /(?:به\s+)(?:زبان\s+)?(?:فارسی|پارسی)/.test(prompt);
}
