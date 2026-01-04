/**
 * Streaming TTS Orchestrator - Handles progressive TTS generation and playback
 * 
 * Features:
 * - Progressive playback (starts as soon as first chunk arrives)
 * - Chunk buffering with ordered playback
 * - Abort handling
 * - Memory leak prevention
 * - State machine
 */

import { aiAudioPlayer } from './aiAudioPlayer';
import { getBaseUrl } from './api';
import { ttsIndexedDbCache } from './ttsIndexedDbCache';

const isDev = (import.meta as any)?.env?.DEV;

function logDev(...args: unknown[]): void {
  if (isDev) {
    console.log('[TTS:Streaming]', ...args);
  }
}

export type StreamingState = 'idle' | 'connecting' | 'buffering' | 'playing' | 'paused' | 'error' | 'completed';

export interface StreamingProgress {
  state: StreamingState;
  currentChunk: number;
  totalChunks: number;
  generatedChunks: number;
  bufferedChunks: number;
  isBuffering: boolean;
}

export type StreamingProgressCallback = (progress: StreamingProgress) => void;

interface ChunkData {
  index: number;
  hash: string;
  audioBase64: string;
  durationMsEstimate?: number;
  cacheHit?: boolean;
  latencyMs?: number;
  blobUrl?: string;
  blob?: Blob;
}

class StreamingTtsOrchestrator {
  private state: StreamingState = 'idle';
  private sessionId: string | null = null;
  private requestId: number = 0;
  private eventSource: EventSource | null = null;
  private abortController: AbortController | null = null;
  
  // Chunk management
  private chunks: Map<number, ChunkData> = new Map();
  private totalChunks: number = 0;
  private generatedChunks: number = 0;
  private nextToPlayIndex: number = 0;
  private currentlyPlayingIndex: number | null = null;
  
  // Playback state
  private isPlaying: boolean = false;
  private playbackQueue: number[] = [];
  
  // Callbacks
  private progressCallback: StreamingProgressCallback | null = null;
  
  // Error state
  private lastError: Error | null = null;
  
  // Cleanup tracking
  private blobUrls: Set<string> = new Set();

  // Session options for IndexedDB storage
  private sessionOptions: { 
    voiceId: string; 
    preset: string;
    format: string; 
    speed: number;
    pitch: number;
    sampleRate: number;
  } | null = null;

  /**
   * Start a streaming TTS session
   */
  async startSession(
    text: string,
    options: {
      voiceId?: string;
      preset?: string;
      format?: string;
      chunkMaxChars?: number;
      speed?: number;
      pitch?: number;
      sampleRate?: number;
    } = {},
    onProgress?: StreamingProgressCallback
  ): Promise<string> {
    // Cancel any existing session
    this.cancel();

    this.state = 'connecting';
    this.progressCallback = onProgress || null;
    this.requestId = aiAudioPlayer.getNextRequestId();
    this.abortController = new AbortController();
    this.chunks.clear();
    this.totalChunks = 0;
    this.generatedChunks = 0;
    this.nextToPlayIndex = 0;
    this.currentlyPlayingIndex = null;
    this.isPlaying = false;
    this.playbackQueue = [];
    // Phase 6: Fixed values for removed options
    this.sessionOptions = {
      voiceId: 'en-US-Standard-C',
      preset: 'default',
      format: 'mp3',
      speed: options.speed || 1.0,
      pitch: 0.0,
      sampleRate: options.sampleRate || 24000,
    };
    this.updateProgress();

    const baseUrl = getBaseUrl();
    const sessionUrl = `${baseUrl}/tts/session`;

    logDev('▶️  Starting session:', { textLength: text.length, options });
    console.log('[TTS:Streaming:DIAG] 📡 Creating session:', {
      url: sessionUrl,
      textLength: text.length,
      optionsSummary: {
        voiceId: options.voiceId,
        preset: options.preset,
        format: options.format,
        chunkMaxChars: options.chunkMaxChars,
        speed: options.speed,
      },
    });

    try {
      // Create session
      const response = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          chunkMaxChars: options.chunkMaxChars || 1600,
          speed: options.speed || 1.0,
          sampleRate: options.sampleRate || 24000,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = `Failed to create session: ${errorData.error || response.statusText}`;
        this.state = 'error';
        this.lastError = new Error(errorMessage);
        this.updateProgress();
        throw this.lastError;
      }

      const data = await response.json();
      this.sessionId = data.sessionId;
      this.totalChunks = data.totalChunks;

      logDev('✅ Session created:', { sessionId: this.sessionId, totalChunks: this.totalChunks });
      console.log('[TTS:Streaming:DIAG] ✅ Session created:', {
        status: response.status,
        sessionId: this.sessionId,
        totalChunks: this.totalChunks,
        responseKeys: Object.keys(data),
      });

      // Connect to SSE stream
      await this.connectToStream();

      return this.sessionId;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logDev('⏹️  Session creation aborted');
        this.state = 'idle';
        return '';
      }
      logDev('❌ Session creation failed:', error);
      this.state = 'error';
      this.lastError = error instanceof Error ? error : new Error('Session creation failed');
      this.updateProgress();
      throw this.lastError;
    }
  }

  /**
   * Connect to SSE stream
   */
  private async connectToStream(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No session ID');
    }

    const baseUrl = getBaseUrl();
    const streamUrl = `${baseUrl}/tts/session/${this.sessionId}/stream`;

    this.state = 'buffering';
    this.updateProgress();

    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(streamUrl);

        this.eventSource.onopen = () => {
          logDev('🔌 SSE connection opened');
          this.state = 'buffering';
          this.updateProgress();
          resolve();
        };

        this.eventSource.onerror = (error) => {
          logDev('❌ SSE error:', error);
          if (this.state === 'connecting' || this.state === 'buffering') {
            // Phase 4: Exit buffering state on error
            const prevState = this.state;
            this.state = 'error';
            this.lastError = new Error('Failed to connect to stream');
            if (isDev) {
              console.log(`[TTS:Streaming:STATE] ${prevState} → error (SSE connection failed)`);
            }
            this.updateProgress();
            reject(this.lastError);
          }
        };

        this.eventSource.addEventListener('meta', (e: any) => {
          try {
            const data = JSON.parse(e.data);
            logDev('📋 Meta received:', data);
            console.log('[TTS:Streaming:DIAG] 📋 Meta event received:', {
              dataKeys: Object.keys(data),
              totalChunks: data.totalChunks,
              format: data.format,
            });
            if (data.totalChunks) {
              this.totalChunks = data.totalChunks;
            }
            this.updateProgress();
          } catch (err) {
            logDev('⚠️  Failed to parse meta:', err);
            console.error('[TTS:Streaming:DIAG] ⚠️  Failed to parse meta:', err, e.data);
          }
        });

        this.eventSource.addEventListener('chunk', (e: any) => {
          try {
            const data = JSON.parse(e.data);
            console.log('[TTS:Streaming:DIAG] 📦 Chunk event received:', {
              index: data.index,
              hasAudioBase64: !!data.audioBase64,
              audioBase64Length: data.audioBase64?.length,
              hash: data.hash,
              cacheHit: data.cacheHit,
            });
            this.handleChunkReceived(data);
          } catch (err) {
            logDev('⚠️  Failed to parse chunk:', err);
            console.error('[TTS:Streaming:DIAG] ⚠️  Failed to parse chunk:', err, e.data);
          }
        });

        this.eventSource.addEventListener('progress', (e: any) => {
          try {
            const data = JSON.parse(e.data);
            console.log('[TTS:Streaming:DIAG] 📊 Progress event received:', {
              generated: data.generated,
              total: data.total,
              dataKeys: Object.keys(data),
            });
            this.generatedChunks = data.generated || 0;
            this.updateProgress();
          } catch (err) {
            logDev('⚠️  Failed to parse progress:', err);
            console.error('[TTS:Streaming:DIAG] ⚠️  Failed to parse progress:', err, e.data);
          }
        });

        this.eventSource.addEventListener('error', (e: any) => {
          try {
            const data = JSON.parse(e.data);
            logDev('⚠️  Chunk error:', data);
            // Phase 4: Handle chunk error - exit buffering and set error state
            if (this.state === 'buffering' || this.state === 'connecting' || this.state === 'playing') {
              const prevState = this.state;
              this.state = 'error';
              this.lastError = new Error(data.message || data.error || 'Chunk generation error');
              if (isDev) {
                console.log(`[TTS:Streaming:STATE] ${prevState} → error (chunk error: ${data.error || data.message})`);
              }
              this.updateProgress();
            }
          } catch (err) {
            logDev('⚠️  Failed to parse error:', err);
          }
        });

        this.eventSource.addEventListener('done', (e: any) => {
          try {
            logDev('✅ All chunks generated');
            if (this.state === 'buffering' && this.chunks.size === 0) {
              // No chunks received, might be an error
              this.state = 'error';
            } else if (this.chunks.size > 0) {
              // Wait for playback to complete
              if (!this.isPlaying) {
                this.state = 'completed';
              }
            }
            this.updateProgress();
          } catch (err) {
            logDev('⚠️  Failed to parse done:', err);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle chunk received from SSE
   */
  private handleChunkReceived(data: {
    index: number;
    hash: string;
    audioBase64?: string;
    durationMsEstimate?: number;
    cacheHit?: boolean;
    latencyMs?: number;
    // Support for alternative response formats
    audio?: { data: string; mimeType?: string };
    audioContent?: string;
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data: string; mimeType?: string } }> } }>;
  }) {
    const { index, hash, durationMsEstimate, cacheHit, latencyMs } = data;

    logDev(`📦 Chunk ${index} received:`, {
      cacheHit,
      latencyMs,
      durationEstimate: durationMsEstimate,
      hasAudioBase64: !!data.audioBase64,
      hasAudio: !!data.audio,
      hasAudioContent: !!data.audioContent,
      hasCandidates: !!data.candidates,
    });
    if (isDev) {
      console.log('[TTS:Streaming:DIAG] 📦 handleChunkReceived:', {
        index,
        hasAudioBase64: !!data.audioBase64,
        hasAudio: !!data.audio,
        hasAudioContent: !!data.audioContent,
        hasCandidates: !!data.candidates,
        hash,
        cacheHit,
        latencyMs,
        nextToPlayIndex: this.nextToPlayIndex,
        currentState: this.state,
      });
    }

    // Extract audio from various response formats
    const audioData = this.extractAudioFromResponse(data);
    
    if (!audioData || !audioData.audioBase64) {
      logDev(`❌ Chunk ${index} has no audio data. Response shape:`, Object.keys(data));
      if (isDev) {
        console.warn('[TTS:Streaming] No audio returned for chunk', index, 'Response:', data);
      }
      // Phase 4: Exit buffering on no audio error
      const prevState = this.state;
      this.state = 'error';
      this.lastError = new Error(`No audio returned for chunk ${index}`);
      if (isDev) {
        console.log(`[TTS:Streaming:STATE] ${prevState} → error (no audio for chunk ${index})`);
      }
      this.updateProgress();
      return;
    }

    // Decode base64 to blob
    try {
      const binaryString = atob(audioData.audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Use mimeType from response, default to format from options, fallback to audio/wav
      const mimeType = audioData.mimeType || 
        (this.sessionOptions?.format === 'mp3' ? 'audio/mpeg' :
         this.sessionOptions?.format === 'wav' ? 'audio/wav' :
         this.sessionOptions?.format === 'ogg' ? 'audio/ogg' : 'audio/wav');
      
      const blob = new Blob([bytes], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      this.blobUrls.add(blobUrl);

      const chunkData: ChunkData = {
        index,
        hash,
        audioBase64: audioData.audioBase64,
        durationMsEstimate,
        cacheHit,
        latencyMs,
        blob,
        blobUrl,
      };

      // Buffer increment happens here when chunk is successfully parsed
      this.chunks.set(index, chunkData);
      
      logDev(`✅ Chunk ${index} buffered. Total buffered: ${this.chunks.size}`);

      // Store in IndexedDB (non-blocking, fire-and-forget)
      if (this.sessionOptions) {
        ttsIndexedDbCache.putChunk(hash, blob, {
          format: this.sessionOptions.format as 'mp3' | 'wav' | 'ogg',
          voiceId: this.sessionOptions.voiceId,
          preset: this.sessionOptions.preset,
          speed: this.sessionOptions.speed,
          pitch: this.sessionOptions.pitch,
          sampleRate: this.sessionOptions.sampleRate,
        }).catch(err => {
          logDev('Failed to store chunk in IndexedDB:', err);
        });
      }

      // If this is the next chunk to play, start playing
      if (index === this.nextToPlayIndex && !this.isPlaying) {
        this.playNextChunk();
      }

      // Update progress - buffer count has incremented
      this.updateProgress();
    } catch (error) {
      logDev(`❌ Failed to process chunk ${index}:`, error);
      // Phase 4: Exit buffering on processing error
      const prevState = this.state;
      this.state = 'error';
      this.lastError = error instanceof Error ? error : new Error(`Failed to process chunk ${index}`);
      if (isDev) {
        console.log(`[TTS:Streaming:STATE] ${prevState} → error (failed to process chunk ${index})`);
      }
      this.updateProgress();
    }
  }

  /**
   * Play next chunk in sequence
   */
  private async playNextChunk(): Promise<void> {
    if (this.isPlaying || this.currentlyPlayingIndex !== null) {
      return; // Already playing
    }

    const chunk = this.chunks.get(this.nextToPlayIndex);
    if (!chunk || !chunk.blob) {
      // Chunk not ready yet, wait
      this.state = 'buffering';
      this.updateProgress();
      return;
    }

    this.isPlaying = true;
    this.currentlyPlayingIndex = this.nextToPlayIndex;
    this.state = 'playing';
    this.updateProgress();

    logDev(`▶️  Playing chunk ${this.nextToPlayIndex + 1}/${this.totalChunks}`);

    try {
      await aiAudioPlayer.play(chunk.blob, this.requestId);

      // Check if still current request
      if (this.requestId !== aiAudioPlayer.getCurrentRequestId()) {
        logDev('⏹️  Playback cancelled (stale request)');
        return;
      }

      // Cleanup this chunk's blob URL
      if (chunk.blobUrl) {
        URL.revokeObjectURL(chunk.blobUrl);
        this.blobUrls.delete(chunk.blobUrl);
      }

      // Move to next chunk
      this.nextToPlayIndex++;
      this.currentlyPlayingIndex = null;
      this.isPlaying = false;

      // Check if more chunks to play
      if (this.nextToPlayIndex < this.totalChunks) {
        // Try to play next chunk
        const nextChunk = this.chunks.get(this.nextToPlayIndex);
        if (nextChunk) {
          // Next chunk is ready, play it
          this.playNextChunk();
        } else {
          // Next chunk not ready, wait
          this.state = 'buffering';
          this.updateProgress();
        }
      } else {
        // All chunks played
        this.state = 'completed';
        this.updateProgress();
        logDev('✅ All chunks played');
      }
    } catch (error) {
      logDev(`❌ Playback error for chunk ${this.nextToPlayIndex}:`, error);
      this.currentlyPlayingIndex = null;
      this.isPlaying = false;
      
      // Try next chunk on error (non-fatal)
      this.nextToPlayIndex++;
      if (this.nextToPlayIndex < this.totalChunks) {
        this.playNextChunk();
      } else {
        this.state = 'completed';
        this.updateProgress();
      }
    }
  }

  /**
   * Cancel current session
   */
  cancel(): void {
    logDev('⏹️  Cancelling streaming session');

    // Abort fetch requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Close SSE connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Cancel audio playback
    aiAudioPlayer.cancel();

    // Cancel backend session if exists
    if (this.sessionId) {
      const baseUrl = getBaseUrl();
      fetch(`${baseUrl}/tts/session/${this.sessionId}/cancel`, {
        method: 'POST',
      }).catch(() => {
        // Ignore errors
      });
    }

    // Cleanup blob URLs
    for (const url of this.blobUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch (err) {
        // Ignore errors
      }
    }
    this.blobUrls.clear();

    // Reset state
    this.state = 'idle';
    this.sessionId = null;
    this.requestId = 0;
    this.chunks.clear();
    this.totalChunks = 0;
    this.generatedChunks = 0;
    this.nextToPlayIndex = 0;
    this.currentlyPlayingIndex = null;
    this.isPlaying = false;
    this.playbackQueue = [];
    this.sessionOptions = null;
    this.lastError = null;
    this.updateProgress();
  }

  /**
   * Get current state
   */
  getState(): StreamingState {
    return this.state;
  }
  
  /**
   * Get last error
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Phase 4: Update progress callback with clear state machine rules
   */
  private updateProgress(): void {
    if (typeof this.progressCallback === 'function') {
      try {
        // Phase 4: Clear state machine rules
        // isBuffering = true only if state is 'buffering' AND next chunk not ready
        // isBuffering = false if state is 'error', 'idle', 'completed', or 'playing'
        const isBuffering = this.state === 'buffering' && 
                           !this.chunks.has(this.nextToPlayIndex) &&
                           this.state !== 'error';
        
        const progress = {
          state: this.state,
          currentChunk: this.nextToPlayIndex,
          totalChunks: this.totalChunks,
          generatedChunks: this.generatedChunks,
          bufferedChunks: this.chunks.size,
          isBuffering: isBuffering,
        };
        
        // Phase 4: Log state transitions (dev-only)
        if (isDev) {
          const prevState = (this as any).__prevState || 'idle';
          if (prevState !== this.state) {
            console.log(`[TTS:Streaming:STATE] ${prevState} → ${this.state}`, {
              bufferedChunks: this.chunks.size,
              totalChunks: this.totalChunks,
              nextToPlayIndex: this.nextToPlayIndex,
              isBuffering: isBuffering,
              hasNextChunk: this.chunks.has(this.nextToPlayIndex),
            });
            (this as any).__prevState = this.state;
          }
        }
        
        console.log('[TTS:Streaming:DIAG] 📊 Progress update:', progress);
        this.progressCallback(progress);
      } catch (err) {
        logDev('⚠️  Error in progress callback:', err);
      }
    }
  }
  
  /**
   * Extract audio data from various response formats
   * Supports:
   * - { audio: { data, mimeType } }
   * - { audioContent: "base64..." }
   * - { candidates: [{ content: { parts: [{ inlineData: { data, mimeType } }] } }] }
   * - Direct audioBase64 string
   */
  private extractAudioFromResponse(data: any): { audioBase64: string; mimeType: string } | null {
    // Format 1: { audio: { data, mimeType } }
    if (data.audio?.data) {
      return {
        audioBase64: data.audio.data,
        mimeType: data.audio.mimeType || 'audio/wav',
      };
    }
    
    // Format 2: { audioContent: "base64..." }
    if (data.audioContent) {
      return {
        audioBase64: data.audioContent,
        mimeType: 'audio/wav', // Default if not specified
      };
    }
    
    // Format 3: { candidates: [{ content: { parts: [{ inlineData: { data, mimeType } }] } }] }
    if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
        for (const part of candidate.content.parts) {
          if (part.inlineData?.data) {
            return {
              audioBase64: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'audio/wav',
            };
          }
        }
      }
    }
    
    // Format 4: Direct audioBase64 (existing format)
    if (data.audioBase64) {
      return {
        audioBase64: data.audioBase64,
        mimeType: 'audio/mpeg', // Default for existing format
      };
    }
    
    return null;
  }
}

// Export singleton
export const streamingTtsOrchestrator = new StreamingTtsOrchestrator();

