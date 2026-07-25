/**
 * TTS Chunk Generator — OpenRouter TTS with retry logic
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { openRouterSpeech, OpenRouterError } from './utils/openrouter.js';
import { isOpenRouterConfigured } from './utils/env.js';
import {
  getTtsInstruction,
  getTtsLocale,
  migrateLanguageId,
} from '@zaban/dictionary-languages';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.join(__dirname, 'cache', 'tts');

function computeHash(text, voiceId, preset, speed, pitch, format, sampleRate) {
  const normalized = text.trim().replace(/\s+/g, ' ').replace(/\n+/g, '\n');
  const input = `${normalized}|${voiceId}|${preset || 'default'}|${speed}|${pitch || 0}|${format}|${sampleRate || 24000}`;
  return crypto.createHash('sha1').update(input).digest('hex');
}

function getCachedChunk(hash, format) {
  const cacheFile = path.join(CACHE_DIR, `${hash}.${format}`);
  if (fs.existsSync(cacheFile)) {
    return fs.readFileSync(cacheFile).toString('base64');
  }
  return null;
}

function saveCachedChunk(hash, format, audioBase64) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(CACHE_DIR, `${hash}.${format}`), Buffer.from(audioBase64, 'base64'));
    return true;
  } catch (err) {
    console.error(`[TTS:ChunkGenerator] Failed to save cache:`, err);
    return false;
  }
}

function generateSilentWavBuffer() {
  const sampleRate = 22050;
  const bitsPerSample = 16;
  const numChannels = 1;
  const numSamples = Math.floor(sampleRate * 0.5);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 36 + dataSize;
  const buffer = Buffer.alloc(fileSize);
  let offset = 0;
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;
  buffer.writeUInt16LE(1, offset); offset += 2;
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), offset); offset += 4;
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset);
  return buffer;
}

/**
 * @param {Object} params
 * @returns {Promise<{audioBase64: string, cacheHit: boolean, latencyMs: number, hash: string}>}
 */
export async function generateChunkAudio({
  text,
  voiceId = 'alloy',
  preset = 'default',
  speed = 1.0,
  pitch = 0.0,
  format = 'mp3',
  sampleRate = 24000,
  abortSignal,
  maxRetries = 3,
}) {
  const startTime = Date.now();
  const hash = computeHash(text, voiceId, preset, speed, pitch, format, sampleRate);
  const voice = typeof voiceId === 'string' && voiceId.includes('-') ? 'alloy' : (voiceId || 'alloy');

  const formats = [format, 'mp3', 'wav', 'ogg'];
  for (const fmt of formats) {
    const cached = getCachedChunk(hash, fmt);
    if (cached) {
      return { audioBase64: cached, cacheHit: true, latencyMs: Date.now() - startTime, hash };
    }
  }

  if (!isOpenRouterConfigured()) {
    if (process.env.TTS_DEV_FALLBACK_SILENT_WAV === 'true') {
      const audioBase64 = generateSilentWavBuffer().toString('base64');
      saveCachedChunk(hash, format, audioBase64);
      return { audioBase64, cacheHit: false, latencyMs: Date.now() - startTime, hash };
    }
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const responseFormat = format.toLowerCase() === 'wav' ? 'wav' : 'mp3';
  let lastError;
  const delays = [250, 750, 1500];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (abortSignal?.aborted) {
      throw new Error('Generation aborted');
    }

    try {
      const localeFromVoice = String(voiceId || '').split('-Standard')[0] || '';
      const languageId = migrateLanguageId(localeFromVoice || 'en-US');
      const { buffer } = await openRouterSpeech({
        text,
        voice,
        speed,
        responseFormat,
        locale: localeFromVoice || getTtsLocale(languageId),
        instructions: getTtsInstruction(languageId),
      });

      if (abortSignal?.aborted) {
        throw new Error('Generation aborted');
      }

      const audioBase64 = buffer.toString('base64');
      saveCachedChunk(hash, format, audioBase64);
      return {
        audioBase64,
        cacheHit: false,
        latencyMs: Date.now() - startTime,
        hash,
      };
    } catch (error) {
      lastError = error;

      if (abortSignal?.aborted || error.name === 'AbortError') {
        throw new Error('Generation aborted');
      }

      if (process.env.TTS_DEV_FALLBACK_SILENT_WAV === 'true') {
        const audioBase64 = generateSilentWavBuffer().toString('base64');
        saveCachedChunk(hash, format, audioBase64);
        return { audioBase64, cacheHit: false, latencyMs: Date.now() - startTime, hash };
      }

      const status = error instanceof OpenRouterError ? error.status : undefined;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = delays[Math.min(attempt, delays.length - 1)];
        console.warn(
          `[TTS:ChunkGenerator] provider=openrouter attempt ${attempt + 1}/${maxRetries + 1} failed, retry in ${delay}ms:`,
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}

export function estimateDurationMs(text, speed = 1.0) {
  const words = text.trim().split(/\s+/).length;
  const wordsPerMinute = 150 * speed;
  return Math.round((words / wordsPerMinute) * 60 * 1000);
}
