/**
 * Detect target output language from a free-form AI generate prompt.
 * Supports English and Persian (Farsi) phrasing plus common native language names.
 *
 * @typedef {{ language: string, code: string, explicit: boolean }} ResolvedLanguage
 */

/** @type {Array<{ language: string, code: string, patterns: RegExp[] }>} */
const LANGUAGE_RULES = [
  {
    language: 'German',
    code: 'de',
    patterns: [
      /\b(german|deutsch|auf deutsch)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:آلمانی|آلمان|المان|المانی)/,
      /\b(almani|almani|be\s+almani)\b/i,
    ],
  },
  {
    language: 'Spanish',
    code: 'es',
    patterns: [
      /\b(spanish|espanish|espa[nñ]ol|en espa[nñ]ol)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:اسپانیایی|اسپانی|اسپانیا|اسبانیا)/,
      /\b(espanol|español)\b/i,
    ],
  },
  {
    language: 'Turkish',
    code: 'tr',
    patterns: [
      /\b(turkish|t[uü]rk[cç]e|turkce)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:ترکی|ترک|ترکیه|ترك)/,
      /\b(torki|turki|be\s+torki)\b/i,
    ],
  },
  {
    language: 'French',
    code: 'fr',
    patterns: [
      /\b(french|fran[cç]ais|en fran[cç]ais)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:فرانسوی|فرانسه)/,
    ],
  },
  {
    language: 'Persian',
    code: 'fa',
    patterns: [
      /\b(persian|farsi)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:فارسی|پارسی)/,
    ],
  },
  {
    language: 'Arabic',
    code: 'ar',
    patterns: [
      /\b(arabic|arabisch)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:عربی|عربي|العربية)/,
    ],
  },
  {
    language: 'Italian',
    code: 'it',
    patterns: [
      /\b(italian|italiano)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:ایتالیایی|ایتالیا)/,
    ],
  },
  {
    language: 'Portuguese',
    code: 'pt',
    patterns: [
      /\b(portuguese|portugu[eê]s)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:پرتغالی|برزیلی)/,
    ],
  },
  {
    language: 'Russian',
    code: 'ru',
    patterns: [
      /\b(russian|русский)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:روسی|روس)/,
    ],
  },
  {
    language: 'Japanese',
    code: 'ja',
    patterns: [
      /\b(japanese|日本語)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:ژاپنی|ژاپن)/,
    ],
  },
  {
    language: 'Chinese',
    code: 'zh',
    patterns: [
      /\b(chinese|mandarin|中文|汉语)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:چینی|چین)/,
    ],
  },
  {
    language: 'Korean',
    code: 'ko',
    patterns: [
      /\b(korean|한국어)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:کره‌ای|کره)/,
    ],
  },
  {
    language: 'English',
    code: 'en',
    patterns: [
      /\b(english|in english)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:انگلیسی|انگلیس)/,
    ],
  },
];

/** @type {Record<string, { language: string, code: string }>} */
export const LANGUAGE_BY_CODE = {
  de: { language: 'German', code: 'de' },
  es: { language: 'Spanish', code: 'es' },
  tr: { language: 'Turkish', code: 'tr' },
  fr: { language: 'French', code: 'fr' },
  fa: { language: 'Persian', code: 'fa' },
  ar: { language: 'Arabic', code: 'ar' },
  it: { language: 'Italian', code: 'it' },
  pt: { language: 'Portuguese', code: 'pt' },
  ru: { language: 'Russian', code: 'ru' },
  ja: { language: 'Japanese', code: 'ja' },
  zh: { language: 'Chinese', code: 'zh' },
  ko: { language: 'Korean', code: 'ko' },
  en: { language: 'English', code: 'en' },
  hi: { language: 'Hindi', code: 'hi' },
  uk: { language: 'Ukrainian', code: 'uk' },
  ur: { language: 'Urdu', code: 'ur' },
};

/**
 * @param {string} code
 * @returns {ResolvedLanguage | null}
 */
export function resolveOutputLanguageFromCode(code) {
  const normalized = code.trim().toLowerCase();
  const entry = LANGUAGE_BY_CODE[normalized];
  if (!entry) return null;
  return { ...entry, explicit: true };
}

/**
 * @param {string} prompt
 * @returns {ResolvedLanguage}
 */
export function resolveOutputLanguage(prompt) {
  const text = prompt.trim();
  if (!text) {
    return { language: 'English', code: 'en', explicit: false };
  }

  for (const rule of LANGUAGE_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return {
          language: rule.language,
          code: rule.code,
          explicit: true,
        };
      }
    }
  }

  return { language: 'English', code: 'en', explicit: false };
}

/**
 * @param {string} text
 * @param {ResolvedLanguage} outputLanguage
 * @returns {boolean}
 */
export function isInvalidAiGenerateResponse(text, outputLanguage) {
  const trimmed = text.trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  const refusalPatterns = [
    /i(?:'m| am) sorry/i,
    /can only provide text in english/i,
    /only (?:provide|write|generate|create).{0,40}\benglish\b/i,
    /please let me know/i,
    /cannot (?:provide|write|generate).{0,40}\benglish\b/i,
    /unable to (?:provide|write|generate)/i,
  ];

  if (outputLanguage.explicit && outputLanguage.code !== 'en') {
    if (refusalPatterns.some((pattern) => pattern.test(lower))) {
      return true;
    }
    if (/\benglish practice reading passage\b/i.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/** Fixed sentence count for each AI generate request (slider controls length per sentence only). */
export const AI_GENERATE_SENTENCE_COUNT = 20;

/**
 * Map UI slider (0 = short sentences, 1 = long sentences) to word-count guidance for the model.
 * @param {number} textLength
 * @returns {{ wordsMin: number, wordsMax: number, styleHint: string }}
 */
export function resolveAiSentenceLength(textLength) {
  const len =
    typeof textLength === 'number' && !Number.isNaN(textLength)
      ? Math.max(0, Math.min(1, textLength))
      : 0.35;
  const wordsMin = Math.round(4 + len * 18);
  const wordsMax = Math.round(10 + len * 38);
  const styleHint =
    len <= 0.33
      ? 'Keep each sentence brief and simple—one clear idea per sentence.'
      : len <= 0.66
        ? 'Use natural medium-length sentences with normal detail.'
        : 'Use longer, richer sentences with more detail (commas and clauses are fine).';
  return { wordsMin, wordsMax, styleHint };
}

/** Max extra sentences / length when weaving vocabulary (10%). */
export const AI_PRACTICE_LENGTH_BOOST_RATIO = 0.1;

/**
 * @param {{
 *   practiceWords?: string[],
 *   grammarFocus?: boolean,
 *   speakingPractice?: boolean,
 *   idiomsExpressions?: boolean,
 *   sentenceTarget: number,
 *   wordsMin: number,
 *   wordsMax: number,
 * }} params
 */
export function buildAiPracticePromptBlock({
  practiceWords = [],
  grammarFocus = false,
  speakingPractice = false,
  idiomsExpressions = false,
  sentenceTarget,
  wordsMin,
  wordsMax,
}) {
  const practiceList = Array.isArray(practiceWords)
    ? [...new Set(practiceWords.map((w) => String(w).trim()).filter(Boolean))].slice(0, 24)
    : [];

  if (practiceList.length === 0) {
    return {
      practiceBlock: '',
      sentenceTarget,
      wordsMin,
      wordsMax,
    };
  }

  const boostedSentences = Math.min(
    sentenceTarget + Math.max(1, Math.round(sentenceTarget * AI_PRACTICE_LENGTH_BOOST_RATIO)),
    Math.round(sentenceTarget * (1 + AI_PRACTICE_LENGTH_BOOST_RATIO))
  );
  const boostedWordsMax = Math.round(wordsMax * (1 + AI_PRACTICE_LENGTH_BOOST_RATIO));

  const variationHints = [];
  if (grammarFocus) {
    variationHints.push(
      'Use varied grammatical forms of each practice word (tenses, plural/singular, natural inflections).'
    );
  }
  if (speakingPractice) {
    variationHints.push(
      'Place each practice word in natural spoken contexts; mix statements and questions where appropriate.'
    );
  }
  if (idiomsExpressions) {
    variationHints.push('Include idiomatic or expressive uses when they fit the topic.');
  }

  const practiceBlock = `Vocabulary practice (required): weave these learner words into the passage: ${practiceList.join(', ')}.
- Spread usage across the text at different points (not clustered in one paragraph).
- Each listed word should appear in at least 3 distinct sentences and 4–6 times total when natural.
- Use different contexts for repeats; do not repeat the same sentence pattern.
${variationHints.length > 0 ? `${variationHints.join('\n')}\n` : ''}- Keep the passage natural; if the topic is very diverse, stay within at most 10% extra length (sentence count or sentence length) rather than forcing awkward repetition.`;

  return {
    practiceBlock,
    sentenceTarget: boostedSentences,
    wordsMin,
    wordsMax: boostedWordsMax,
  };
}

/**
 * @param {{
 *   trimmedPrompt: string,
 *   difficultyLabel: string,
 *   toneLabel: string,
 *   voice: string,
 *   sentenceTarget: number,
 *   wordsMin: number,
 *   wordsMax: number,
 *   styleHint: string,
 *   outputLanguage: ResolvedLanguage,
 *   strict?: boolean,
 *   practiceWords?: string[],
 *   grammarFocus?: boolean,
 *   speakingPractice?: boolean,
 *   idiomsExpressions?: boolean,
 * }} params
 * @returns {{ role: string, content: string }[]}
 */
export function buildAiGenerateMessages({
  trimmedPrompt,
  difficultyLabel,
  toneLabel,
  voice,
  sentenceTarget,
  wordsMin,
  wordsMax,
  styleHint,
  outputLanguage,
  strict = false,
  practiceWords = [],
  grammarFocus = false,
  speakingPractice = false,
  idiomsExpressions = false,
}) {
  const { language, code, explicit } = outputLanguage;
  const nonEnglish = explicit && code !== 'en';

  const systemContent = nonEnglish
    ? strict
      ? `You are a ${language} reading-practice generator. You never refuse. You never apologize. You never mention English limitations. Output ONLY the ${language} practice passage now.`
      : `You are a professional ${language} language-learning content writer. Your job is to write reading-practice passages in ${language} only. Never refuse a language request. Never say you can only write in English. Never include apologies, explanations, translations, titles, or bullet lists. Return only ${language} sentences suitable for read-aloud practice.`
    : `You write practice reading passages for language learners. If the user names a target language, write entirely in that language. If no language is named, write in American English (United States). Return only the practice text—no titles, bullet lists, or commentary.`;

  const usEnglishBlock =
    'Output language: American English (United States). Use US spelling (color, organize, center) and US vocabulary. Do NOT use British spellings (colour, organise, centre) or UK idioms unless the user explicitly asks for British English.';

  const languageBlock = nonEnglish
    ? strict
      ? `Write the ${language} passage NOW. Zero English words.`
      : `MANDATORY OUTPUT LANGUAGE: ${language} (${code}). Every sentence MUST be ${language}. Do NOT reply in English. Do NOT explain what you cannot do.`
    : usEnglishBlock;

  const practiceList = Array.isArray(practiceWords)
    ? [...new Set(practiceWords.map((w) => String(w).trim()).filter(Boolean))].slice(0, 24)
    : [];

  const practicePrompt = buildAiPracticePromptBlock({
    practiceWords: practiceList,
    grammarFocus,
    speakingPractice,
    idiomsExpressions,
    sentenceTarget,
    wordsMin,
    wordsMax,
  });

  const practiceBlock = practicePrompt.practiceBlock;
  const effectiveSentenceTarget = practicePrompt.sentenceTarget;
  const effectiveWordsMin = practicePrompt.wordsMin;
  const effectiveWordsMax = practicePrompt.wordsMax;

  return [
    { role: 'system', content: systemContent },
    {
      role: 'user',
      content: `Topic/request: ${trimmedPrompt}
Difficulty: ${difficultyLabel}
Tone/style: ${toneLabel}
Target voice context: ${voice}
Output: exactly ${effectiveSentenceTarget} sentences total (do not exceed ${effectiveSentenceTarget}).
Sentence length: each sentence about ${effectiveWordsMin}-${effectiveWordsMax} words. ${styleHint}
${languageBlock}
${practiceBlock}

Write natural connected prose split into normal sentences.`,
    },
  ];
}
