/**
 * TTS Orchestrator - Advanced TTS pipeline for long texts
 * 
 * Features:
 * - Deterministic chunking with SHA1 hashing
 * - Two-layer caching (LRU frontend + backend file cache)
 * - Concurrency control (max 2 in-flight requests)
 * - Progress tracking
 * - Playback controls (play/pause/stop/skip)
 * - UI responsiveness (non-blocking)
 */

import { prepareChunks, Chunk } from './textChunker';
import { ttsService, TtsError } from './geminiTtsService';
import { aiAudioPlayer } from './aiAudioPlayer';
import { ttsIndexedDbCache, generateSessionKey } from './ttsIndexedDbCache';

const isDev = (import.meta as any)?.env?.DEV;

function logDev(...args: unknown[]): void {
  if (isDev) {
    console.log('[TTS:Orchestrator]', ...args);
  }
}

// Configuration
const MAX_CONCURRENT_REQUESTS = 2;
const FRONTEND_CACHE_SIZE = 50; // LRU limit

// Event types
export type OrchestratorStage = 'idle' | 'preparing' | 'generating' | 'playing' | 'paused' | 'error';
export type OrchestratorState = {
  stage: OrchestratorStage;
  currentChunkIndex: number;
  totalChunks: number;
  isPlaying: boolean;
  isPaused: boolean;
};

export type OrchestratorProgress = {
  stage: OrchestratorStage;
  chunkIndex: number;
  total: number;
  message?: string;
};

export type OrchestratorError = {
  chunkIndex?: number;
  error: Error | TtsError;
  message: string;
};

// Event callbacks
type ProgressCallback = (progress: OrchestratorProgress) => void;
type ErrorCallback = (error: OrchestratorError) => void;
type StateCallback = (state: OrchestratorState) => void;

// Frontend cache entry
interface CacheEntry {
  blobUrl: string;
  createdAt: number;
}

// LRU Cache implementation
class LRUCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(hash: string): string | null {
    const entry = this.cache.get(hash);
    if (!entry) return null;

    // Move to end (most recently used)
    this.cache.delete(hash);
    this.cache.set(hash, entry);
    return entry.blobUrl;
  }

  set(hash: string, blobUrl: string): void {
    // If already exists, update
    if (this.cache.has(hash)) {
      this.cache.delete(hash);
    }
    // If at capacity, remove oldest (first item)
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        const oldEntry = this.cache.get(firstKey);
        if (oldEntry) {
          URL.revokeObjectURL(oldEntry.blobUrl);
        }
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(hash, {
      blobUrl,
      createdAt: Date.now(),
    });
  }

  clear(): void {
    for (const entry of this.cache.values()) {
      URL.revokeObjectURL(entry.blobUrl);
    }
    this.cache.clear();
  }
}

class TTSOrchestrator {
  private chunks: Chunk[] = [];
  private currentChunkIndex: number = -1;
  private stage: OrchestratorStage = 'idle';
  private isPaused: boolean = false;
  private abortController: AbortController | null = null;
  private requestId: number = 0;
  
  // Event callbacks
  private progressCallback: ProgressCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  private stateCallback: StateCallback | null = null;

  // Concurrency control
  private inFlightRequests: Set<string> = new Set(); // Set of chunk hashes
  private requestQueue: Array<{ chunk: Chunk; resolve: (blob: Blob) => void; reject: (err: Error) => void }> = [];

  // Frontend cache
  private frontendCache = new LRUCache(FRONTEND_CACHE_SIZE);

  // Preload tracking
  private preloadNextChunk: boolean = false;
  private preloadedBlob: Blob | null = null;

  // Session tracking
  private currentSessionKey: string | null = null;
  private sessionUpdateThrottle: number | null = null;
  private fullText: string = '';
  private sessionOptions: { 
    voiceId: string; 
    preset: string;
    speed: number; 
    pitch: number;
    format: string;
    sampleRate: number;
  } | null = null;

  // Offline detection
  private get isOffline(): boolean {
    return typeof navigator !== 'undefined' && !navigator.onLine;
  }

  /**
   * Prepare text into chunks
   */
  async prepare(
    text: string,
    options: {
      voiceId?: string;
      preset?: string;
      speed?: number;
      pitch?: number;
      format?: string;
      sampleRate?: number;
    } = {}
  ): Promise<Chunk[]> {
    logDev('Preparing chunks...', { textLength: text.length, options });

    // Use requestAnimationFrame to avoid blocking UI
    await new Promise(resolve => requestAnimationFrame(resolve));

    this.updateStage('preparing');
    this.emitProgress({ stage: 'preparing', chunkIndex: 0, total: 0, message: 'Preparing chunks...' });

    // Phase 6: Fixed values for removed options
    const voiceId = 'en-US-Standard-C';
    const preset = 'default';
    const speed = options.speed || 1.0;
    const pitch = 0.0;
    const format = 'mp3';
    const sampleRate = options.sampleRate || 24000;

    const chunks = await prepareChunks(text, voiceId, preset, speed, pitch, format, sampleRate);

    this.chunks = chunks;
    this.fullText = text;
    this.sessionOptions = { voiceId, preset, speed, pitch, format, sampleRate };

    // Generate session key
    this.currentSessionKey = await generateSessionKey(text, voiceId, preset, speed, pitch, format, sampleRate);

    // Load or create session
    const existingSession = await ttsIndexedDbCache.getSession(this.currentSessionKey);
    if (existingSession) {
      logDev('Found existing session:', existingSession);
    } else {
      // Create new session
      const title = text.substring(0, 40).replace(/\s+/g, ' ');
      await ttsIndexedDbCache.putSession({
        sessionKey: this.currentSessionKey,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalChunks: chunks.length,
        lastPlayedIndex: 0,
        chunkHashes: chunks.map(c => c.hash),
        title,
        voiceId,
        preset,
        speed,
        pitch,
        format,
        sampleRate,
        fullText: text, // Store full text for resume
      });
    }

    logDev('Chunks prepared:', chunks.length);

    this.updateStage('idle');
    this.emitProgress({ stage: 'idle', chunkIndex: 0, total: chunks.length });

    return chunks;
  }

  /**
   * Play from a specific chunk index
   */
  async playFrom(index: number): Promise<void> {
    if (this.chunks.length === 0) {
      throw new Error('No chunks prepared. Call prepare() first.');
    }

    if (index < 0 || index >= this.chunks.length) {
      throw new Error(`Invalid chunk index: ${index}. Must be between 0 and ${this.chunks.length - 1}`);
    }

    logDev('Playing from chunk', index);

    // Cancel any existing playback
    this.cancel();

    // Reset state
    this.currentChunkIndex = index - 1; // Will be incremented in playNext
    this.isPaused = false;
    this.requestId = aiAudioPlayer.getNextRequestId();
    this.abortController = new AbortController();

    // Start playback
    await this.playNext();
  }

  /**
   * Play next chunk
   */
  private async playNext(): Promise<void> {
    if (this.abortController?.signal.aborted) {
      return;
    }

    this.currentChunkIndex++;

    if (this.currentChunkIndex >= this.chunks.length) {
      // All chunks played
      this.updateStage('idle');
      this.emitProgress({ stage: 'idle', chunkIndex: this.chunks.length, total: this.chunks.length });
      return;
    }

    const chunk = this.chunks[this.currentChunkIndex];
    const requestId = this.requestId;

    try {
      // Update progress - generating
      this.updateStage('generating');
      this.emitProgress({
        stage: 'generating',
        chunkIndex: this.currentChunkIndex + 1,
        total: this.chunks.length,
        message: `Generating audio... chunk ${this.currentChunkIndex + 1}/${this.chunks.length}`,
      });

      // Get audio blob (with caching and concurrency control)
      const blob = await this.getChunkAudio(chunk);

      // Check if cancelled
      if (this.abortController?.signal.aborted || requestId !== this.requestId) {
        return;
      }

      // Update progress - playing
      this.updateStage('playing');
      this.emitProgress({
        stage: 'playing',
        chunkIndex: this.currentChunkIndex + 1,
        total: this.chunks.length,
        message: `Playing... chunk ${this.currentChunkIndex + 1}/${this.chunks.length}`,
      });

      // Preload next chunk while current is playing (if concurrency allows)
      if (this.currentChunkIndex + 1 < this.chunks.length && this.inFlightRequests.size < MAX_CONCURRENT_REQUESTS) {
        this.preloadNextChunk = true;
        this.preloadChunk(this.chunks[this.currentChunkIndex + 1]).catch(err => {
          logDev('Preload failed:', err);
        });
      }

      // Play the chunk
      await aiAudioPlayer.play(blob, requestId);

      // Check if cancelled during playback
      if (this.abortController?.signal.aborted || requestId !== this.requestId) {
        return;
      }

      // Update session last played index (throttled)
      this.updateSessionLastPlayedIndex(this.currentChunkIndex);

      // Auto-play next chunk if not paused
      if (!this.isPaused) {
        await this.playNext();
      }
    } catch (err) {
      if (this.abortController?.signal.aborted || requestId !== this.requestId) {
        return;
      }

      // Handle error
      const error = err instanceof TtsError ? err : new Error(err instanceof Error ? err.message : String(err));
      this.emitError({
        chunkIndex: this.currentChunkIndex,
        error,
        message: `Failed to process chunk ${this.currentChunkIndex + 1}: ${error.message}`,
      });

      // Continue with next chunk (non-fatal)
      if (this.currentChunkIndex + 1 < this.chunks.length) {
        await this.playNext();
      } else {
        this.updateStage('error');
      }
    }
  }

  /**
   * Get audio blob for chunk (with caching and concurrency control)
   * Priority: Memory LRU -> IndexedDB -> Backend
   */
  private async getChunkAudio(chunk: Chunk): Promise<Blob> {
    // Check frontend memory cache first (fastest)
    const cachedUrl = this.frontendCache.get(chunk.hash);
    if (cachedUrl) {
      logDev('Memory cache hit for chunk', chunk.index);
      const response = await fetch(cachedUrl);
      return await response.blob();
    }

    // Check IndexedDB cache (persistent storage)
    const indexedDbBlob = await ttsIndexedDbCache.getChunk(chunk.hash);
    if (indexedDbBlob) {
      logDev('IndexedDB cache hit for chunk', chunk.index);
      // Store in memory cache for faster access
      const blobUrl = URL.createObjectURL(indexedDbBlob);
      this.frontendCache.set(chunk.hash, blobUrl);
      return indexedDbBlob;
    }

    // If offline, throw error
    if (this.isOffline) {
      throw new Error(`Chunk ${chunk.index} not available offline`);
    }

    // Check if we can make request now (concurrency control)
    if (this.inFlightRequests.size >= MAX_CONCURRENT_REQUESTS) {
      // Queue the request
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ chunk, resolve, reject });
      });
    }

    // Make request to backend
    this.inFlightRequests.add(chunk.hash);
    try {
      const blob = await ttsService.fetchTtsAudioByHash(
        chunk.text,
        chunk.hash,
        this.sessionOptions ? {
          voiceId: this.sessionOptions.voiceId,
          preset: this.sessionOptions.preset,
          speed: this.sessionOptions.speed,
          pitch: this.sessionOptions.pitch,
          format: this.sessionOptions.format,
          sampleRate: this.sessionOptions.sampleRate,
        } : undefined,
        this.abortController?.signal
      );

      // Store in frontend memory cache
      const blobUrl = URL.createObjectURL(blob);
      this.frontendCache.set(chunk.hash, blobUrl);

      // Store in IndexedDB (non-blocking, fire-and-forget)
      if (this.sessionOptions) {
        ttsIndexedDbCache.putChunk(chunk.hash, blob, {
          format: this.sessionOptions.format as 'mp3' | 'wav' | 'ogg',
          voiceId: this.sessionOptions.voiceId,
          speed: this.sessionOptions.speed,
          pitch: this.sessionOptions.pitch,
        }).catch(err => {
          logDev('Failed to store chunk in IndexedDB:', err);
        });
      }

      // Process queue
      this.processQueue();

      return blob;
    } catch (error) {
      // If fetch failed and we're offline, check IndexedDB again
      // (in case we missed it due to race condition)
      if (this.isOffline) {
        const fallbackBlob = await ttsIndexedDbCache.getChunk(chunk.hash);
        if (fallbackBlob) {
          logDev('Fallback IndexedDB cache hit for chunk', chunk.index);
          const blobUrl = URL.createObjectURL(fallbackBlob);
          this.frontendCache.set(chunk.hash, blobUrl);
          return fallbackBlob;
        }
      }
      throw error;
    } finally {
      this.inFlightRequests.delete(chunk.hash);
    }
  }

  /**
   * Preload a chunk (for smoother playback)
   */
  private async preloadChunk(chunk: Chunk): Promise<void> {
    if (!this.preloadNextChunk) return;

    try {
      const blob = await this.getChunkAudio(chunk);
      this.preloadedBlob = blob;
      logDev('Preloaded chunk', chunk.index);
    } catch (err) {
      logDev('Preload failed for chunk', chunk.index, err);
    }
  }

  /**
   * Process request queue
   */
  private processQueue(): void {
    while (this.requestQueue.length > 0 && this.inFlightRequests.size < MAX_CONCURRENT_REQUESTS) {
      const { chunk, resolve, reject } = this.requestQueue.shift()!;
      this.inFlightRequests.add(chunk.hash);

      this.getChunkAudio(chunk)
        .then(blob => {
          this.inFlightRequests.delete(chunk.hash);
          resolve(blob);
          this.processQueue();
        })
        .catch(err => {
          this.inFlightRequests.delete(chunk.hash);
          reject(err);
          this.processQueue();
        });
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.stage === 'playing') {
      this.isPaused = true;
      aiAudioPlayer.stop();
      this.updateStage('paused');
      this.emitProgress({
        stage: 'paused',
        chunkIndex: this.currentChunkIndex + 1,
        total: this.chunks.length,
      });
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (this.stage === 'paused' && this.currentChunkIndex < this.chunks.length) {
      this.isPaused = false;
      this.updateStage('playing');
      this.playNext();
    }
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.cancel();
  }

  /**
   * Cancel all operations
   */
  cancel(): void {
    logDev('Cancelling orchestrator');

    // Abort all in-flight requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Clear queue
    this.requestQueue.forEach(({ reject }) => {
      reject(new Error('Cancelled'));
    });
    this.requestQueue = [];

    // Stop audio
    aiAudioPlayer.cancel();

    // Reset state
    this.currentChunkIndex = -1;
    this.stage = 'idle';
    this.isPaused = false;
    this.preloadNextChunk = false;
    this.preloadedBlob = null;
    this.inFlightRequests.clear();

    this.emitProgress({ stage: 'idle', chunkIndex: 0, total: this.chunks.length });
  }

  /**
   * Skip to next chunk
   */
  async skipNext(): Promise<void> {
    if (this.currentChunkIndex < this.chunks.length - 1) {
      aiAudioPlayer.stop();
      await this.playFrom(this.currentChunkIndex + 1);
    }
  }

  /**
   * Skip to previous chunk
   */
  async skipPrevious(): Promise<void> {
    if (this.currentChunkIndex > 0) {
      aiAudioPlayer.stop();
      await this.playFrom(this.currentChunkIndex - 1);
    }
  }

  /**
   * Event handlers
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  onError(callback: ErrorCallback): void {
    this.errorCallback = callback;
  }

  onState(callback: StateCallback): void {
    this.stateCallback = callback;
  }

  /**
   * Emit progress event
   */
  private emitProgress(progress: OrchestratorProgress): void {
    if (this.progressCallback) {
      // Use setTimeout(0) to avoid blocking render
      setTimeout(() => {
        this.progressCallback!(progress);
      }, 0);
    }
  }

  /**
   * Emit error event
   */
  private emitError(error: OrchestratorError): void {
    if (this.errorCallback) {
      setTimeout(() => {
        this.errorCallback!(error);
      }, 0);
    }
  }

  /**
   * Update stage and emit state
   */
  private updateStage(stage: OrchestratorStage): void {
    this.stage = stage;
    if (this.stateCallback) {
      setTimeout(() => {
        this.stateCallback!({
          stage: this.stage,
          currentChunkIndex: this.currentChunkIndex,
          totalChunks: this.chunks.length,
          isPlaying: this.stage === 'playing',
          isPaused: this.isPaused,
        });
      }, 0);
    }
  }

  /**
   * Get current state
   */
  getState(): OrchestratorState {
    return {
      stage: this.stage,
      currentChunkIndex: this.currentChunkIndex,
      totalChunks: this.chunks.length,
      isPlaying: this.stage === 'playing',
      isPaused: this.isPaused,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.cancel();
    this.frontendCache.clear();
    this.progressCallback = null;
    this.errorCallback = null;
    this.stateCallback = null;
    this.currentSessionKey = null;
    this.fullText = '';
    this.sessionOptions = null;
    if (this.sessionUpdateThrottle) {
      clearTimeout(this.sessionUpdateThrottle);
      this.sessionUpdateThrottle = null;
    }
  }

  /**
   * Update session last played index (throttled to avoid excessive writes)
   */
  private updateSessionLastPlayedIndex(index: number): void {
    if (!this.currentSessionKey) return;

    // Throttle updates to once per second
    if (this.sessionUpdateThrottle) {
      clearTimeout(this.sessionUpdateThrottle);
    }

    this.sessionUpdateThrottle = window.setTimeout(async () => {
      await ttsIndexedDbCache.updateSessionLastPlayed(this.currentSessionKey!, index);
      this.sessionUpdateThrottle = null;
    }, 1000);
  }

  /**
   * Resume from last session
   */
  async resumeLastSession(): Promise<{ chunks: Chunk[]; startIndex: number; fullText: string } | null> {
    const lastSession = await ttsIndexedDbCache.getLastSession();
    if (!lastSession || !lastSession.fullText) {
      return null;
    }

    logDev('Resuming last session:', lastSession);

    // Re-prepare chunks from stored text
    if (lastSession.voiceId && lastSession.speed !== undefined && lastSession.format) {
      const chunks = await this.prepare(lastSession.fullText, {
        voiceId: lastSession.voiceId,
        preset: lastSession.preset || 'default',
        speed: lastSession.speed,
        pitch: lastSession.pitch || 0.0,
        format: lastSession.format,
        sampleRate: lastSession.sampleRate || 24000,
      });

      this.currentSessionKey = lastSession.sessionKey;

      return {
        chunks,
        startIndex: lastSession.lastPlayedIndex,
        fullText: lastSession.fullText,
      };
    }

    return null;
  }

  /**
   * Resume from a specific session key
   */
  async resumeSession(sessionKey: string): Promise<{ chunks: Chunk[]; startIndex: number; fullText: string } | null> {
    const session = await ttsIndexedDbCache.getSession(sessionKey);
    if (!session || !session.fullText) {
      return null;
    }

    logDev('Resuming session:', session);

    // Re-prepare chunks from stored text
    if (session.voiceId && session.speed !== undefined && session.format) {
      const chunks = await this.prepare(session.fullText, {
        voiceId: session.voiceId,
        preset: session.preset || 'default',
        speed: session.speed,
        pitch: session.pitch || 0.0,
        format: session.format,
        sampleRate: session.sampleRate || 24000,
      });

      this.currentSessionKey = sessionKey;

      return {
        chunks,
        startIndex: session.lastPlayedIndex,
        fullText: session.fullText,
      };
    }

    return null;
  }
}

// Export singleton instance
export const ttsOrchestrator = new TTSOrchestrator();

