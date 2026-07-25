/**
 * Detect target output language from a free-form AI generate prompt.
 * Supports English and Persian (Farsi) phrasing plus common native language names.
 *
 * @typedef {{ language: string, code: string, explicit: boolean, locale?: string, instruction?: string }} ResolvedLanguage
 */

import {
  LANGUAGE_BY_CODE as DICTIONARY_LANGUAGE_BY_CODE,
  getAiInstruction,
  migrateLanguageId,
  resolveDictionaryLanguage,
  resolvePracticeLanguage,
  DEFAULT_PRACTICE_LANGUAGE,
} from '@zaban/dictionary-languages';

export { migrateLanguageId, resolvePracticeLanguage, getAiInstruction, DEFAULT_PRACTICE_LANGUAGE };

/** @type {Array<{ language: string, code: string, patterns: RegExp[] }>} */
const LANGUAGE_RULES = [
  {
    language: 'English',
    code: 'en',
    patterns: [
      /\b(english|in english)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:انگلیسی|انگلیس)(?![\u0600-\u06FF])/,
    ],
  },
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
      /\b(?:in|write|practice|learn|speak)\s+turkish\b/i,
      /\bturkish\s+(?:text|story|passage|practice|reading)\b/i,
      /\b(t[uü]rk[cç]e|turkce)\b/i,
      /(?:به\s+)(?:زبان\s+)?(?:ترکی|ترک)(?:\s|$|[،.!?])/,
      /(?:زبان\s+)(?:ترکی|ترک)(?:\s|$|[،.!?])/,
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
    language: 'Hindi',
    code: 'hi',
    patterns: [/\b(hindi)\b/i, /(?:به\s+)?(?:زبان\s+)?(?:هندی|هند)/],
  },
  {
    language: 'Urdu',
    code: 'ur',
    patterns: [/\b(urdu)\b/i, /(?:به\s+)?(?:زبان\s+)?(?:اردو)/],
  },
  {
    language: 'Korean',
    code: 'ko',
    patterns: [
      /\b(korean|한국어)\b/i,
      /(?:به\s+)?(?:زبان\s+)?(?:کره‌ای|کره)/,
    ],
  },
];

export const LANGUAGE_BY_CODE = {
  ...DICTIONARY_LANGUAGE_BY_CODE,
};

/**
 * Prefer client-selected practice language over prompt inference.
 * Never infer target language from device/UI language — only from client fields or (legacy) prompt.
 * @param {string|undefined|null} targetLanguage
 * @param {string|undefined|null} targetLanguageName
 * @param {string} prompt
 * @param {{ targetLocale?: string|null, targetLanguageInstruction?: string|null }} [extras]
 * @returns {ResolvedLanguage}
 */
export function resolveGenerateOutputLanguage(
  targetLanguage,
  targetLanguageName,
  prompt,
  extras = {}
) {
  const fromClient = resolveOutputLanguageFromCode(targetLanguage);
  if (fromClient) {
    const langMeta = resolvePracticeLanguage(fromClient.code);
    return {
      ...fromClient,
      language:
        typeof targetLanguageName === 'string' && targetLanguageName.trim()
          ? targetLanguageName.trim()
          : fromClient.language,
      locale:
        (typeof extras.targetLocale === 'string' && extras.targetLocale.trim()) ||
        langMeta?.locale ||
        fromClient.code,
      instruction:
        (typeof extras.targetLanguageInstruction === 'string' &&
          extras.targetLanguageInstruction.trim()) ||
        getAiInstruction(fromClient.code),
      explicit: true,
    };
  }
  const fromPrompt = resolveOutputLanguage(typeof prompt === 'string' ? prompt : '');
  if (fromPrompt.explicit) {
    const langMeta = resolvePracticeLanguage(fromPrompt.code);
    return {
      ...fromPrompt,
      locale: langMeta?.locale ?? fromPrompt.code,
      instruction: getAiInstruction(migrateLanguageId(fromPrompt.code)),
    };
  }
  const fallback = resolveOutputLanguageFromCode(DEFAULT_PRACTICE_LANGUAGE);
  if (!fallback) {
    return {
      language: 'English — United States',
      code: 'en-US',
      locale: 'en-US',
      instruction: getAiInstruction('en-US'),
      explicit: false,
    };
  }
  return {
    ...fallback,
    locale: resolvePracticeLanguage(fallback.code)?.locale ?? fallback.code,
    instruction: getAiInstruction(fallback.code),
    explicit: false,
  };
}

/**
 * @param {string} code
 * @returns {ResolvedLanguage | null}
 */
export function resolveOutputLanguageFromCode(code) {
  if (code == null || typeof code !== 'string') return null;
  const id = migrateLanguageId(code, '');
  // migrateLanguageId with empty fallback returns DEFAULT when invalid — detect that.
  const normalized = code.trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) return null;
  const lang = resolvePracticeLanguage(code);
  if (lang) {
    return { language: lang.label, code: lang.id, explicit: true };
  }
  const fromDictionary = resolveDictionaryLanguage(normalized);
  if (fromDictionary) {
    return { language: fromDictionary.label, code: fromDictionary.code, explicit: true };
  }
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

  if (outputLanguage.explicit) {
    const lang = resolvePracticeLanguage(outputLanguage.code);
    const base = lang?.baseLanguage ?? outputLanguage.code;
    if (base !== 'en') {
      if (refusalPatterns.some((pattern) => pattern.test(lower))) {
        return true;
      }
      if (/\benglish practice reading passage\b/i.test(trimmed)) {
        return true;
      }
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

/** Max practice words injected per AI generation (hard cap). */
export const HARD_MAX_DUE_WORDS_PER_GENERATION = 12;

function normalizePracticeWordDetails(practiceWords = [], practiceWordDetails = []) {
  if (Array.isArray(practiceWordDetails) && practiceWordDetails.length > 0) {
    return practiceWordDetails
      .filter((w) => w && (w.word || w.displayWord))
      .slice(0, HARD_MAX_DUE_WORDS_PER_GENERATION);
  }
  const practiceList = Array.isArray(practiceWords)
    ? [...new Set(practiceWords.map((w) => String(w).trim()).filter(Boolean))].slice(
        0,
        HARD_MAX_DUE_WORDS_PER_GENERATION
      )
    : [];
  return practiceList.map((word) => ({
    word,
    displayWord: word,
    partOfSpeech: 'unknown',
    usedCount: 0,
    targetUses: 3,
  }));
}

function buildPracticeWordLines(details) {
  return details
    .map((w, i) => {
      const display = String(w.displayWord || w.word || '').trim();
      const pos = String(w.partOfSpeech || 'unknown').trim();
      const used = Number.isFinite(w.usedCount) ? w.usedCount : 0;
      const target = w.targetUses === 5 ? 5 : 3;
      let grammar = '';
      const hints = w.grammarHints;
      if (hints && typeof hints === 'object') {
        const parts = [];
        if (Array.isArray(hints.verbForms) && hints.verbForms.length) {
          parts.push(`forms: ${hints.verbForms.slice(0, 4).join(', ')}`);
        }
        if (hints.gender) parts.push(`gender: ${hints.gender}`);
        if (Array.isArray(hints.nounForms) && hints.nounForms.length) {
          parts.push(`forms: ${hints.nounForms.slice(0, 4).join(', ')}`);
        }
        if (parts.length) grammar = ` — ${parts.join('; ')}`;
      }
      return `${i + 1}. ${display} — ${pos}${grammar} — target progress ${used}/${target}`;
    })
    .join('\n');
}

/**
 * @param {{
 *   practiceWords?: string[],
 *   practiceWordDetails?: object[],
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
  practiceWordDetails = [],
  grammarFocus = false,
  speakingPractice = false,
  idiomsExpressions = false,
  sentenceTarget,
  wordsMin,
  wordsMax,
}) {
  const details = normalizePracticeWordDetails(practiceWords, practiceWordDetails);

  if (details.length === 0) {
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

  const wordLines = buildPracticeWordLines(details);
  const practiceBlock = `Practice words for this text:
Use the following learner words naturally in the generated text.
Use each word at least once if possible.
Do not make unnatural sentences.
For verbs, vary tense/form naturally if grammar data is available.
For nouns/adjectives, respect gender/number/agreement if relevant.
Words:
${wordLines}
${variationHints.length > 0 ? `\n${variationHints.join('\n')}` : ''}`;

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
 *   cefrLevel?: string,
 *   cefrGuidance?: string,
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
  cefrLevel,
  cefrGuidance,
  toneLabel,
  voice,
  sentenceTarget,
  wordsMin,
  wordsMax,
  styleHint,
  outputLanguage,
  strict = false,
  practiceWords = [],
  practiceWordDetails = [],
  grammarFocus = false,
  speakingPractice = false,
  idiomsExpressions = false,
}) {
  const { language, code, explicit } = outputLanguage;
  const langMeta = resolvePracticeLanguage(code);
  const base = langMeta?.baseLanguage ?? code;
  const isEnglish = base === 'en';
  const nonEnglish = explicit && !isEnglish;

  const systemContent = nonEnglish
    ? strict
      ? `You are a ${language} reading-practice generator. You never refuse. You never apologize. You never mention English limitations. Output ONLY the ${language} practice passage now.`
      : `You are a professional ${language} language-learning content writer. Your job is to write reading-practice passages in ${language} only. Never refuse a language request. Never say you can only write in English. Never include apologies, explanations, translations, titles, or bullet lists. Return only ${language} sentences suitable for read-aloud practice.`
    : `You write practice reading passages for language learners. Write entirely in the requested English variety. Return only the practice text—no titles, bullet lists, or commentary.`;

  const languageBlock =
    (typeof outputLanguage.instruction === 'string' && outputLanguage.instruction.trim()
      ? outputLanguage.instruction.trim()
      : null) ||
    getAiInstruction(code) ||
    (nonEnglish
      ? strict
        ? `Write the ${language} passage NOW. Zero English words.`
        : `MANDATORY OUTPUT LANGUAGE: ${language} (${code}). Every sentence MUST be ${language}. Do NOT reply in English. Do NOT explain what you cannot do.`
      : getAiInstruction(DEFAULT_PRACTICE_LANGUAGE));

  const practiceList = Array.isArray(practiceWords)
    ? [...new Set(practiceWords.map((w) => String(w).trim()).filter(Boolean))].slice(
        0,
        HARD_MAX_DUE_WORDS_PER_GENERATION
      )
    : [];

  const practicePrompt = buildAiPracticePromptBlock({
    practiceWords: practiceList,
    practiceWordDetails: Array.isArray(practiceWordDetails) ? practiceWordDetails : [],
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

  const cefrBlock =
    cefrLevel && cefrGuidance
      ? `CEFR level: ${cefrLevel} (${difficultyLabel})
Apply this learner difficulty guide for the target language (CEFR is language-agnostic; adapt vocabulary, grammar, sentence length, idioms, and explanation complexity accordingly):
${cefrGuidance}`
      : `Difficulty: ${difficultyLabel}`;

  return [
    { role: 'system', content: systemContent },
    {
      role: 'user',
      content: `Topic/request: ${trimmedPrompt}
${cefrBlock}
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
