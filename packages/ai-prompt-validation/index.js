/** @typedef {{ ok: true; prompt: string }} AiPromptValidationSuccess */
/** @typedef {{ ok: false; error: string; code: string }} AiPromptValidationFailure */
/** @typedef {AiPromptValidationSuccess | AiPromptValidationFailure} AiPromptValidationResult */

/** @typedef {'lookup_closed' | 'navigation' | 'app_background' | 'lookup_error' | 'text_replaced'} WordHighlightClearReason */

/**
 * @typedef {Object} AiInputSafetyAllowed
 * @property {true} allowed
 * @property {string} input
 * @property {string} language
 * @property {'normal' | 'math_or_physics_formula'} kind
 */

/**
 * @typedef {Object} AiInputSafetyBlocked
 * @property {false} allowed
 * @property {true} blocked
 * @property {'code_generation_not_allowed'} reason
 * @property {''} outputText
 * @property {string} userMessage
 * @property {string} language
 */

/** @typedef {AiInputSafetyAllowed | AiInputSafetyBlocked} AiInputSafetyResult */

export const AI_PROMPT_MAX_LENGTH = 1000;

export const AI_PROMPT_VALIDATION_MESSAGE =
  'Please write your AI prompt as plain text, without code or scripts.';

export const CODE_GENERATION_NOT_ALLOWED_REASON = 'code_generation_not_allowed';

export const CODE_GENERATION_USER_MESSAGE =
  'This app is for language practice, not code generation.';

const UNSAFE_PROMPT_PATTERNS = [
  { pattern: /<script\b/i, code: 'UNSAFE_SCRIPT_TAG' },
  { pattern: /<iframe\b/i, code: 'UNSAFE_IFRAME_TAG' },
  { pattern: /javascript:/i, code: 'UNSAFE_JAVASCRIPT_URI' },
  { pattern: /\bonerror\s*=/i, code: 'UNSAFE_EVENT_HANDLER' },
  { pattern: /\bonclick\s*=/i, code: 'UNSAFE_EVENT_HANDLER' },
  { pattern: /\beval\s*\(/i, code: 'UNSAFE_EVAL' },
  { pattern: /\bFunction\s*\(/i, code: 'UNSAFE_FUNCTION_CONSTRUCTOR' },
  { pattern: /```/, code: 'UNSAFE_CODE_FENCE' },
  { pattern: /\brm\s+-rf\b/i, code: 'UNSAFE_SHELL_COMMAND' },
  { pattern: /\bcurl\s+(?:-[A-Za-z]+\s+)*https?:\/\//i, code: 'UNSAFE_SHELL_COMMAND' },
  { pattern: /\bwget\s+https?:\/\//i, code: 'UNSAFE_SHELL_COMMAND' },
  { pattern: /\bpowershell(?:\.exe)?\b/i, code: 'UNSAFE_SHELL_COMMAND' },
];

const PROGRAMMING_LANGUAGE_PATTERN =
  /\b(?:javascript|typescript|python|java|c\+\+|c#|kotlin|swift|php|ruby|golang|go\s+lang|rust|sql|html|css|bash|shell|powershell|react|node\.?js|android|ios|flutter|dart)\b/i;

const CODE_GEN_ACTION_PATTERN =
  /\b(?:write|build|create|generate|give\s+me|make\s+me|implement|develop|code|script|hack|deploy)\b/i;

const MATH_PHYSICS_FORMULA_LITERALS = [
  /\bE\s*=\s*m\s*c\s*(?:\^|\*\*|²)?\s*2\b/i,
  /\bF\s*=\s*m\s*a\b/i,
  /\ba\s*(?:\^|\*\*|²)\s*2\s*\+\s*b\s*(?:\^|\*\*|²)\s*2\s*=\s*c\s*(?:\^|\*\*|²)\s*2\b/i,
];

const MATH_PHYSICS_TOPIC_PATTERNS = [
  /\bquadratic\s+formula\b/i,
  /\bphysics\s+formula\b/i,
  /\bmath(?:ematics)?\s+formula\b/i,
  /\bunit\s+conversion\s+formula\b/i,
  /\balgebra(?:ic)?\s+(?:steps?|example|problem)\b/i,
  /\b(?:explain|solve|describe|practice).{0,48}\b(?:formula|equation|physics|algebra|math)\b/i,
  /\bpractice\s+sentences?\s+about\s+math\b/i,
  /فرمول\s+نیرو/i,
  /معادله\s+درجه\s+دو/i,
  /فرمول.{0,40}(?:توضیح|حل|مثال)/i,
  /(?:توضیح|حل).{0,40}فرمول/i,
  /(?:explain|describe).{0,40}physics\s+formula/i,
];

const CODE_GENERATION_PATTERNS = [
  /\b(?:write|build|create|generate|give\s+me|make\s+me|implement|develop)\b.{0,64}\b(?:code|script|programming|software|app|application|api|website|web\s*app)\b/i,
  /\b(?:javascript|typescript|python|java|c\+\+|kotlin|swift|php|ruby|sql|html|css|bash|shell|android|ios|react|node\.?js)\s+code\b/i,
  /\bcode\s+for\b/i,
  /\bbuild\s+me\s+an?\s+(?:android|ios|mobile|web)\s+app\b/i,
  /\b(?:login|signup|sign-up|todo)\s+(?:page|app|form)\b/i,
  /\bhack(?:ing)?\s+code\b/i,
  /\bsoftware\s+implementation\b/i,
  /\bsource\s+code\b/i,
  /کد\s*(?:جاوااسکریپت|جاوا|پایتون|برنامه)/i,
  /(?:کد|برنامه).{0,24}(?:بده|بنویس|بساز)/i,
  /برام\s+برنامه\s+بنویس/i,
  /کد\s*پایتون\s*بنویس/i,
  /напиши\s+код/i,
  /код\s+на\s+(?:python|javascript|java|typescript)/i,
  /\b(?:python|javascript|java|typescript)\s+code\s+likho\b/i,
  /\bcode\s+likho\b/i,
  /\bbana\s+.{0,32}(?:javascript|python|java).{0,16}kod(?:u)?\s+yaz\b/i,
  /\bjavascript\s+kodu\s+yaz\b/i,
  /اكتب\s+(?:كود|برنامج)/i,
  /كود\s+(?:بايثون|جافا|جافاسكربت)/i,
];

const GENERATED_CODE_OUTPUT_PATTERNS = [
  /```[\s\S]*```/,
  /^\s*(?:import|export|const|let|var|function|class|def|public\s+class|#include|package)\s/m,
  /^\s*<\?php\b/m,
  /function\s+\w+\s*\([^)]*\)\s*\{/m,
  /def\s+\w+\s*\([^)]*\)\s*:/m,
  /public\s+static\s+void\s+main\s*\(/m,
];

/**
 * @param {string} text
 * @returns {string}
 */
export function detectAiInputLanguage(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return 'unknown';
  }

  if (/[\u0600-\u06FF]/.test(text)) {
    if (/[گچپژک]/.test(text)) {
      return 'fa';
    }
    if (/[\u0750-\u077F]/.test(text)) {
      return 'ar';
    }
    return 'ur';
  }

  if (/[\u0400-\u04FF]/.test(text)) {
    return 'ru';
  }

  if (/[ğıüşöçİ]/i.test(text)) {
    return 'tr';
  }

  if (/\b(?:likho|likh|hindi|urdu)\b/i.test(text)) {
    return 'hi-ur';
  }

  return 'en';
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isMathOrPhysicsFormulaRequest(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return false;
  }

  const normalized = text.trim();

  if (MATH_PHYSICS_FORMULA_LITERALS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (MATH_PHYSICS_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (
    /\b(?:formula|equation|physics|algebra|math)\b/i.test(normalized) &&
    /[=^²³+\-*/]|(?:\ba\b|\bb\b|\bc\b|\bF\b|\bE\b|\bm\b)/i.test(normalized)
  ) {
    return true;
  }

  return false;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isCodeGenerationRequest(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return false;
  }

  const normalized = text.trim();

  if (isMathOrPhysicsFormulaRequest(normalized)) {
    return false;
  }

  if (CODE_GENERATION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (CODE_GEN_ACTION_PATTERN.test(normalized) && PROGRAMMING_LANGUAGE_PATTERN.test(normalized)) {
    return true;
  }

  if (/\bcode\b/i.test(normalized) && CODE_GEN_ACTION_PATTERN.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * @param {string} source
 * @param {string} language
 */
export function logSafetyLanguage(source, language) {
  console.log(`[SAFETY] language=${language} source=${source}`);
}

/**
 * @param {string} source
 * @param {string} language
 */
export function logSafetyBlocked(source, language) {
  console.log(
    `[SAFETY] inputBlocked=true reason=${CODE_GENERATION_NOT_ALLOWED_REASON} source=${source}`
  );
  console.log(`[SAFETY] language=${language} source=${source}`);
}

/**
 * @param {string} kind
 * @param {string} source
 * @param {string} language
 */
export function logSafetyAllowed(kind, source, language) {
  console.log(`[SAFETY] allowed ${kind} source=${source}`);
  console.log(`[SAFETY] language=${language} source=${source}`);
}

/**
 * @param {unknown} raw
 * @param {{ source?: string }} [options]
 * @returns {AiInputSafetyResult}
 */
export function guardAiInput(raw, options = {}) {
  const source = options.source ?? 'unknown';
  const input = typeof raw === 'string' ? raw.trim() : '';
  const language = detectAiInputLanguage(input);

  if (!input) {
    return { allowed: true, input: '', language, kind: 'normal' };
  }

  if (isMathOrPhysicsFormulaRequest(input)) {
    logSafetyAllowed('math_or_physics_formula', source, language);
    return { allowed: true, input, language, kind: 'math_or_physics_formula' };
  }

  if (isCodeGenerationRequest(input)) {
    logSafetyBlocked(source, language);
    return {
      allowed: false,
      blocked: true,
      reason: CODE_GENERATION_NOT_ALLOWED_REASON,
      outputText: '',
      userMessage: CODE_GENERATION_USER_MESSAGE,
      language,
    };
  }

  logSafetyLanguage(source, language);
  return { allowed: true, input, language, kind: 'normal' };
}

/**
 * @param {{ word?: string, context?: string, source?: string }} params
 * @returns {AiInputSafetyResult}
 */
export function guardDictionaryLookupInput(params = {}) {
  const source = params.source ?? 'dictionary_lookup';
  const parts = [params.context, params.word]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim());
  return guardAiInput(parts.join(' '), { source });
}

/**
 * @param {string} [source]
 * @returns {{ ok: true, blocked: true, reason: 'code_generation_not_allowed', outputText: '', text: '', meaning: '', userMessage: string }}
 */
export function createBlockedAiSafetyResponse() {
  return {
    ok: true,
    blocked: true,
    reason: CODE_GENERATION_NOT_ALLOWED_REASON,
    outputText: '',
    text: '',
    meaning: '',
    userMessage: CODE_GENERATION_USER_MESSAGE,
  };
}

/**
 * @param {unknown} raw
 * @param {{ source?: string }} [options]
 * @returns {AiInputSafetyResult & { text: string }}
 */
export function guardAiOutput(raw, options = {}) {
  const source = options.source ?? 'ai_output';
  const text = typeof raw === 'string' ? raw.trim() : '';

  if (!text) {
    return { allowed: true, text: '', language: 'unknown', kind: 'normal' };
  }

  if (GENERATED_CODE_OUTPUT_PATTERNS.some((pattern) => pattern.test(text))) {
    const language = detectAiInputLanguage(text);
    logSafetyBlocked(`${source}_post`, language);
    return {
      allowed: false,
      blocked: true,
      reason: CODE_GENERATION_NOT_ALLOWED_REASON,
      outputText: '',
      userMessage: CODE_GENERATION_USER_MESSAGE,
      language,
      text: '',
    };
  }

  return {
    allowed: true,
    text,
    language: detectAiInputLanguage(text),
    kind: 'normal',
  };
}

/**
 * Validate AI practice prompt as plain text only.
 * @param {unknown} raw
 * @returns {AiPromptValidationResult}
 */
export function validateAiPrompt(raw) {
  if (typeof raw !== 'string') {
    return {
      ok: false,
      error: AI_PROMPT_VALIDATION_MESSAGE,
      code: 'INVALID_TYPE',
    };
  }

  const prompt = raw.trim();
  if (!prompt) {
    return {
      ok: false,
      error: 'prompt is required and must be a non-empty string',
      code: 'EMPTY',
    };
  }

  if (prompt.length > AI_PROMPT_MAX_LENGTH) {
    return {
      ok: false,
      error: AI_PROMPT_VALIDATION_MESSAGE,
      code: 'TOO_LONG',
    };
  }

  for (const { pattern, code } of UNSAFE_PROMPT_PATTERNS) {
    if (pattern.test(prompt)) {
      return {
        ok: false,
        error: AI_PROMPT_VALIDATION_MESSAGE,
        code,
      };
    }
  }

  return { ok: true, prompt };
}

/**
 * Escape prompt text for safe display in logs or UI shells that might render HTML.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeAiPromptForDisplay(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
