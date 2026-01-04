/**
 * Chunked TTS Player - Handles TTS for long texts by chunking and queuing
 * 
 * State machine: idle -> loading -> playing -> idle
 * Ensures only one playback at a time with proper cleanup
 */

import { aiAudioPlayer } from './aiAudioPlayer';
import { storageService } from './storageService';
import { ttsService, TtsError } from './geminiTtsService';
import { chunkText, ChunkInfo } from './textChunker';

const isDev = (import.meta as any)?.env?.DEV;

function logDev(...args: unknown[]): void {
  if (isDev) {
    console.log('[TTS:ChunkedPlayer]', ...args);
  }
}

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'error';

export interface PlaybackProgress {
  currentChunk: number;
  totalChunks: number;
  isPlaying: boolean;
  isProcessing: boolean;
  state?: PlaybackState;
}

export type ProgressCallback = (progress: PlaybackProgress) => void;

class ChunkedTtsPlayer {
  private currentRequestId: number = 0;
  private state: PlaybackState = 'idle';
  private progressCallback: ProgressCallback | null = null;
  private abortController: AbortController | null = null;
  private isPlayingGuard: boolean = false; // Guard against double play()

  /**
   * Play TTS for text, chunking if necessary
   * 
   * State transitions:
   * - idle -> loading (on play start)
   * - loading -> playing (when first chunk starts)
   * - playing -> idle (on completion or cancel)
   * - any -> idle (on error)
   */
  async play(
    text: string,
    path: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    // Guard against double play()
    if (this.isPlayingGuard) {
      logDev('⚠️  play() called while already playing, cancelling previous');
      this.cancel();
      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    logDev('▶️  play() called', { textLength: text.length, path, currentState: this.state });
    
    // Cancel any existing playback immediately
    this.cancel();

    // Start new request
    this.currentRequestId = aiAudioPlayer.getNextRequestId();
    this.state = 'loading';
    this.isPlayingGuard = true;
    this.progressCallback = onProgress || null;
    this.abortController = new AbortController();

    const requestId = this.currentRequestId;
    const abortSignal = this.abortController.signal;

    try {
      // Chunk the text
      const chunks = chunkText(text);
      logDev('Text chunked into', chunks.length, 'chunks');

      if (chunks.length === 0) {
        throw new Error('No text to play');
      }

      // Update progress - loading state
      this.updateProgress(0, chunks.length, false, true, 'loading');

      // Play chunks sequentially
      for (let i = 0; i < chunks.length; i++) {
        // Check if cancelled or aborted
        if (abortSignal.aborted || requestId !== this.currentRequestId) {
          logDev('⏹️  Playback aborted at chunk', i + 1);
          this.state = 'idle';
          this.updateProgress(0, 0, false, false, 'idle');
          return;
        }

        // Update progress - processing chunk
        this.updateProgress(i, chunks.length, false, true, 'loading');

        const chunk = chunks[i];
        const chunkPath = `${path}_chunk_${i}`;

        try {
          // Fetch TTS for this chunk (with caching and abort support)
          logDev(`📥 Fetching TTS for chunk ${i + 1}/${chunks.length}`);
          const chunkBlob = await ttsService.fetchTtsAudio(
            chunk,
            chunkPath,
            1.0, // Always use 1.0 speed for AI audio
            abortSignal
          );

          // Check if cancelled during fetch
          if (abortSignal.aborted || requestId !== this.currentRequestId) {
            logDev('⏹️  Playback cancelled during chunk fetch', i + 1);
            this.state = 'idle';
            this.updateProgress(0, 0, false, false, 'idle');
            return;
          }

          // Update progress - now playing
          this.state = 'playing';
          this.updateProgress(i, chunks.length, true, false, 'playing');

          // Play the chunk
          await aiAudioPlayer.play(chunkBlob, requestId);

          // Check if cancelled during playback
          if (abortSignal.aborted || requestId !== this.currentRequestId) {
            logDev('⏹️  Playback cancelled during chunk playback', i + 1);
            this.state = 'idle';
            this.updateProgress(0, 0, false, false, 'idle');
            return;
          }
        } catch (err) {
          // Phase 2: Handle errors and exit buffering state
          if (err instanceof TtsError) {
            if (err.code === 'TTS_ABORTED') {
              logDev('⏹️  TTS fetch aborted for chunk', i + 1);
              this.state = 'idle';
              this.updateProgress(0, 0, false, false, 'idle');
              return;
            }
            // Phase 2: For NO_AUDIO or PROVIDER_ERROR, exit buffering and stop
            if (err.code === 'TTS_BACKEND_ERROR' && 
                (err.details?.error === 'NO_AUDIO' || err.details?.error === 'PROVIDER_ERROR')) {
              logDev('❌ TTS backend error (NO_AUDIO/PROVIDER_ERROR), exiting buffering:', err.message);
              this.state = 'idle';
              this.updateProgress(0, 0, false, false, 'idle');
              // Call progress callback with error state if available
              if (this.progressCallback) {
                this.progressCallback({
                  current: 0,
                  total: chunks.length,
                  isPlaying: false,
                  isProcessing: false,
                  state: 'idle'
                });
              }
              throw err; // Re-throw to propagate error to UI
            }
            // For other TTS errors, log but continue (non-fatal per chunk)
            logDev('⚠️  TTS error for chunk', i + 1, err.code, err.message);
          } else {
            logDev('⚠️  Error processing chunk', i + 1, err);
          }
          // Continue with next chunk on error (non-fatal)
          if (isDev) {
            console.warn(`[TTS:ChunkedPlayer] Chunk ${i + 1} failed, continuing...`, err);
          }
        }
      }

      // Update progress - complete
      this.state = 'idle';
      this.updateProgress(chunks.length, chunks.length, false, false, 'idle');
      logDev('✅ All chunks played successfully');
    } catch (err) {
      logDev('❌ Chunked playback error:', err);
      this.state = 'error';
      this.updateProgress(0, 0, false, false, 'error');
      
      // Only throw if this is still the current request
      if (requestId === this.currentRequestId) {
        // Re-throw TtsError as-is for proper error handling
        if (err instanceof TtsError) {
          throw err;
        }
        // Wrap other errors
        throw new Error(`TTS playback failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      // Cleanup
      if (requestId === this.currentRequestId) {
        this.isPlayingGuard = false;
        if (this.state !== 'error') {
          this.state = 'idle';
        }
        this.updateProgress(0, 0, false, false, this.state);
      }
    }
  }

  /**
   * Cancel current playback immediately
   * 
   * Performs complete cleanup:
   * - Aborts all in-flight requests
   * - Stops audio playback
   * - Resets state to idle
   * - Cleans up resources
   */
  cancel(): void {
    if (this.state === 'idle') {
      return; // Already idle, nothing to cancel
    }

    logDev('⏹️  Cancelling chunked playback', { previousState: this.state });
    
    // Abort all in-flight requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    // Cancel audio player
    aiAudioPlayer.cancel();
    
    // Invalidate current request
    this.currentRequestId = aiAudioPlayer.getNextRequestId();
    
    // Reset state
    this.state = 'idle';
    this.isPlayingGuard = false;
    
    // Update progress
    this.updateProgress(0, 0, false, false, 'idle');
    
    logDev('✅ Cancellation complete');
  }

  /**
   * Stop current playback (alias for cancel, but keeps state)
   */
  stop(): void {
    this.cancel();
  }

  /**
   * Cleanup all resources
   * Call this when component unmounts
   */
  cleanup(): void {
    logDev('🧹 Cleaning up ChunkedTtsPlayer');
    this.cancel();
    this.progressCallback = null;
  }

  /**
   * Check if currently playing
   */
  isCurrentlyPlaying(): boolean {
    return this.state === 'playing' || this.state === 'loading';
  }

  /**
   * Get current state
   */
  getState(): PlaybackState {
    return this.state;
  }

  /**
   * Get abort signal for API calls
   */
  getAbortSignal(): AbortSignal | null {
    return this.abortController?.signal || null;
  }

  /**
   * Update progress callback with state
   */
  private updateProgress(
    current: number,
    total: number,
    isPlaying: boolean,
    isProcessing: boolean,
    state?: PlaybackState
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        currentChunk: current,
        totalChunks: total,
        isPlaying,
        isProcessing,
        state: state || this.state,
      });
    }
  }
}

// Export singleton instance
export const chunkedTtsPlayer = new ChunkedTtsPlayer();

