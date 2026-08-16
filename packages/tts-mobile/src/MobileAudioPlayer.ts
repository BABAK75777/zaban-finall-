/**
 * Mobile Audio Player - expo-audio imperative player with background playback
 */

import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer as ExpoAudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import type { AudioPlayer } from '@zaban/tts-core';
import {
  clampRuntimePlaybackRate,
  formatRuntimeRate,
  logRuntimeRateAppliedAfterLoad,
} from './aiPlaybackSpeed';
import {
  AUDIO_KEEP_AWAKE_TAG_PLAYBACK,
  acquireAudioKeepAwake,
  releaseAudioKeepAwake,
} from './audioKeepAwake';

let player: ExpoAudioPlayer | null = null;
let statusSubscription: { remove: () => void } | null = null;
let currentRequestId: number = 0;
let isPaused: boolean = false;
let currentUri: string | null = null;
/** Generation token for playback keep-awake; null when not holding the screen awake. */
let playbackKeepAwakeGeneration: number | null = null;

function holdPlaybackKeepAwake(): void {
  playbackKeepAwakeGeneration = acquireAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);
}

function releasePlaybackKeepAwake(): void {
  if (playbackKeepAwakeGeneration == null) {
    return;
  }
  const generation = playbackKeepAwakeGeneration;
  playbackKeepAwakeGeneration = null;
  releaseAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_PLAYBACK, generation);
}

type PendingPlay = {
  resolve: () => void;
  reject: (err: Error) => void;
  requestId: number;
};

let pendingPlay: PendingPlay | null = null;

function settlePendingPlay(mode: 'resolve' | 'reject', err?: Error): void {
  const pending = pendingPlay;
  pendingPlay = null;
  if (!pending) {
    return;
  }
  if (mode === 'resolve') {
    pending.resolve();
    return;
  }
  pending.reject(err ?? new Error('Audio playback interrupted'));
}

const tempPlaybackUris = new Set<string>();
const MAX_TEMP_FILES = 8;

/** Configure playback-oriented audio session (silent mode + background). */
async function configureAudioMode() {
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    });
  } catch (error) {
    console.error('[MobileAudioPlayer] Failed to configure audio mode:', error);
  }
}

let audioModeConfigured = false;

function releasePlayer(): void {
  if (statusSubscription) {
    statusSubscription.remove();
    statusSubscription = null;
  }
  if (player) {
    try {
      player.pause();
    } catch {
      /* ignore */
    }
    try {
      player.remove();
    } catch {
      /* ignore */
    }
    player = null;
  }
}

export interface MobilePlayOptions {
  /** Per-play rate override (e.g. shadow recording at 1.0). Does not change stored AI speed. */
  playbackRate?: number;
}

export class MobileAudioPlayer implements AudioPlayer {
  private playbackRate = 1.0;

  constructor() {
    if (!audioModeConfigured) {
      configureAudioMode();
      audioModeConfigured = true;
    }
  }

  setPlaybackRate(rate: number): void {
    const clamped = clampRuntimePlaybackRate(rate);
    const prev = this.playbackRate;
    this.playbackRate = clamped;
    const playing = player != null;
    if (playing && player != null) {
      try {
        player.shouldCorrectPitch = true;
        player.setPlaybackRate(clamped, 'high');
      } catch (err) {
        console.warn('[MobileAudioPlayer] setPlaybackRate failed:', err);
        if (__DEV__) {
          console.log(
            `[AI_SPEED] setPlaybackRate runtimeRate=${formatRuntimeRate(clamped)} reason=setRateAsync_failed_during_playback`
          );
        }
      }
    }
    // High-frequency during speed-slider drag — keep out of production JS.
    if (__DEV__) {
      console.log(`[AI_SPEED] setPlaybackRate runtimeRate=${formatRuntimeRate(clamped)}`);
      console.log(`[PlaybackRate] applied rate=${clamped}`);
      console.log(
        `[MobileAudioPlayer] setPlaybackRate ${prev} → ${clamped}${playing ? ' (active)' : ''}`
      );
    }
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  async play(
    audioData: Blob | Uint8Array | string,
    requestId: number,
    options?: MobilePlayOptions
  ): Promise<void> {
    // Check if this request is still current
    if (requestId !== currentRequestId) {
      return Promise.resolve();
    }

    this.stop();

    return new Promise(async (resolve, reject) => {
      pendingPlay = { resolve, reject, requestId };
      try {
        let uri: string;

        if (typeof audioData === 'string') {
          // Assume it's a URI
          uri = audioData;
        } else {
          // Convert blob/uint8array to file
          const base64 = await this.toBase64(audioData);
          const filename = `tts_${Date.now()}_${requestId}.mp3`;
          uri = `${FileSystem.documentDirectory}${filename}`;

          await FileSystem.writeAsStringAsync(uri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          tempPlaybackUris.add(uri);
          while (tempPlaybackUris.size > MAX_TEMP_FILES) {
            const oldest = tempPlaybackUris.values().next().value;
            if (!oldest || oldest === uri) break;
            tempPlaybackUris.delete(oldest);
            await FileSystem.deleteAsync(oldest, { idempotent: true }).catch(() => {});
          }
        }

        currentUri = uri;
        console.log(
          `[MobileAudioPlayer] play path=${uri} requestId=${requestId} tempFiles=${tempPlaybackUris.size}`
        );

        const playRate = clampRuntimePlaybackRate(
          options?.playbackRate ?? this.playbackRate
        );
        logRuntimeRateAppliedAfterLoad(playRate);

        await configureAudioMode();

        const newPlayer = createAudioPlayer(
          { uri },
          {
            updateInterval: 200,
            keepAudioSessionActive: true,
          }
        );
        player = newPlayer;
        isPaused = false;

        newPlayer.loop = false;
        newPlayer.volume = 1.0;
        newPlayer.shouldCorrectPitch = true;
        newPlayer.setPlaybackRate(playRate, 'high');

        statusSubscription = newPlayer.addListener(
          'playbackStatusUpdate',
          (status: AudioStatus) => {
            if (!status.isLoaded) {
              return;
            }

            // Ignore events from a replaced/cancelled play (stale listener).
            if (requestId !== currentRequestId) {
              return;
            }

            // Handle playback finished
            if (status.didJustFinish) {
              this.cleanup();
              if (pendingPlay?.requestId === requestId) {
                settlePendingPlay('resolve');
              }
              return;
            }

            // Phone call / audio-focus loss often stops playback without didJustFinish.
            // expo-audio reports currentTime in seconds (expo-av used positionMillis).
            if (
              !status.playing &&
              !status.didJustFinish &&
              status.currentTime > 0 &&
              pendingPlay?.requestId === requestId
            ) {
              console.log('[AUDIO_INTERRUPT] stopping playback');
              this.cleanup();
              settlePendingPlay('resolve');
            }
          }
        );

        // Ensure replay starts at 0 if a previous finish left the same source at EOF.
        await newPlayer.seekTo(0);
        newPlayer.play();
        holdPlaybackKeepAwake();
      } catch (err) {
        this.cleanup();
        if (requestId === currentRequestId && pendingPlay?.requestId === requestId) {
          settlePendingPlay(
            'reject',
            err instanceof Error ? err : new Error('Failed to play audio')
          );
        }
      }
    });
  }

  private async toBase64(data: Blob | Uint8Array): Promise<string> {
    if (data instanceof Uint8Array) {
      // Convert Uint8Array to base64 using Blob approach (handles large arrays)
      const blob = new Blob([data as BlobPart], { type: 'application/octet-stream' });
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

  stop(): void {
    if (pendingPlay) {
      settlePendingPlay('resolve');
    }
    releasePlaybackKeepAwake();
    releasePlayer();

    if (currentUri && tempPlaybackUris.has(currentUri)) {
      tempPlaybackUris.delete(currentUri);
      FileSystem.deleteAsync(currentUri, { idempotent: true }).catch(() => {});
    }

    currentUri = null;
    isPaused = false;
  }

  pause(): void {
    if (player && !isPaused) {
      try {
        player.pause();
      } catch {
        /* ignore */
      }
      isPaused = true;
      releasePlaybackKeepAwake();
    }
  }

  resume(): void {
    if (player && isPaused) {
      try {
        // If previously finished at EOF, expo-audio stays at end until seekTo(0).
        if (player.currentTime > 0 && player.duration > 0 && player.currentTime >= player.duration - 0.05) {
          void player.seekTo(0).then(() => {
            player?.play();
            isPaused = false;
            holdPlaybackKeepAwake();
          });
          return;
        }
        player.play();
      } catch {
        /* ignore */
      }
      isPaused = false;
      holdPlaybackKeepAwake();
    }
  }

  isPlaying(): boolean {
    return player !== null && !isPaused;
  }

  getNextRequestId(): number {
    currentRequestId += 1;
    return currentRequestId;
  }

  cancel(): void {
    currentRequestId += 1;
    console.log(`[MobileAudioPlayer] cancel requestId=${currentRequestId}`);
    if (pendingPlay) {
      console.log('[AUDIO_INTERRUPT] stopping playback');
      settlePendingPlay('resolve');
    }
    this.stop();
  }

  getActivePlaybackPath(): string | null {
    return currentUri;
  }

  getTempFileCount(): number {
    return tempPlaybackUris.size;
  }

  private cleanup(): void {
    this.stop();
  }
}
