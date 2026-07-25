/**
 * Central practice / content language registry.
 * Stable IDs are persisted; labels and locales may evolve.
 */

/**
 * @typedef {object} PracticeLanguage
 * @property {string} id
 * @property {string} label
 * @property {string} locale BCP-47
 * @property {string} baseLanguage
 * @property {string|null} region
 * @property {string} aiInstruction
 * @property {string} ttsLocale
 * @property {string} sttLocale
 * @property {string} [ttsInstruction] Accent/voice instruction for TTS providers
 * @property {string} [script]
 * @property {string[]} [aliases] legacy codes that migrate to this id
 */

/** @type {PracticeLanguage[]} */
export const PRACTICE_LANGUAGES = [
  {
    id: 'en-US',
    label: 'English — United States',
    locale: 'en-US',
    baseLanguage: 'en',
    region: 'US',
    aiInstruction:
      'Output language: American English (United States). Use US spelling (color, favorite, organize, center, apartment) and US vocabulary/usage. Do NOT use British spellings (colour, favourite, organise, centre) or UK-only terms (flat for apartment) unless the user explicitly asks for British English.',
    ttsLocale: 'en-US',
    sttLocale: 'en-US',
    ttsInstruction:
      'Speak with a clear General American (United States) English accent and American pronunciation.',
    script: 'Latn',
    aliases: ['en', 'english'],
  },
  {
    id: 'en-GB',
    label: 'English — United Kingdom',
    locale: 'en-GB',
    baseLanguage: 'en',
    region: 'GB',
    aiInstruction:
      'Output language: British English (United Kingdom). Use British spelling (colour, favourite, organise, centre) and UK vocabulary/usage (flat rather than apartment when natural). Do NOT use American spellings (color, favorite, organize, center) unless the user explicitly asks for American English.',
    ttsLocale: 'en-GB',
    sttLocale: 'en-GB',
    ttsInstruction:
      'Speak with a clear British (United Kingdom) English accent and British pronunciation.',
    script: 'Latn',
    aliases: ['en-uk', 'en_gb', 'british'],
  },
  {
    id: 'es-ES',
    label: 'Spanish',
    locale: 'es-ES',
    baseLanguage: 'es',
    region: 'ES',
    aiInstruction:
      'Output language: Spanish. Write entirely in Spanish. Do NOT reply in Persian, English, or any other language.',
    ttsLocale: 'es-ES',
    sttLocale: 'es-ES',
    ttsInstruction: 'Speak naturally in Spanish.',
    script: 'Latn',
    aliases: ['es', 'spanish', 'es-MX', 'es-mx', 'es-419', 'es-latam'],
  },
  {
    id: 'fr-FR',
    label: 'French',
    locale: 'fr-FR',
    baseLanguage: 'fr',
    region: 'FR',
    aiInstruction:
      'Output language: French. Write entirely in French. Do NOT reply in Persian, English, or any other language.',
    ttsLocale: 'fr-FR',
    sttLocale: 'fr-FR',
    ttsInstruction: 'Speak naturally in French.',
    script: 'Latn',
    aliases: ['fr', 'french', 'fr-CA', 'fr-ca'],
  },
  {
    id: 'pt-BR',
    label: 'Portuguese',
    locale: 'pt-BR',
    baseLanguage: 'pt',
    region: 'BR',
    aiInstruction:
      'Output language: Portuguese. Write entirely in Portuguese. Prefer widely understood Brazilian Portuguese spelling and vocabulary as the default Portuguese variant.',
    ttsLocale: 'pt-BR',
    sttLocale: 'pt-BR',
    ttsInstruction: 'Speak naturally in Portuguese.',
    script: 'Latn',
    aliases: ['pt', 'portuguese', 'pt-PT', 'pt-pt'],
  },
  {
    id: 'de-DE',
    label: 'German',
    locale: 'de-DE',
    baseLanguage: 'de',
    region: 'DE',
    aiInstruction:
      'Output language: standard German (Germany). Write entirely in German. Do NOT reply in Persian, English, or any other language.',
    ttsLocale: 'de-DE',
    sttLocale: 'de-DE',
    ttsInstruction: 'Speak naturally in German.',
    script: 'Latn',
    aliases: ['de', 'german', 'deutsch'],
  },
  {
    id: 'it-IT',
    label: 'Italian',
    locale: 'it-IT',
    baseLanguage: 'it',
    region: 'IT',
    aiInstruction: 'Output language: standard Italian (Italy). Write entirely in Italian.',
    ttsLocale: 'it-IT',
    sttLocale: 'it-IT',
    ttsInstruction: 'Speak naturally in Italian.',
    script: 'Latn',
    aliases: ['it', 'italian'],
  },
  {
    id: 'nl-NL',
    label: 'Dutch',
    locale: 'nl-NL',
    baseLanguage: 'nl',
    region: 'NL',
    aiInstruction: 'Output language: standard Dutch (Netherlands). Write entirely in Dutch.',
    ttsLocale: 'nl-NL',
    sttLocale: 'nl-NL',
    ttsInstruction: 'Speak naturally in Dutch.',
    script: 'Latn',
    aliases: ['nl', 'dutch'],
  },
  {
    id: 'sv-SE',
    label: 'Swedish',
    locale: 'sv-SE',
    baseLanguage: 'sv',
    region: 'SE',
    aiInstruction: 'Output language: standard Swedish. Write entirely in Swedish.',
    ttsLocale: 'sv-SE',
    sttLocale: 'sv-SE',
    ttsInstruction: 'Speak naturally in Swedish.',
    script: 'Latn',
    aliases: ['sv', 'swedish'],
  },
  {
    id: 'nb-NO',
    label: 'Norwegian',
    locale: 'nb-NO',
    baseLanguage: 'no',
    region: 'NO',
    aiInstruction: 'Output language: Norwegian Bokmål. Write entirely in Norwegian.',
    ttsLocale: 'nb-NO',
    sttLocale: 'nb-NO',
    ttsInstruction: 'Speak naturally in Norwegian.',
    script: 'Latn',
    aliases: ['no', 'nb', 'norwegian'],
  },
  {
    id: 'da-DK',
    label: 'Danish',
    locale: 'da-DK',
    baseLanguage: 'da',
    region: 'DK',
    aiInstruction: 'Output language: standard Danish. Write entirely in Danish.',
    ttsLocale: 'da-DK',
    sttLocale: 'da-DK',
    ttsInstruction: 'Speak naturally in Danish.',
    script: 'Latn',
    aliases: ['da', 'danish'],
  },
  {
    id: 'fi-FI',
    label: 'Finnish',
    locale: 'fi-FI',
    baseLanguage: 'fi',
    region: 'FI',
    aiInstruction: 'Output language: standard Finnish. Write entirely in Finnish.',
    ttsLocale: 'fi-FI',
    sttLocale: 'fi-FI',
    ttsInstruction: 'Speak naturally in Finnish.',
    script: 'Latn',
    aliases: ['fi', 'finnish'],
  },
  {
    id: 'is-IS',
    label: 'Icelandic',
    locale: 'is-IS',
    baseLanguage: 'is',
    region: 'IS',
    aiInstruction: 'Output language: standard Icelandic. Write entirely in Icelandic.',
    ttsLocale: 'is-IS',
    sttLocale: 'is-IS',
    ttsInstruction: 'Speak naturally in Icelandic.',
    script: 'Latn',
    aliases: ['is', 'icelandic'],
  },
  {
    id: 'ga-IE',
    label: 'Irish',
    locale: 'ga-IE',
    baseLanguage: 'ga',
    region: 'IE',
    aiInstruction: 'Output language: Irish (Gaeilge). Write entirely in Irish.',
    ttsLocale: 'ga-IE',
    sttLocale: 'ga-IE',
    ttsInstruction: 'Speak naturally in Irish.',
    script: 'Latn',
    aliases: ['ga', 'irish'],
  },
  {
    id: 'pl-PL',
    label: 'Polish',
    locale: 'pl-PL',
    baseLanguage: 'pl',
    region: 'PL',
    aiInstruction: 'Output language: standard Polish. Write entirely in Polish.',
    ttsLocale: 'pl-PL',
    sttLocale: 'pl-PL',
    ttsInstruction: 'Speak naturally in Polish.',
    script: 'Latn',
    aliases: ['pl', 'polish'],
  },
  {
    id: 'cs-CZ',
    label: 'Czech',
    locale: 'cs-CZ',
    baseLanguage: 'cs',
    region: 'CZ',
    aiInstruction: 'Output language: standard Czech. Write entirely in Czech.',
    ttsLocale: 'cs-CZ',
    sttLocale: 'cs-CZ',
    ttsInstruction: 'Speak naturally in Czech.',
    script: 'Latn',
    aliases: ['cs', 'czech'],
  },
  {
    id: 'sk-SK',
    label: 'Slovak',
    locale: 'sk-SK',
    baseLanguage: 'sk',
    region: 'SK',
    aiInstruction: 'Output language: standard Slovak. Write entirely in Slovak.',
    ttsLocale: 'sk-SK',
    sttLocale: 'sk-SK',
    ttsInstruction: 'Speak naturally in Slovak.',
    script: 'Latn',
    aliases: ['sk', 'slovak'],
  },
  {
    id: 'hu-HU',
    label: 'Hungarian',
    locale: 'hu-HU',
    baseLanguage: 'hu',
    region: 'HU',
    aiInstruction: 'Output language: standard Hungarian. Write entirely in Hungarian.',
    ttsLocale: 'hu-HU',
    sttLocale: 'hu-HU',
    ttsInstruction: 'Speak naturally in Hungarian.',
    script: 'Latn',
    aliases: ['hu', 'hungarian'],
  },
  {
    id: 'ro-RO',
    label: 'Romanian',
    locale: 'ro-RO',
    baseLanguage: 'ro',
    region: 'RO',
    aiInstruction: 'Output language: standard Romanian. Write entirely in Romanian.',
    ttsLocale: 'ro-RO',
    sttLocale: 'ro-RO',
    ttsInstruction: 'Speak naturally in Romanian.',
    script: 'Latn',
    aliases: ['ro', 'romanian'],
  },
  {
    id: 'bg-BG',
    label: 'Bulgarian',
    locale: 'bg-BG',
    baseLanguage: 'bg',
    region: 'BG',
    aiInstruction: 'Output language: standard Bulgarian. Write entirely in Bulgarian.',
    ttsLocale: 'bg-BG',
    sttLocale: 'bg-BG',
    ttsInstruction: 'Speak naturally in Bulgarian.',
    script: 'Cyrl',
    aliases: ['bg', 'bulgarian'],
  },
  {
    id: 'hr-HR',
    label: 'Croatian',
    locale: 'hr-HR',
    baseLanguage: 'hr',
    region: 'HR',
    aiInstruction: 'Output language: standard Croatian. Write entirely in Croatian.',
    ttsLocale: 'hr-HR',
    sttLocale: 'hr-HR',
    ttsInstruction: 'Speak naturally in Croatian.',
    script: 'Latn',
    aliases: ['hr', 'croatian'],
  },
  {
    id: 'sr-RS',
    label: 'Serbian',
    locale: 'sr-RS',
    baseLanguage: 'sr',
    region: 'RS',
    aiInstruction:
      'Output language: standard Serbian. Prefer Latin script unless the topic clearly requires Cyrillic. Write entirely in Serbian.',
    ttsLocale: 'sr-RS',
    sttLocale: 'sr-RS',
    ttsInstruction: 'Speak naturally in Serbian.',
    script: 'Latn',
    aliases: ['sr', 'serbian'],
  },
  {
    id: 'sl-SI',
    label: 'Slovenian',
    locale: 'sl-SI',
    baseLanguage: 'sl',
    region: 'SI',
    aiInstruction: 'Output language: standard Slovenian. Write entirely in Slovenian.',
    ttsLocale: 'sl-SI',
    sttLocale: 'sl-SI',
    ttsInstruction: 'Speak naturally in Slovenian.',
    script: 'Latn',
    aliases: ['sl', 'slovenian'],
  },
  {
    id: 'el-GR',
    label: 'Greek',
    locale: 'el-GR',
    baseLanguage: 'el',
    region: 'GR',
    aiInstruction: 'Output language: modern standard Greek. Write entirely in Greek.',
    ttsLocale: 'el-GR',
    sttLocale: 'el-GR',
    ttsInstruction: 'Speak naturally in Greek.',
    script: 'Grek',
    aliases: ['el', 'greek'],
  },
  {
    id: 'tr-TR',
    label: 'Turkish',
    locale: 'tr-TR',
    baseLanguage: 'tr',
    region: 'TR',
    aiInstruction:
      'Output language: standard Turkish as used in Turkey (Türkiye). Write entirely in Turkish. Do NOT reply in Persian or English.',
    ttsLocale: 'tr-TR',
    sttLocale: 'tr-TR',
    ttsInstruction: 'Speak naturally in Turkish.',
    script: 'Latn',
    aliases: ['tr', 'turkish'],
  },
  {
    id: 'ru-RU',
    label: 'Russian',
    locale: 'ru-RU',
    baseLanguage: 'ru',
    region: 'RU',
    aiInstruction: 'Output language: standard Russian. Write entirely in Russian.',
    ttsLocale: 'ru-RU',
    sttLocale: 'ru-RU',
    ttsInstruction: 'Speak naturally in Russian.',
    script: 'Cyrl',
    aliases: ['ru', 'russian'],
  },
  {
    id: 'uk-UA',
    label: 'Ukrainian',
    locale: 'uk-UA',
    baseLanguage: 'uk',
    region: 'UA',
    aiInstruction: 'Output language: standard Ukrainian. Write entirely in Ukrainian.',
    ttsLocale: 'uk-UA',
    sttLocale: 'uk-UA',
    ttsInstruction: 'Speak naturally in Ukrainian.',
    script: 'Cyrl',
    aliases: ['uk', 'ukrainian'],
  },
  {
    id: 'ko-KR',
    label: 'Korean',
    locale: 'ko-KR',
    baseLanguage: 'ko',
    region: 'KR',
    aiInstruction: 'Output language: standard Korean. Write entirely in Korean (Hangul).',
    ttsLocale: 'ko-KR',
    sttLocale: 'ko-KR',
    ttsInstruction: 'Speak naturally in Korean.',
    script: 'Hang',
    aliases: ['ko', 'korean'],
  },
  {
    id: 'zh-Hans',
    label: 'Chinese',
    locale: 'zh-CN',
    baseLanguage: 'zh',
    region: 'CN',
    aiInstruction:
      'Output language: Chinese. Prefer Simplified Chinese characters (简体中文) unless Traditional is explicitly requested. Write entirely in Chinese. Do NOT reply in Persian or English.',
    ttsLocale: 'zh-CN',
    sttLocale: 'zh-CN',
    ttsInstruction: 'Speak naturally in Chinese.',
    script: 'Hans',
    aliases: [
      'zh',
      'zh-cn',
      'chinese',
      'zh-hans',
      'zh-Hant',
      'zh-hant',
      'zh-tw',
      'zh-hk',
    ],
  },
  {
    id: 'fa',
    label: 'Persian',
    locale: 'fa-IR',
    baseLanguage: 'fa',
    region: 'IR',
    aiInstruction:
      'Output language: Persian (Farsi). Write entirely in Persian using Persian script. Do NOT reply in English unless translating on request.',
    ttsLocale: 'fa-IR',
    sttLocale: 'fa-IR',
    ttsInstruction: 'Speak naturally in Persian.',
    script: 'Arab',
    aliases: ['fa-IR', 'farsi', 'persian'],
  },
  {
    id: 'ar',
    label: 'Arabic',
    locale: 'ar',
    baseLanguage: 'ar',
    region: null,
    aiInstruction: 'Output language: Modern Standard Arabic. Write entirely in Arabic script.',
    ttsLocale: 'ar-SA',
    sttLocale: 'ar-SA',
    ttsInstruction: 'Speak naturally in Arabic.',
    script: 'Arab',
    aliases: ['arabic'],
  },
  {
    id: 'hi',
    label: 'Hindi',
    locale: 'hi-IN',
    baseLanguage: 'hi',
    region: 'IN',
    aiInstruction: 'Output language: standard Hindi. Write entirely in Devanagari Hindi.',
    ttsLocale: 'hi-IN',
    sttLocale: 'hi-IN',
    ttsInstruction: 'Speak naturally in Hindi.',
    script: 'Deva',
    aliases: ['hindi'],
  },
  {
    id: 'ur',
    label: 'Urdu',
    locale: 'ur-PK',
    baseLanguage: 'ur',
    region: 'PK',
    aiInstruction: 'Output language: standard Urdu. Write entirely in Urdu script.',
    ttsLocale: 'ur-PK',
    sttLocale: 'ur-PK',
    ttsInstruction: 'Speak naturally in Urdu.',
    script: 'Arab',
    aliases: ['urdu'],
  },
  {
    id: 'ja',
    label: 'Japanese',
    locale: 'ja-JP',
    baseLanguage: 'ja',
    region: 'JP',
    aiInstruction: 'Output language: standard Japanese. Write entirely in Japanese.',
    ttsLocale: 'ja-JP',
    sttLocale: 'ja-JP',
    ttsInstruction: 'Speak naturally in Japanese.',
    script: 'Jpan',
    aliases: ['japanese'],
  },
];

/**
 * Visible AI Generation Language choices (stable IDs).
 * Sorted alphabetically by label via getAiGenerationLanguages().
 */
export const AI_GENERATION_LANGUAGE_IDS = Object.freeze([
  'bg-BG',
  'zh-Hans',
  'hr-HR',
  'cs-CZ',
  'da-DK',
  'nl-NL',
  'en-GB',
  'en-US',
  'fi-FI',
  'fr-FR',
  'de-DE',
  'el-GR',
  'hu-HU',
  'is-IS',
  'it-IT',
  'ja',
  'ko-KR',
  'nb-NO',
  'pl-PL',
  'pt-BR',
  'ro-RO',
  'ru-RU',
  'sr-RS',
  'sk-SK',
  'sl-SI',
  'es-ES',
  'sv-SE',
  'tr-TR',
  'uk-UA',
]);

/** New installs: practice content defaults to US English. */
export const DEFAULT_PRACTICE_LANGUAGE = 'en-US';

/**
 * Meanings language default (Persian speakers).
 * Also used as legacy DEFAULT_DICTIONARY_LANGUAGE for older call sites.
 */
export const DEFAULT_TRANSLATION_LANGUAGE = 'fa';
export const DEFAULT_DICTIONARY_LANGUAGE = DEFAULT_TRANSLATION_LANGUAGE;

/** @type {Map<string, PracticeLanguage>} */
const BY_ID = new Map(PRACTICE_LANGUAGES.map((lang) => [lang.id, lang]));

/** @type {Map<string, string>} alias/legacy → stable id */
const ALIAS_TO_ID = new Map();
for (const lang of PRACTICE_LANGUAGES) {
  ALIAS_TO_ID.set(lang.id.toLowerCase(), lang.id);
  for (const alias of lang.aliases ?? []) {
    ALIAS_TO_ID.set(String(alias).trim().toLowerCase().replace(/_/g, '-'), lang.id);
  }
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeLanguageId(value) {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase().replace(/_/g, '-');
  if (!key) return null;
  return ALIAS_TO_ID.get(key) ?? null;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isPracticeLanguageId(value) {
  return normalizeLanguageId(value) != null;
}

/** @deprecated Use isPracticeLanguageId */
export const isDictionaryLanguageCode = isPracticeLanguageId;

/**
 * @param {unknown} code
 * @returns {PracticeLanguage|null}
 */
export function resolvePracticeLanguage(code) {
  const id = normalizeLanguageId(code);
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

/**
 * Migrate stored value → stable id, or fallback.
 * @param {unknown} value
 * @param {string} [fallbackId]
 * @returns {string}
 */
export function migrateLanguageId(value, fallbackId = DEFAULT_PRACTICE_LANGUAGE) {
  const id = normalizeLanguageId(value);
  if (id) return id;
  const fallback = normalizeLanguageId(fallbackId) ?? DEFAULT_PRACTICE_LANGUAGE;
  return fallback;
}

/**
 * @param {unknown} code
 * @returns {{ code: string, label: string }|null}
 */
export function resolveDictionaryLanguage(code) {
  const lang = resolvePracticeLanguage(code);
  if (!lang) return null;
  return { code: lang.id, label: lang.label };
}

/** UI list: { code, label } for pickers (stable id as code). */
export const DICTIONARY_LANGUAGES = PRACTICE_LANGUAGES.map((lang) => ({
  code: lang.id,
  label: lang.label,
}));

/**
 * Alphabetically sorted AI Generation Language options for Settings selectors.
 * @returns {PracticeLanguage[]}
 */
export function getAiGenerationLanguages() {
  return AI_GENERATION_LANGUAGE_IDS.map((id) => BY_ID.get(id))
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));
}

/** @type {{ code: string, label: string }[]} */
export const AI_GENERATION_LANGUAGES = getAiGenerationLanguages().map((lang) => ({
  code: lang.id,
  label: lang.label,
}));

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isAiGenerationLanguageId(value) {
  const id = normalizeLanguageId(value);
  return id != null && AI_GENERATION_LANGUAGE_IDS.includes(id);
}

/**
 * Migrate stored practice/AI language onto a visible AI Generation Language id.
 * Regional aliases collapse first; non-picker ids (e.g. fa, ga-IE) fall back.
 * @param {unknown} value
 * @param {string} [fallbackId]
 * @returns {string}
 */
export function migrateAiGenerationLanguageId(
  value,
  fallbackId = DEFAULT_PRACTICE_LANGUAGE
) {
  const id = migrateLanguageId(value, fallbackId);
  if (AI_GENERATION_LANGUAGE_IDS.includes(id)) return id;
  const fallback = migrateLanguageId(fallbackId, DEFAULT_PRACTICE_LANGUAGE);
  return AI_GENERATION_LANGUAGE_IDS.includes(fallback)
    ? fallback
    : DEFAULT_PRACTICE_LANGUAGE;
}

/** @type {Record<string, { language: string, code: string }>} */
export const LANGUAGE_BY_CODE = Object.fromEntries(
  PRACTICE_LANGUAGES.map((lang) => [lang.id, { language: lang.label, code: lang.id }])
);

/**
 * @param {string} id
 * @returns {string}
 */
export function getAiInstruction(id) {
  const lang = resolvePracticeLanguage(id) ?? resolvePracticeLanguage(DEFAULT_PRACTICE_LANGUAGE);
  return lang.aiInstruction;
}

/**
 * @param {string} id
 * @returns {string}
 */
export function getTtsLocale(id) {
  return resolvePracticeLanguage(id)?.ttsLocale ?? 'en-US';
}

/**
 * @param {string} id
 * @returns {string}
 */
export function getTtsInstruction(id) {
  const lang =
    resolvePracticeLanguage(id) ?? resolvePracticeLanguage(DEFAULT_PRACTICE_LANGUAGE);
  if (!lang) {
    return 'Speak with a clear General American (United States) English accent and American pronunciation.';
  }
  return lang.ttsInstruction || `Speak naturally in ${lang.label}.`;
}

/**
 * @param {string} id
 * @returns {string}
 */
export function getSttLocale(id) {
  return resolvePracticeLanguage(id)?.sttLocale ?? 'en-US';
}

/**
 * Safe TTS locale with fallback when device/provider lacks the voice.
 * @param {string} id
 * @param {string[]} [availableLocales]
 * @returns {{ locale: string, fellBack: boolean }}
 */
export function resolveTtsLocaleWithFallback(id, availableLocales) {
  const preferred = getTtsLocale(id);
  if (!Array.isArray(availableLocales) || availableLocales.length === 0) {
    return { locale: preferred, fellBack: false };
  }
  const normalized = availableLocales.map((l) => String(l).trim());
  if (normalized.some((l) => l.toLowerCase() === preferred.toLowerCase())) {
    return { locale: preferred, fellBack: false };
  }
  const base = resolvePracticeLanguage(id)?.baseLanguage;
  const baseMatch = normalized.find((l) =>
    l.toLowerCase().startsWith(String(base).toLowerCase())
  );
  if (baseMatch) return { locale: baseMatch, fellBack: true };
  const en = normalized.find((l) => l.toLowerCase().startsWith('en'));
  if (en) return { locale: en, fellBack: true };
  return { locale: normalized[0], fellBack: true };
}
