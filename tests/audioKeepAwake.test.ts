/**
 * Keep-awake ownership for active audio playback / recording (unit tests).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  AUDIO_KEEP_AWAKE_TAG_PLAYBACK,
  AUDIO_KEEP_AWAKE_TAG_RECORDING,
  __resetAudioKeepAwakeForTests,
  acquireAudioKeepAwake,
  releaseAudioKeepAwake,
} from '../packages/tts-mobile/src/audioKeepAwake';

describe('audioKeepAwake', () => {
  beforeEach(() => {
    activateKeepAwakeAsync.mockClear();
    deactivateKeepAwake.mockClear();
    __resetAudioKeepAwakeForTests();
  });

  it('activates on acquire and deactivates on matching release', () => {
    const gen = acquireAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);

    releaseAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_PLAYBACK, gen);
    expect(deactivateKeepAwake).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);
  });

  it('ignores stale release after a newer acquire on the same tag', () => {
    const stale = acquireAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);
    const current = acquireAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);
    expect(current).not.toBe(stale);

    releaseAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_PLAYBACK, stale);
    expect(deactivateKeepAwake).not.toHaveBeenCalled();

    releaseAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_PLAYBACK, current);
    expect(deactivateKeepAwake).toHaveBeenCalledTimes(1);
  });

  it('keeps independent tags from releasing each other', () => {
    const playGen = acquireAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);
    const recGen = acquireAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_RECORDING);

    releaseAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_PLAYBACK, playGen);
    expect(deactivateKeepAwake).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);
    expect(deactivateKeepAwake).not.toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_RECORDING);

    releaseAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_RECORDING, recGen);
    expect(deactivateKeepAwake).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_RECORDING);
  });
});
