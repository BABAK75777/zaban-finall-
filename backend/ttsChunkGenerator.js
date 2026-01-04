/**
 * TTS Chunk Generator - Generates audio for chunks with retry logic
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.join(__dirname, 'cache', 'tts');

/**
 * Compute hash for chunk caching (includes all parameters)
 */
function computeHash(text, voiceId, preset, speed, pitch, format, sampleRate) {
  const normalized = text.trim().replace(/\s+/g, ' ').replace(/\n+/g, '\n');
  const input = `${normalized}|${voiceId}|${preset || 'default'}|${speed}|${pitch || 0}|${format}|${sampleRate || 24000}`;
  return crypto.createHash('sha1').update(input).digest('hex');
}

/**
 * Check if chunk is cached
 */
function getCachedChunk(hash, format) {
  const cacheFile = path.join(CACHE_DIR, `${hash}.${format}`);
  if (fs.existsSync(cacheFile)) {
    const audioBuffer = fs.readFileSync(cacheFile);
    return audioBuffer.toString('base64');
  }
  return null;
}

/**
 * Save chunk to cache
 */
function saveCachedChunk(hash, format, audioBase64) {
  try {
    const cacheFile = path.join(CACHE_DIR, `${hash}.${format}`);
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    fs.writeFileSync(cacheFile, audioBuffer);
    return true;
  } catch (err) {
    console.error(`[TTS:ChunkGenerator] Failed to save cache:`, err);
    return false;
  }
}

/**
 * Generate audio for a chunk with retry logic
 * 
 * @param {Object} params
 * @param {string} params.text - Chunk text
 * @param {string} params.voiceId - Voice ID
 * @param {string} params.preset - Voice preset
 * @param {number} params.speed - Playback speed
 * @param {number} params.pitch - Pitch adjustment
 * @param {string} params.format - Audio format
 * @param {number} params.sampleRate - Sample rate
 * @param {string} params.apiKey - Google API key
 * @param {AbortSignal} params.abortSignal - Abort signal
 * @param {number} params.maxRetries - Max retry attempts
 * @returns {Promise<{audioBase64: string, cacheHit: boolean, latencyMs: number, hash: string}>}
 */
export async function generateChunkAudio({
  text,
  voiceId = 'en-US-Standard-C',
  preset = 'default',
  speed = 1.0,
  pitch = 0.0,
  format = 'mp3',
  sampleRate = 24000,
  apiKey,
  abortSignal,
  maxRetries = 3,
}) {
  const startTime = Date.now();
  const hash = computeHash(text, voiceId, preset, speed, pitch, format, sampleRate);
  
  // Check cache first (try the exact format, then fallback to common formats)
  const formats = [format, 'mp3', 'wav', 'ogg'];
  let cachedAudio = null;
  for (const fmt of formats) {
    cachedAudio = getCachedChunk(hash, fmt);
    if (cachedAudio) {
      break;
    }
  }
  
  if (cachedAudio) {
    const latencyMs = Date.now() - startTime;
    return {
      audioBase64: cachedAudio,
      cacheHit: true,
      latencyMs,
      hash,
    };
  }

  // Generate with retry
  let lastError;
  const delays = [250, 750, 1500]; // Exponential backoff
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check if aborted
    if (abortSignal?.aborted) {
      throw new Error('Generation aborted');
    }

    try {
      const ttsResponse = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: 'en-US',
              name: voiceId,
            },
            audioConfig: {
              audioEncoding: format.toUpperCase(),
              sampleRateHertz: sampleRate,
              speakingRate: speed,
            },
          }),
          signal: abortSignal,
        }
      );

      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text();
        let errorBody;
        try {
          errorBody = JSON.parse(errorText);
        } catch {
          errorBody = { raw: errorText };
        }
        
        // Don't retry on 4xx errors (client errors)
        if (ttsResponse.status >= 400 && ttsResponse.status < 500) {
          throw new Error(`TTS API error: ${ttsResponse.status} ${JSON.stringify(errorBody)}`);
        }
        
        // Retry on 5xx errors
        throw new Error(`TTS API error: ${ttsResponse.status} ${JSON.stringify(errorBody)}`);
      }

      const data = await ttsResponse.json();
      
      if (!data.audioContent) {
        throw new Error('No audioContent in TTS API response');
      }

      const audioBase64 = data.audioContent;
      const latencyMs = Date.now() - startTime;

      // Save to cache
      saveCachedChunk(hash, format, audioBase64);

      return {
        audioBase64,
        cacheHit: false,
        latencyMs,
        hash,
      };
    } catch (error) {
      lastError = error;
      
      // Don't retry if aborted
      if (abortSignal?.aborted || error.name === 'AbortError') {
        throw new Error('Generation aborted');
      }
      
      // Don't retry on last attempt
      if (attempt < maxRetries) {
        const delay = delays[Math.min(attempt, delays.length - 1)];
        console.warn(
          `[TTS:ChunkGenerator] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms:`,
          error.message
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  throw new Error(`Failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Estimate audio duration (rough estimate: ~150 words per minute)
 */
export function estimateDurationMs(text, speed = 1.0) {
  const words = text.trim().split(/\s+/).length;
  const wordsPerMinute = 150 * speed;
  const minutes = words / wordsPerMinute;
  return Math.round(minutes * 60 * 1000);
}

