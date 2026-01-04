/**
 * Mobile Audio Player - Expo AV-based player with background playback
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import type { AudioPlayer } from '@zaban/tts-core';

let sound: Audio.Sound | null = null;
let currentRequestId: number = 0;
let isPaused: boolean = false;
let currentUri: string | null = null;

// Configure audio mode for background playback
async function configureAudioMode() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.error('[MobileAudioPlayer] Failed to configure audio mode:', error);
  }
}

// Initialize audio mode on first use
let audioModeConfigured = false;

export class MobileAudioPlayer implements AudioPlayer {
  constructor() {
    if (!audioModeConfigured) {
      configureAudioMode();
      audioModeConfigured = true;
    }
  }

  async play(audioData: Blob | Uint8Array | string, requestId: number): Promise<void> {
    // Check if this request is still current
    if (requestId !== currentRequestId) {
      return Promise.resolve();
    }

    this.stop();

    return new Promise(async (resolve, reject) => {
      try {
        let uri: string;

        if (typeof audioData === 'string') {
          // Assume it's a URI
          uri = audioData;
        } else {
          // Convert blob/uint8array to file
          const base64 = await this.toBase64(audioData);
          const filename = `tts_${Date.now()}.mp3`;
          uri = `${FileSystem.documentDirectory}${filename}`;
          
          await FileSystem.writeAsStringAsync(uri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        currentUri = uri;

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          {
            shouldPlay: true,
            isLooping: false,
            volume: 1.0,
            rate: 1.0, // Fixed playback rate
          },
          (status) => {
            if (!status.isLoaded) {
              return;
            }

            // Handle playback finished
            if (status.didJustFinish) {
              this.cleanup();
              if (requestId === currentRequestId) {
                resolve();
              }
            }

            // Handle errors
            if (status.error) {
              this.cleanup();
              if (requestId === currentRequestId) {
                reject(new Error(`Audio playback error: ${status.error}`));
              }
            }
          }
        );

        sound = newSound;
        isPaused = false;

        // Set up interruption handlers
        this.setupInterruptionHandlers(sound, requestId, resolve, reject);
      } catch (err) {
        this.cleanup();
        if (requestId === currentRequestId) {
          reject(err instanceof Error ? err : new Error('Failed to play audio'));
        }
      }
    });
  }

  private async toBase64(data: Blob | Uint8Array): Promise<string> {
    if (data instanceof Uint8Array) {
      // Convert Uint8Array to base64 using Blob approach (handles large arrays)
      const blob = new Blob([data], { type: 'application/octet-stream' });
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Convert Blob to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(data);
      });
    }
  }

  private setupInterruptionHandlers(
    soundInstance: Audio.Sound,
    requestId: number,
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    // Handle audio interruption (phone calls, etc.)
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
    }).catch(() => {
      // Ignore errors
    });
  }

  stop(): void {
    if (sound) {
      sound.unloadAsync().catch(() => {
        // Ignore errors
      });
      sound = null;
    }
    
    if (currentUri && currentUri.startsWith(FileSystem.documentDirectory || '')) {
      FileSystem.deleteAsync(currentUri, { idempotent: true }).catch(() => {
        // Ignore errors
      });
    }
    
    currentUri = null;
    isPaused = false;
  }

  pause(): void {
    if (sound && !isPaused) {
      sound.pauseAsync().catch(() => {
        // Ignore errors
      });
      isPaused = true;
    }
  }

  resume(): void {
    if (sound && isPaused) {
      sound.playAsync().catch(() => {
        // Ignore errors
      });
      isPaused = false;
    }
  }

  isPlaying(): boolean {
    return sound !== null && !isPaused;
  }

  getNextRequestId(): number {
    currentRequestId += 1;
    return currentRequestId;
  }

  cancel(): void {
    currentRequestId += 1;
    this.stop();
  }

  private cleanup(): void {
    this.stop();
  }
}

