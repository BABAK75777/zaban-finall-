/**
 * Orchestrator interface - Platform-agnostic playback orchestration
 */

import type { ChunkMetadata } from './session';

export type PlaybackState = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'error' | 'completed';

export interface PlaybackProgress {
  currentChunk: number;
  totalChunks: number;
  isPlaying: boolean;
  isProcessing: boolean;
  state?: PlaybackState;
}

export interface ChunkData {
  index: number;
  hash: string;
  audioData: Uint8Array | Blob | string; // Platform-specific audio data
  durationMsEstimate?: number;
  cacheHit?: boolean;
  latencyMs?: number;
}

/**
 * Platform-agnostic audio player interface
 */
export interface AudioPlayer {
  /**
   * Play audio from data
   */
  play(audioData: Uint8Array | Blob | string, requestId: number): Promise<void>;
  
  /**
   * Stop current playback
   */
  stop(): void;
  
  /**
   * Pause current playback
   */
  pause(): void;
  
  /**
   * Resume paused playback
   */
  resume(): void;
  
  /**
   * Check if currently playing
   */
  isPlaying(): boolean;
  
  /**
   * Get next request ID
   */
  getNextRequestId(): number;
  
  /**
   * Cancel current request
   */
  cancel(): void;
}

/**
 * Platform-agnostic storage interface
 */
export interface StorageAdapter {
  /**
   * Get chunk from storage
   */
  getChunk(hash: string): Promise<Blob | Uint8Array | null>;
  
  /**
   * Store chunk in storage
   */
  putChunk(hash: string, data: Blob | Uint8Array, meta: ChunkMetadata): Promise<void>;
  
  /**
   * Delete chunk from storage
   */
  deleteChunk(hash: string): Promise<void>;
  
  /**
   * Get session metadata
   */
  getSession(sessionKey: string): Promise<SessionMetadata | null>;
  
  /**
   * Store session metadata
   */
  putSession(session: SessionMetadata): Promise<void>;
  
  /**
   * Get cache statistics
   */
  getCacheStats(): Promise<{ count: number; bytes: number }>;
  
  /**
   * Evict least recently used chunks
   */
  evictLRU(options: { maxBytes?: number; maxCount?: number }): Promise<number>;
}

/**
 * Platform-agnostic TTS service interface
 */
export interface TtsService {
  /**
   * Fetch TTS audio for a chunk
   */
  fetchTtsAudio(
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
  ): Promise<Blob | Uint8Array>;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  player: AudioPlayer;
  storage: StorageAdapter;
  ttsService: TtsService;
  onProgress?: (progress: PlaybackProgress) => void;
}

/**
 * Base orchestrator class (platform-agnostic)
 */
export abstract class BaseOrchestrator {
  protected player: AudioPlayer;
  protected storage: StorageAdapter;
  protected ttsService: TtsService;
  protected progressCallback?: (progress: PlaybackProgress) => void;
  
  protected state: PlaybackState = 'idle';
  protected currentRequestId: number = 0;
  protected abortController: AbortController | null = null;

  constructor(config: OrchestratorConfig) {
    this.player = config.player;
    this.storage = config.storage;
    this.ttsService = config.ttsService;
    this.progressCallback = config.onProgress;
  }

  /**
   * Update progress callback
   */
  protected updateProgress(
    currentChunk: number,
    totalChunks: number,
    isPlaying: boolean,
    isProcessing: boolean,
    state?: PlaybackState
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        currentChunk,
        totalChunks,
        isPlaying,
        isProcessing,
        state: state || this.state,
      });
    }
  }

  /**
   * Get current state
   */
  getState(): PlaybackState {
    return this.state;
  }

  /**
   * Cancel current playback
   */
  abstract cancel(): void;
  
  /**
   * Cleanup resources
   */
  abstract cleanup(): void;
}

