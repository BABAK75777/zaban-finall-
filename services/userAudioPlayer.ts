/**
 * User Audio Player - Isolated player for user-recorded audio
 * Completely separate from AI audio playback
 * 
 * Phase 3: User audio playback rate is ALWAYS 1.0 and never changes
 */

let userAudioInstance: HTMLAudioElement | null = null;
let userAudioUrl: string | null = null;

const isDev = (import.meta as any)?.env?.DEV;
const FIXED_PLAYBACK_RATE = 1.0;

function logDev(...args: unknown[]): void {
  if (isDev) {
    console.log('[UserAudioPlayer]', ...args);
  }
}

/**
 * Phase 3: Enforce fixed playback rate for user audio (always 1.0)
 */
function enforcePlaybackRate(audio: HTMLAudioElement): void {
  if (audio.playbackRate !== FIXED_PLAYBACK_RATE) {
    audio.playbackRate = FIXED_PLAYBACK_RATE;
    if ('preservesPitch' in audio) {
      (audio as any).preservesPitch = true;
    }
    if (isDev) {
      logDev('User audio playback rate enforced to 1.0');
    }
  }
}

export const userAudioPlayer = {
  /**
   * Load and play user audio from blob
   */
  async play(blob: Blob): Promise<void> {
    // Stop any existing playback
    this.stop();

    return new Promise((resolve, reject) => {
      try {
        userAudioUrl = URL.createObjectURL(blob);
        userAudioInstance = new Audio(userAudioUrl);

        // Phase 3: Enforce fixed playback rate (always 1.0)
        enforcePlaybackRate(userAudioInstance);

        logDev('Loading user audio, blob size:', blob.size);

        let rateCheckInterval: ReturnType<typeof setInterval> | null = null;

        const cleanup = () => {
          if (rateCheckInterval) {
            clearInterval(rateCheckInterval);
            rateCheckInterval = null;
          }
          if (userAudioUrl) {
            URL.revokeObjectURL(userAudioUrl);
            userAudioUrl = null;
          }
          if (userAudioInstance) {
            userAudioInstance.onended = null;
            userAudioInstance.onerror = null;
            userAudioInstance.oncanplay = null;
            userAudioInstance = null;
          }
        };

        // Set up canplay event to apply rate before play
        userAudioInstance.oncanplay = () => {
          enforcePlaybackRate(userAudioInstance!);
        };

        userAudioInstance.onended = () => {
          logDev('User audio playback ended');
          cleanup();
          resolve();
        };

        userAudioInstance.onerror = (e) => {
          logDev('User audio playback error:', e);
          cleanup();
          reject(new Error('User audio playback failed'));
        };

        userAudioInstance
          .play()
          .then(() => {
            // Phase 3: Re-apply rate after play starts (browsers may reset it)
            enforcePlaybackRate(userAudioInstance!);
            logDev('User audio playing, duration:', userAudioInstance?.duration, 'rate:', userAudioInstance?.playbackRate);

            // Phase 3: Periodic check to ensure rate stays at 1.0 (defensive)
            rateCheckInterval = setInterval(() => {
              if (userAudioInstance) {
                enforcePlaybackRate(userAudioInstance);
              } else {
                if (rateCheckInterval) {
                  clearInterval(rateCheckInterval);
                  rateCheckInterval = null;
                }
              }
            }, 100);
          })
          .catch((err) => {
            logDev('User audio play() failed:', err);
            cleanup();
            reject(err);
          });
      } catch (err) {
        logDev('User audio setup failed:', err);
        reject(err);
      }
    });
  },

  /**
   * Stop current user audio playback
   */
  stop(): void {
    if (userAudioInstance) {
      logDev('Stopping user audio');
      userAudioInstance.pause();
      userAudioInstance.currentTime = 0;
    }
    if (userAudioUrl) {
      URL.revokeObjectURL(userAudioUrl);
      userAudioUrl = null;
    }
    if (userAudioInstance) {
      userAudioInstance.onended = null;
      userAudioInstance.onerror = null;
      userAudioInstance = null;
    }
  },

  /**
   * Check if user audio is currently playing
   */
  isPlaying(): boolean {
    return userAudioInstance !== null && !userAudioInstance.paused && !userAudioInstance.ended;
  },
};

