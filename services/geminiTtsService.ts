/**
 * TTS Service - Handles communication with backend TTS endpoint
 * Supports structured error responses and AbortController
 */

import { storageService } from "./storageService";
import { AISpeed } from "../types";
import { getBaseUrl } from "./api";

const isDev = (import.meta as any)?.env?.DEV;

function logDev(...args: unknown[]): void {
  if (isDev) {
    console.log('[TTS:Service]', ...args);
  }
}

// Generate request ID for telemetry
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Custom error classes for better error handling
export class TtsError extends Error {
  constructor(
    message: string,
    public code: 'TTS_EMPTY' | 'TTS_BACKEND_ERROR' | 'TTS_ABORTED' | 'TTS_NETWORK_ERROR' | 'TTS_UNKNOWN' | 'RATE_LIMITED' | 'TTS_TIMEOUT',
    public details?: unknown,
    public requestId?: string
  ) {
    super(message);
    this.name = 'TtsError';
  }
}

async function withRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 1500,
  abortSignal?: AbortSignal
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    // Check if aborted
    if (abortSignal?.aborted || err.name === 'AbortError') {
      throw new TtsError('TTS request was aborted', 'TTS_ABORTED');
    }

    const isRateLimit = err?.message?.includes("429") || err?.status === 429 || err?.message?.includes("RESOURCE_EXHAUSTED");
    if (retries > 0 && isRateLimit) {
      logDev(`Rate limit hit. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 2, abortSignal);
    }
    throw err;
  }
}

export const ttsService = {
  /**
   * Fetch TTS audio from backend using hash (new optimized method)
   * @param text - Text to synthesize
   * @param hash - SHA1 hash of the chunk
   * @param options - TTS options (voiceId, preset, speed, pitch, format, sampleRate)
   * @param abortSignal - Optional AbortSignal to cancel request
   * @returns Promise<Blob> - Audio blob
   * @throws TtsError with appropriate error code
   */
  async fetchTtsAudioByHash(
    text: string,
    hash: string,
    options?: {
      voiceId?: string;
      preset?: string;
      speed?: number;
      pitch?: number;
      format?: string;
      sampleRate?: number;
    },
    abortSignal?: AbortSignal
  ): Promise<Blob> {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new TtsError('Text is empty or invalid', 'TTS_EMPTY');
    }

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/tts`;
    logDev('Fetching audio by hash...', { url, textLength: text.length, hash, options });

    try {
      const blob = await withRetry(async () => {
        // Check if aborted before making request
        if (abortSignal?.aborted) {
          throw new TtsError('Request was aborted', 'TTS_ABORTED');
        }

        // Generate request ID for telemetry
        const requestId = generateRequestId();
        
        const requestBody: any = { text, hash };
        if (options) {
          if (options.voiceId) requestBody.voiceId = options.voiceId;
          if (options.preset) requestBody.preset = options.preset;
          if (options.speed !== undefined) requestBody.speed = options.speed;
          if (options.pitch !== undefined) requestBody.pitch = options.pitch;
          if (options.format) requestBody.format = options.format;
          if (options.sampleRate) requestBody.sampleRate = options.sampleRate;
        }
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
          },
          body: JSON.stringify(requestBody),
          signal: abortSignal,
        });

        logDev('Response received:', { 
          status: response.status, 
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          cacheHit: response.headers.get('X-Cache-Hit') === 'true'
        });

        // Handle error responses
        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          
          // Try to parse structured error JSON
          if (contentType?.includes('application/json')) {
            try {
              const errorData = await response.json();
              logDev('Structured error response:', errorData);
              
              if (errorData.ok === false) {
                // Backend returned structured error
                const errorCode = errorData.error || 'TTS_BACKEND_ERROR';
                const errorDetails = errorData.details || errorData;
                const backendRequestId = response.headers.get('X-Request-Id');
                
                // Map backend error codes to frontend error codes
                let frontendCode: TtsError['code'] = 'TTS_BACKEND_ERROR';
                if (errorCode === 'EMPTY_TEXT' || errorCode === 'INVALID_REQUEST') {
                  frontendCode = 'TTS_EMPTY';
                } else if (errorCode === 'RATE_LIMITED' || errorCode === 'CONCURRENCY_LIMITED') {
                  frontendCode = 'RATE_LIMITED';
                } else if (errorCode === 'TTS_TIMEOUT') {
                  frontendCode = 'TTS_TIMEOUT';
                }
                
                throw new TtsError(
                  `TTS failed: ${errorCode}`,
                  frontendCode,
                  { ...errorDetails, backendRequestId },
                  backendRequestId || undefined
                );
              }
            } catch (parseError) {
              logDev('Failed to parse error JSON:', parseError);
            }
          }
          
          // Fallback: read as text
          const errorText = await response.text();
          throw new TtsError(
            `TTS request failed: ${response.status} ${errorText}`,
            'TTS_BACKEND_ERROR',
            { status: response.status, body: errorText }
          );
        }

        // Phase 2: Handle standardized response contract
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          logDev('Structured success response:', { 
            ok: data.ok, 
            hasAudio: !!data.audioBase64,
            mimeType: data.mimeType
          });
          
          // Phase 2: Check for error response
          if (data.ok === false) {
            const errorCode = data.error || 'TTS_BACKEND_ERROR';
            const errorDetails = data.details || '';
            const debugId = data.debugId;
            
            // Map backend error codes to frontend error codes
            let frontendCode: TtsError['code'] = 'TTS_BACKEND_ERROR';
            if (errorCode === 'NO_AUDIO') {
              frontendCode = 'TTS_BACKEND_ERROR';
            } else if (errorCode === 'PROVIDER_ERROR') {
              frontendCode = 'TTS_BACKEND_ERROR';
            }
            
            throw new TtsError(
              `TTS failed: ${errorCode}${debugId ? ` (debugId: ${debugId})` : ''}`,
              frontendCode,
              { error: errorCode, details: errorDetails, debugId },
              debugId || undefined
            );
          }
          
          // Phase 2: Handle success response with standardized contract
          if (data.ok === true && data.audioBase64) {
            // Use mimeType from response, fallback to audio/mpeg
            const mimeType = data.mimeType || 'audio/mpeg';
            
            // Decode base64
            const binaryString = atob(data.audioBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const audioBlob = new Blob([bytes], { type: mimeType });
            return audioBlob;
          } else {
            throw new TtsError(
              'Response missing audio data',
              'TTS_BACKEND_ERROR',
              { response: data }
            );
          }
        }
        
        // Fallback: handle binary audio response
        const audioBlob = await response.blob();
        
        if (audioBlob.size === 0) {
          throw new TtsError(
            'Received empty audio blob',
            'TTS_BACKEND_ERROR'
          );
        }
        
        logDev('Audio blob received:', { size: audioBlob.size, type: audioBlob.type });
        return audioBlob;
      }, 3, 1500, abortSignal);

      return blob;
    } catch (error) {
      // Re-throw TtsError as-is
      if (error instanceof TtsError) {
        throw error;
      }
      
      // Handle abort
      if (abortSignal?.aborted || error instanceof Error && error.name === 'AbortError') {
        throw new TtsError('TTS request was aborted', 'TTS_ABORTED');
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new TtsError(
          'Network error connecting to TTS service',
          'TTS_NETWORK_ERROR',
          { originalError: error.message }
        );
      }
      
      // Unknown error
      logDev('Unknown error:', error);
      throw new TtsError(
        error instanceof Error ? error.message : 'Unknown TTS error',
        'TTS_UNKNOWN',
        { originalError: error }
      );
    }
  },

  /**
   * Fetch TTS audio from backend (legacy method, kept for compatibility)
   * @param text - Text to synthesize
   * @param path - Storage path for caching
   * @param speed - Playback speed (unused, kept for compatibility)
   * @param options - TTS options (voiceId, preset, pitch, format, sampleRate)
   * @param abortSignal - Optional AbortSignal to cancel request
   * @returns Promise<Blob> - Audio blob
   * @throws TtsError with appropriate error code
   */
  async fetchTtsAudio(
    text: string, 
    path: string, 
    speed: AISpeed = 1.0,
    options?: {
      voiceId?: string;
      preset?: string;
      pitch?: number;
      format?: string;
      sampleRate?: number;
    },
    abortSignal?: AbortSignal
  ): Promise<Blob> {
    // Check cache first
    const cachedBlob = await storageService.getBlob(path);
    if (cachedBlob) {
      logDev('Using cached audio for path:', path);
      return cachedBlob;
    }

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new TtsError('Text is empty or invalid', 'TTS_EMPTY');
    }

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/tts`;
    logDev('Fetching audio...', { url, textLength: text.length, path });

    try {
      const blob = await withRetry(async () => {
        // Check if aborted before making request
        if (abortSignal?.aborted) {
          throw new TtsError('Request was aborted', 'TTS_ABORTED');
        }

        // Generate request ID for telemetry
        const requestId = generateRequestId();
        
        const requestBody: any = { text, path };
        if (options) {
          if (options.voiceId) requestBody.voiceId = options.voiceId;
          if (options.preset) requestBody.preset = options.preset;
          if (options.pitch !== undefined) requestBody.pitch = options.pitch;
          if (options.format) requestBody.format = options.format;
          if (options.sampleRate) requestBody.sampleRate = options.sampleRate;
        }
        requestBody.speed = speed; // Legacy speed parameter
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
          },
          body: JSON.stringify(requestBody),
          signal: abortSignal,
        });

        logDev('Response received:', { 
          status: response.status, 
          statusText: response.statusText,
          contentType: response.headers.get('content-type')
        });

        // Handle error responses
        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          
          // Try to parse structured error JSON
          if (contentType?.includes('application/json')) {
            try {
              const errorData = await response.json();
              logDev('Structured error response:', errorData);
              
              if (errorData.ok === false) {
                // Backend returned structured error
                const errorCode = errorData.error || 'TTS_BACKEND_ERROR';
                const errorDetails = errorData.details || errorData;
                const backendRequestId = response.headers.get('X-Request-Id');
                
                // Map backend error codes to frontend error codes
                let frontendCode: TtsError['code'] = 'TTS_BACKEND_ERROR';
                if (errorCode === 'EMPTY_TEXT' || errorCode === 'INVALID_REQUEST') {
                  frontendCode = 'TTS_EMPTY';
                } else if (errorCode === 'RATE_LIMITED' || errorCode === 'CONCURRENCY_LIMITED') {
                  frontendCode = 'RATE_LIMITED';
                } else if (errorCode === 'TTS_TIMEOUT') {
                  frontendCode = 'TTS_TIMEOUT';
                }
                
                throw new TtsError(
                  `TTS failed: ${errorCode}`,
                  frontendCode,
                  { ...errorDetails, backendRequestId },
                  backendRequestId || undefined
                );
              }
            } catch (parseError) {
              logDev('Failed to parse error JSON:', parseError);
            }
          }
          
          // Fallback: read as text
          const errorText = await response.text();
          throw new TtsError(
            `TTS request failed: ${response.status} ${errorText}`,
            'TTS_BACKEND_ERROR',
            { status: response.status, body: errorText }
          );
        }

        // Handle success response
        const contentType = response.headers.get('content-type');
        
        // Check if response is JSON (structured response)
        if (contentType?.includes('application/json')) {
          try {
            const data = await response.json();
            logDev('Structured success response:', { 
              ok: data.ok, 
              hasAudio: !!data.audio,
              path: data.path 
            });
            
            if (data.ok === true && data.audio) {
              // Handle base64 audio
              if (typeof data.audio === 'string') {
                // Decode base64
                const binaryString = atob(data.audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
                await storageService.saveBlob(path, audioBlob);
                return audioBlob;
              } else {
                throw new TtsError(
                  'Invalid audio format in response',
                  'TTS_BACKEND_ERROR',
                  { response: data }
                );
              }
            } else {
              throw new TtsError(
                'Response missing audio data',
                'TTS_BACKEND_ERROR',
                { response: data }
              );
            }
          } catch (parseError) {
            // If JSON parsing fails, try as blob
            logDev('JSON parse failed, trying as blob:', parseError);
          }
        }
        
        // Handle binary audio response (direct audio/mpeg)
        const audioBlob = await response.blob();
        
        if (audioBlob.size === 0) {
          throw new TtsError(
            'Received empty audio blob',
            'TTS_BACKEND_ERROR'
          );
        }
        
        logDev('Audio blob received:', { size: audioBlob.size, type: audioBlob.type });
        await storageService.saveBlob(path, audioBlob);
        return audioBlob;
      }, 3, 1500, abortSignal);

      return blob;
    } catch (error) {
      // Re-throw TtsError as-is
      if (error instanceof TtsError) {
        throw error;
      }
      
      // Handle abort
      if (abortSignal?.aborted || error instanceof Error && error.name === 'AbortError') {
        throw new TtsError('TTS request was aborted', 'TTS_ABORTED');
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new TtsError(
          'Network error connecting to TTS service',
          'TTS_NETWORK_ERROR',
          { originalError: error.message }
        );
      }
      
      // Unknown error
      logDev('Unknown error:', error);
      throw new TtsError(
        error instanceof Error ? error.message : 'Unknown TTS error',
        'TTS_UNKNOWN',
        { originalError: error }
      );
    }
  }
};
