/**
 * Web Audio Player - HTMLAudioElement-based player for web
 */

import type { AudioPlayer } from '@zaban/tts-core';

let audioInstance: HTMLAudioElement | null = null;
let audioUrl: string | null = null;
let currentRequestId: number = 0;
let isPaused: boolean = false;

const FIXED_PLAYBACK_RATE = 1.0;

function enforcePlaybackRate(audio: HTMLAudioElement): void {
  if (audio.playbackRate !== FIXED_PLAYBACK_RATE) {
    audio.playbackRate = FIXED_PLAYBACK_RATE;
  }
  if ('preservesPitch' in audio) {
    (audio as any).preservesPitch = true;
  }
}

export class WebAudioPlayer implements AudioPlayer {
  async play(audioData: Blob | Uint8Array | string, requestId: number): Promise<void> {
    // Check if this request is still current
    if (requestId !== currentRequestId) {
      return Promise.resolve();
    }

    this.stop();

    return new Promise((resolve, reject) => {
      try {
        let blob: Blob;
        
        if (audioData instanceof Blob) {
          blob = audioData;
        } else if (audioData instanceof Uint8Array) {
          blob = new Blob([audioData], { type: 'audio/mpeg' });
        } else if (typeof audioData === 'string') {
          // Assume it's a URL
          audioUrl = audioData;
          audioInstance = new Audio(audioData);
          this.setupAudioHandlers(audioInstance, requestId, resolve, reject);
          return;
        } else {
          reject(new Error('Invalid audio data type'));
          return;
        }

        audioUrl = URL.createObjectURL(blob);
        audioInstance = new Audio(audioUrl);

        enforcePlaybackRate(audioInstance);
        this.setupAudioHandlers(audioInstance, requestId, resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  private setupAudioHandlers(
    audio: HTMLAudioElement,
    requestId: number,
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    let rateCheckInterval: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (rateCheckInterval) {
        clearInterval(rateCheckInterval);
        rateCheckInterval = null;
      }
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
      audioUrl = null;
      audioInstance = null;
      isPaused = false;
    };

    audio.oncanplay = () => {
      enforcePlaybackRate(audio);
    };

    audio.onended = () => {
      cleanup();
      if (requestId === currentRequestId) {
        resolve();
      }
    };

    audio.onerror = () => {
      cleanup();
      if (requestId === currentRequestId) {
        reject(new Error('Audio playback failed'));
      }
    };

    audio
      .play()
      .then(() => {
        enforcePlaybackRate(audio);
        isPaused = false;

        // Periodic check to ensure rate stays at 1.0
        rateCheckInterval = setInterval(() => {
          if (audioInstance && requestId === currentRequestId) {
            enforcePlaybackRate(audioInstance);
          } else {
            if (rateCheckInterval) {
              clearInterval(rateCheckInterval);
              rateCheckInterval = null;
            }
          }
        }, 100);
      })
      .catch((err) => {
        cleanup();
        if (requestId === currentRequestId) {
          reject(err);
        }
      });
  }

  stop(): void {
    if (audioInstance) {
      try {
        audioInstance.pause();
        audioInstance.currentTime = 0;
      } catch (err) {
        // Ignore
      }
    }
    
    if (audioUrl && audioUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch (err) {
        // Ignore
      }
    }
    
    if (audioInstance) {
      audioInstance.onended = null;
      audioInstance.onerror = null;
      audioInstance.oncanplay = null;
      audioInstance = null;
    }
    
    audioUrl = null;
    isPaused = false;
  }

  pause(): void {
    if (audioInstance && !audioInstance.paused) {
      audioInstance.pause();
      isPaused = true;
    }
  }

  resume(): void {
    if (audioInstance && audioInstance.paused) {
      audioInstance.play().catch(() => {
        // Ignore
      });
      isPaused = false;
    }
  }

  isPlaying(): boolean {
    return audioInstance !== null && !audioInstance.paused && !audioInstance.ended;
  }

  getNextRequestId(): number {
    currentRequestId += 1;
    return currentRequestId;
  }

  cancel(): void {
    currentRequestId += 1;
    this.stop();
  }
}

