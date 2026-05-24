/**
 * Environment variable utilities — OpenRouter only
 */

const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * @returns {string}
 */
export function getOpenRouterBaseUrl() {
  const url = (process.env.OPENROUTER_BASE_URL || DEFAULT_OPENROUTER_BASE_URL).trim();
  return url.replace(/\/$/, '');
}

/**
 * @returns {string | null}
 */
export function getOpenRouterApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (key && typeof key === 'string' && key.trim().length > 0) {
    return key.trim();
  }
  return null;
}

/**
 * @returns {boolean}
 */
export function isOpenRouterConfigured() {
  return getOpenRouterApiKey() !== null;
}

/** @deprecated Legacy OpenAI env shim — prefer OpenRouter. */
export function getOpenAIApiKey() {
  const openai = process.env.OPENAI_API_KEY;
  if (openai && typeof openai === 'string' && openai.trim().length > 0) {
    return openai.trim();
  }
  return getOpenRouterApiKey();
}

/** @deprecated Legacy OpenAI env shim — prefer OpenRouter. */
export function isOpenAIApiKeyConfigured() {
  return getOpenAIApiKey() !== null;
}

/**
 * Default TTS model on OpenRouter (override via OPENROUTER_TTS_MODEL)
 * @returns {string}
 */
export function getOpenRouterTtsModel() {
  return process.env.OPENROUTER_TTS_MODEL || 'openai/gpt-4o-mini-tts-2025-12-15';
}

/**
 * Default chat/vision model on OpenRouter (override via OPENROUTER_CHAT_MODEL)
 * @returns {string}
 */
export function getOpenRouterChatModel() {
  return process.env.OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini';
}
