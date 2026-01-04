/**
 * AI Audio Player - Isolated player for AI-generated audio
 * 
 * CRITICAL: AI audio playback rate is ALWAYS 1.0 and never changes
 * This player is completely isolated from user audio playback
 */

import { audioBalancer } from './audioBalancer';

let aiAudioInstance: HTMLAudioElement | null = null;
let aiAudioUrl: string | null = null;
let currentRequestId: number = 0;

const isDev = (import.meta as any)?.env?.DEV;
// Phase 3: Dynamic playback rate (can be changed via setPlaybackRate)
let currentPlaybackRate: number = 1.0;

function logDev(...args: unknown[]): void {
  if (isDev) {
    console.log('[AiAudioPlayer]', ...args);
  }
}

/**
 * Phase 3: Apply current playback rate to audio element
 * Supports dynamic speed changes without re-fetching audio
 */
function applyPlaybackRate(audio: HTMLAudioElement): void {
  const targetRate = currentPlaybackRate;
  
  if (audio.playbackRate !== targetRate) {
    const oldRate = audio.playbackRate;
    audio.playbackRate = targetRate;
    
    // Set preservePitch if available (prevents chipmunk effect)
    if ('preservesPitch' in audio) {
      (audio as any).preservesPitch = true;
    }
    
    if (isDev) {
      logDev(`Playback rate changed: ${oldRate} → ${targetRate}`);
    }
  } else {
    // Ensure preservePitch is set even if rate is correct
    if ('preservesPitch' in audio) {
      (audio as any).preservesPitch = true;
    }
  }
  
  logDev('Playback rate set to:', audio.playbackRate);
}

export const aiAudioPlayer = {
  /**
   * Get next request ID (monotonically increasing)
   */
  getNextRequestId(): number {
    currentRequestId += 1;
    return currentRequestId;
  },

  /**
   * Get current request ID
   */
  getCurrentRequestId(): number {
    return currentRequestId;
  },

  /**
   * Load and play AI audio from blob
   * @param blob - Audio blob to play
   * @param requestId - Request ID to prevent stale responses
   * @returns Promise that resolves when playback completes
   */
  async play(blob: Blob, requestId: number): Promise<void> {
    // Check if this request is still current
    if (requestId !== currentRequestId) {
      logDev('Ignoring stale request:', requestId, 'current:', currentRequestId);
      return Promise.resolve();
    }

    // Stop any existing playback
    this.stop();

    return new Promise((resolve, reject) => {
      try {
        aiAudioUrl = URL.createObjectURL(blob);
        aiAudioInstance = new Audio(aiAudioUrl);

        // Register with audio balancer for volume control
        audioBalancer.registerAiAudioInstance(aiAudioInstance);

        // Phase 3: Apply current playback rate (supports dynamic speed changes)
        applyPlaybackRate(aiAudioInstance);

        logDev('Loading AI audio, requestId:', requestId, 'blob size:', blob.size);

        let rateCheckInterval: ReturnType<typeof setInterval> | null = null;

        const cleanup = () => {
          if (rateCheckInterval) {
            clearInterval(rateCheckInterval);
            rateCheckInterval = null;
          }
          if (aiAudioUrl) {
            URL.revokeObjectURL(aiAudioUrl);
            aiAudioUrl = null;
          }
          if (aiAudioInstance) {
            aiAudioInstance.onended = null;
            aiAudioInstance.onerror = null;
            aiAudioInstance.oncanplay = null;
            aiAudioInstance = null;
          }
        };

        // Set up canplay event to apply rate before play
        aiAudioInstance.oncanplay = () => {
          applyPlaybackRate(aiAudioInstance!);
        };

        aiAudioInstance.onended = () => {
          logDev('AI audio playback ended, requestId:', requestId);
          cleanup();
          // Only resolve if this is still the current request
          if (requestId === currentRequestId) {
            resolve();
          }
        };

        aiAudioInstance.onerror = (e) => {
          logDev('AI audio playback error, requestId:', requestId, e);
          cleanup();
          // Only reject if this is still the current request
          if (requestId === currentRequestId) {
            reject(new Error('AI audio playback failed'));
          }
        };

        aiAudioInstance
          .play()
          .then(() => {
            // Phase 3: Re-apply rate after play starts (browsers may reset it)
            applyPlaybackRate(aiAudioInstance!);
            logDev(
              'AI audio playing, requestId:',
              requestId,
              'duration:',
              aiAudioInstance?.duration,
              'rate:',
              aiAudioInstance?.playbackRate
            );

            // Phase 3: Periodic check to ensure rate matches currentPlaybackRate (defensive)
            rateCheckInterval = setInterval(() => {
              if (aiAudioInstance && requestId === currentRequestId) {
                applyPlaybackRate(aiAudioInstance);
              } else {
                if (rateCheckInterval) {
                  clearInterval(rateCheckInterval);
                  rateCheckInterval = null;
                }
              }
            }, 100);
          })
          .catch((err) => {
            logDev('AI audio play() failed, requestId:', requestId, err);
            cleanup();
            if (requestId === currentRequestId) {
              // Handle NotAllowedError gracefully (user interaction required)
              if (err instanceof DOMException && err.name === 'NotAllowedError') {
                logDev('⚠️  Audio play() NotAllowedError - user interaction required');
                reject(new Error('Audio playback requires user interaction. Please click the play button.'));
              } else {
                reject(err);
              }
            }
          });
      } catch (err) {
        logDev('AI audio setup failed, requestId:', requestId, err);
        if (requestId === currentRequestId) {
          reject(err);
        }
      }
    });
  },

  /**
   * Phase 3: Set playback rate dynamically (without re-fetching audio)
   * @param rate - Playback rate (0.5 to 2.0, typically 0.5 to 1.5)
   */
  setPlaybackRate(rate: number): void {
    // Clamp rate to valid range
    const clampedRate = Math.max(0.5, Math.min(2.0, rate));
    const oldRate = currentPlaybackRate;
    currentPlaybackRate = clampedRate;
    
    // Phase 3: Apply to currently playing audio if it exists
    if (aiAudioInstance) {
      applyPlaybackRate(aiAudioInstance);
      logDev(`Playback rate updated: ${oldRate} → ${clampedRate} (applied to active audio)`);
    } else {
      logDev(`Playback rate updated: ${oldRate} → ${clampedRate} (will apply when audio starts)`);
    }
  },

  /**
   * Get current playback rate
   */
  getPlaybackRate(): number {
    return currentPlaybackRate;
  },

  /**
   * Stop current AI audio playback immediately
   * 
   * Performs complete cleanup:
   * - Pauses and resets audio
   * - Revokes blob URL
   * - Removes all event handlers
   * - Clears references
   */
  stop(): void {
    if (!aiAudioInstance && !aiAudioUrl) {
      return; // Already stopped
    }

    logDev('⏹️  Stopping AI audio, current requestId:', currentRequestId);
    
    // Stop playback
    if (aiAudioInstance) {
      try {
        aiAudioInstance.pause();
        aiAudioInstance.currentTime = 0;
      } catch (err) {
        logDev('Error pausing audio:', err);
      }
    }
    
    // Cleanup resources
    const url = aiAudioUrl;
    if (url) {
      try {
        URL.revokeObjectURL(url);
        logDev('Blob URL revoked');
      } catch (err) {
        logDev('Error revoking blob URL:', err);
      }
    }
    
    // Remove event handlers and clear reference
    if (aiAudioInstance) {
      try {
        aiAudioInstance.onended = null;
        aiAudioInstance.onerror = null;
        aiAudioInstance.oncanplay = null;
        // Remove from DOM if it was added (shouldn't be, but defensive)
        if (aiAudioInstance.parentNode) {
          aiAudioInstance.parentNode.removeChild(aiAudioInstance);
        }
      } catch (err) {
        logDev('Error cleaning up audio instance:', err);
      }
      aiAudioInstance = null;
    }
    
    aiAudioUrl = null;
    
    // Unregister from audio balancer
    audioBalancer.registerAiAudioInstance(null);
    
    logDev('✅ Stop complete');
  },

  /**
   * Check if AI audio is currently playing
   */
  isPlaying(): boolean {
    return aiAudioInstance !== null && !aiAudioInstance.paused && !aiAudioInstance.ended;
  },

  /**
   * Cancel current request (increment request ID to invalidate in-flight requests)
   */
  cancel(): void {
    logDev('Cancelling AI audio, old requestId:', currentRequestId);
    currentRequestId += 1;
    this.stop();
  },
};

