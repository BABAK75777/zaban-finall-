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

/** @typedef {{ model: string, responseFormat: 'mp3' | 'pcm', mimeType: string, sampleRate?: number }} TtsProfile */

/** Models verified against OpenRouter speech API (2026-06). */
const TTS_PROFILES = [
  {
    model: 'x-ai/grok-voice-tts-1.0',
    responseFormat: 'mp3',
    mimeType: 'audio/mpeg',
  },
  {
    model: 'google/gemini-3.1-flash-tts-preview',
    responseFormat: 'pcm',
    mimeType: 'audio/wav',
    sampleRate: 24000,
  },
];

function isMaleVoiceToken(voice) {
  const v = String(voice || '').trim().toLowerCase();
  return (
    v === 'male' ||
    v === 'onyx' ||
    v === 'echo' ||
    v === 'fable' ||
    v === 'ash' ||
    v === 'rex' ||
    v === 'leo'
  );
}

/**
 * Map app voice tokens to provider-specific voice ids.
 * @param {string} model
 * @param {string} voice
 */
function resolveVoiceForModel(model, voice) {
  const male = isMaleVoiceToken(voice);

  if (model.includes('grok-voice')) {
    return male ? 'Rex' : 'Ara';
  }

  if (model.includes('gemini') && model.includes('tts')) {
    return male ? 'Puck' : 'Aoede';
  }

  if (model.includes('mai-voice')) {
    return 'en-US-Harper:MAI-Voice-2';
  }

  return voice || 'default';
}

function pcm16ToWav(pcmBuffer, sampleRate = 24000, channels = 1) {
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

function getTtsProfiles() {
  const configured = getOpenRouterTtsModel();
  const ordered = [...TTS_PROFILES];
  const idx = ordered.findIndex((p) => p.model === configured);
  if (idx > 0) {
    const [preferred] = ordered.splice(idx, 1);
    ordered.unshift(preferred);
  }
  return ordered;
}

/**
 * Text-to-speech via OpenRouter POST /audio/speech
 *
 * @param {{ text: string, voice?: string, speed?: number, responseFormat?: 'mp3' | 'wav' | 'pcm' }} params
 * @returns {Promise<{ buffer: Buffer, mimeType: string, format: string }>}
 */
export async function openRouterSpeech({
  text,
  voice = 'female',
  speed = 1.0,
  responseFormat = 'mp3',
}) {
  const profiles = getTtsProfiles();
  let lastError = null;

  for (const profile of profiles) {
    const providerVoice = resolveVoiceForModel(profile.model, voice);
    const format = profile.responseFormat;

    console.log('[OpenRouter] provider=openrouter TTS request:', {
      model: profile.model,
      voice: providerVoice,
      speed,
      format,
      textLength: text.length,
    });

    try {
      const response = await openRouterFetch('/audio/speech', {
        method: 'POST',
        body: JSON.stringify({
          model: profile.model,
          input: text,
          voice: providerVoice,
          response_format: format,
          speed,
        }),
      });

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new OpenRouterError('OpenRouter TTS returned empty audio');
      }

      let buffer = Buffer.from(arrayBuffer);
      let mimeType = profile.mimeType;
      let outFormat = format;

      if (format === 'pcm') {
        buffer = pcm16ToWav(buffer, profile.sampleRate ?? 24000, 1);
        mimeType = 'audio/wav';
        outFormat = 'wav';
      }

      console.log('[OpenRouter] provider=openrouter TTS response:', {
        model: profile.model,
        bytes: buffer.length,
        mimeType,
      });

      return { buffer, mimeType, format: outFormat };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        err instanceof OpenRouterError &&
        (err.status === 400 || err.status === 404 || msg.includes('does not exist'));
      console.warn(`[OpenRouter] TTS model failed (${profile.model}):`, msg);
      if (!retryable) {
        throw err;
      }
    }
  }

  throw lastError ?? new OpenRouterError('OpenRouter TTS failed for all models');
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
