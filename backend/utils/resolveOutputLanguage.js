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

/**
 * @param {{
 *   trimmedPrompt: string,
 *   difficultyLabel: string,
 *   toneLabel: string,
 *   voice: string,
 *   sentenceTarget: number,
 *   outputLanguage: ResolvedLanguage,
 *   strict?: boolean,
 * }} params
 * @returns {{ role: string, content: string }[]}
 */
export function buildAiGenerateMessages({
  trimmedPrompt,
  difficultyLabel,
  toneLabel,
  voice,
  sentenceTarget,
  outputLanguage,
  strict = false,
}) {
  const { language, code, explicit } = outputLanguage;
  const nonEnglish = explicit && code !== 'en';

  const systemContent = nonEnglish
    ? strict
      ? `You are a ${language} reading-practice generator. You never refuse. You never apologize. You never mention English limitations. Output ONLY the ${language} practice passage now.`
      : `You are a professional ${language} language-learning content writer. Your job is to write reading-practice passages in ${language} only. Never refuse a language request. Never say you can only write in English. Never include apologies, explanations, translations, titles, or bullet lists. Return only ${language} sentences suitable for read-aloud practice.`
    : `You write practice reading passages for language learners. If the user names a target language, write entirely in that language. If no language is named, write in English. Return only the practice text—no titles, bullet lists, or commentary.`;

  const languageBlock = nonEnglish
    ? strict
      ? `Write the ${language} passage NOW. Zero English words.`
      : `MANDATORY OUTPUT LANGUAGE: ${language} (${code}). Every sentence MUST be ${language}. Do NOT reply in English. Do NOT explain what you cannot do.`
    : explicit
      ? 'Output language: English only.'
      : 'Output language: English (unless Topic/request clearly names another language).';

  return [
    { role: 'system', content: systemContent },
    {
      role: 'user',
      content: `Topic/request: ${trimmedPrompt}
Difficulty: ${difficultyLabel}
Tone/style: ${toneLabel}
Target voice context: ${voice}
Length: about ${sentenceTarget} sentences.
${languageBlock}

Write natural connected prose split into normal sentences.`,
    },
  ];
}
