/**
 * OpenRouter API client — all AI traffic routes through OpenRouter only.
 */

import {
  getOpenRouterApiKey,
  getOpenRouterBaseUrl,
  getOpenRouterTtsModel,
  getOpenRouterChatModel,
  isOpenRouterConfigured,
} from './env.js';

export class OpenRouterError extends Error {
  /**
   * @param {string} message
   * @param {number} [status]
   * @param {string} [body]
   */
  constructor(message, status, body) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
    this.body = body;
  }
}

/**
 * @param {string} path
 * @param {RequestInit} init
 */
async function openRouterFetch(path, init) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not configured');
  }

  const baseUrl = getOpenRouterBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  };

  if (process.env.OPENROUTER_HTTP_REFERER) {
    headers['HTTP-Referer'] = process.env.OPENROUTER_HTTP_REFERER;
  }
  if (process.env.OPENROUTER_APP_NAME) {
    headers['X-Title'] = process.env.OPENROUTER_APP_NAME;
  }

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    const body = await response.text();
    throw new OpenRouterError(
      `OpenRouter request failed: ${response.status} ${body.slice(0, 500)}`,
      response.status,
      body
    );
  }

  return response;
}

/**
 * Text-to-speech via OpenRouter POST /audio/speech
 *
 * @param {{ text: string, voice?: string, speed?: number, responseFormat?: 'mp3' | 'wav' }} params
 * @returns {Promise<{ buffer: Buffer, mimeType: string, format: string }>}
 */
export async function openRouterSpeech({
  text,
  voice = 'alloy',
  speed = 1.0,
  responseFormat = 'mp3',
}) {
  const format = responseFormat === 'wav' ? 'wav' : 'mp3';
  const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
  const model = getOpenRouterTtsModel();

  console.log('[OpenRouter] provider=openrouter TTS request:', {
    model,
    voice,
    speed,
    format,
    textLength: text.length,
  });

  const body = {
    model,
    input: text,
    voice,
    response_format: format,
    speed,
  };

  // OpenRouter TTS (OpenAI-compatible path per product requirements)
  const response = await openRouterFetch('/audio/speech', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const arrayBuffer = await response.arrayBuffer();
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new OpenRouterError('OpenRouter TTS returned empty audio');
  }

  console.log('[OpenRouter] provider=openrouter TTS response:', {
    bytes: arrayBuffer.byteLength,
    mimeType,
  });

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
    format,
  };
}

/**
 * Chat completions via OpenRouter POST /chat/completions
 *
 * @param {{ messages: object[], model?: string, max_tokens?: number }} params
 * @returns {Promise<string>}
 */
export async function openRouterChatCompletion({
  messages,
  model = getOpenRouterChatModel(),
  max_tokens = 4096,
}) {
  console.log('[OpenRouter] provider=openrouter chat request:', {
    model,
    messageCount: messages.length,
  });

  const response = await openRouterFetch('/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ model, messages, max_tokens }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  console.log('[OpenRouter] provider=openrouter chat response:', {
    contentLength: typeof content === 'string' ? content.length : 0,
  });

  return content;
}

export { isOpenRouterConfigured };
