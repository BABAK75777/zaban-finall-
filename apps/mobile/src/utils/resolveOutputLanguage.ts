export interface ResolvedLanguage {
  language: string;
  code: string;
  explicit: boolean;
}

const LANGUAGE_RULES: { language: string; code: string; patterns: RegExp[] }[] = [
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
      /\b(almani|be\s+almani)\b/i,
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
      /\b(arabic)\b/i,
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
];

export function resolveOutputLanguage(prompt: string): ResolvedLanguage {
  const text = prompt.trim();
  if (!text) {
    return { language: 'English', code: 'en', explicit: false };
  }

  for (const rule of LANGUAGE_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return { language: rule.language, code: rule.code, explicit: true };
      }
    }
  }

  return { language: 'English', code: 'en', explicit: false };
}
