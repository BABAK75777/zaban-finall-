/**
 * Screen keep-awake tied to active audio playback / recording.
 * Uses expo-keep-awake tags so playback and recording cannot release each other.
 * Generations prevent a stale stop/finish from releasing a newer operation.
 */

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export const AUDIO_KEEP_AWAKE_TAG_PLAYBACK = 'mamlio-audio-playback';
export const AUDIO_KEEP_AWAKE_TAG_RECORDING = 'mamlio-audio-recording';

const generationByTag = new Map<string, number>();

/** Activate keep-awake for `tag`. Returns a generation token for a matching release. */
export function acquireAudioKeepAwake(tag: string): number {
  const next = (generationByTag.get(tag) ?? 0) + 1;
  generationByTag.set(tag, next);
  void activateKeepAwakeAsync(tag).catch(() => {
    /* Keep-awake must never break audio flows. */
  });
  return next;
}

/**
 * Deactivate keep-awake for `tag` only if `generation` is still the active owner.
 * Stale callers (replaced play/record) are ignored.
 */
export function releaseAudioKeepAwake(tag: string, generation: number): void {
  if (generationByTag.get(tag) !== generation) {
    return;
  }
  generationByTag.delete(tag);
  void deactivateKeepAwake(tag).catch(() => {
    /* ignore */
  });
}

/** Test-only: clear ownership map between tests. */
export function __resetAudioKeepAwakeForTests(): void {
  generationByTag.clear();
}
