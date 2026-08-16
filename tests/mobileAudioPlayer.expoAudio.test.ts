import { beforeEach, describe, expect, it, vi } from 'vitest';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  AUDIO_KEEP_AWAKE_TAG_PLAYBACK,
  __resetAudioKeepAwakeForTests,
} from '../packages/tts-mobile/src/audioKeepAwake';

const seekTo = vi.fn(async () => undefined);
const play = vi.fn();
const pause = vi.fn();
const remove = vi.fn();
const setPlaybackRate = vi.fn();
let statusListener: ((status: Record<string, unknown>) => void) | null = null;

const mockPlayer = {
  loop: false,
  volume: 1,
  shouldCorrectPitch: true,
  currentTime: 0,
  duration: 3,
  playing: false,
  setPlaybackRate,
  play,
  pause,
  seekTo,
  remove,
  addListener: vi.fn((_event: string, listener: (status: Record<string, unknown>) => void) => {
    statusListener = listener;
    return {
      remove: vi.fn(() => {
        statusListener = null;
      }),
    };
  }),
};

vi.mock('expo-audio', () => ({
  createAudioPlayer: vi.fn(() => mockPlayer),
  setAudioModeAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock-docs/',
  EncodingType: { Base64: 'base64' },
  writeAsStringAsync: vi.fn().mockResolvedValue(undefined),
  deleteAsync: vi.fn().mockResolvedValue(undefined),
}));

describe('MobileAudioPlayer expo-audio adapter', () => {
  beforeEach(() => {
    statusListener = null;
    mockPlayer.currentTime = 0;
    mockPlayer.duration = 3;
    mockPlayer.playing = false;
    seekTo.mockClear();
    play.mockClear();
    pause.mockClear();
    remove.mockClear();
    setPlaybackRate.mockClear();
    mockPlayer.addListener.mockClear();
    activateKeepAwakeAsync.mockClear();
    deactivateKeepAwake.mockClear();
    __resetAudioKeepAwakeForTests();
  });

  it('plays URI with rate+pitch correction, seekTo(0), and completes on didJustFinish', async () => {
    const { MobileAudioPlayer } = await import('../packages/tts-mobile/src/MobileAudioPlayer');
    const { createAudioPlayer } = await import('expo-audio');
    const adapter = new MobileAudioPlayer();
    adapter.setPlaybackRate(1.08);
    const requestId = adapter.getNextRequestId();
    const done = adapter.play('file:///cache/sentence.mp3', requestId);

    await vi.waitFor(() => expect(statusListener).not.toBeNull());

    expect(createAudioPlayer).toHaveBeenCalled();
    expect(seekTo).toHaveBeenCalledWith(0);
    expect(play).toHaveBeenCalled();
    expect(setPlaybackRate).toHaveBeenCalledWith(1.08, 'high');
    expect(mockPlayer.shouldCorrectPitch).toBe(true);
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);

    statusListener?.({
      isLoaded: true,
      didJustFinish: true,
      playing: false,
      currentTime: 3,
    });

    await expect(done).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalled();
    expect(deactivateKeepAwake).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);
  });

  it('setPlaybackRate on active player does not call createAudioPlayer again', async () => {
    const { MobileAudioPlayer } = await import('../packages/tts-mobile/src/MobileAudioPlayer');
    const { createAudioPlayer } = await import('expo-audio');
    const adapter = new MobileAudioPlayer();
    const requestId = adapter.getNextRequestId();
    const done = adapter.play('file:///a.mp3', requestId);
    await vi.waitFor(() => expect(statusListener).not.toBeNull());
    const calls = vi.mocked(createAudioPlayer).mock.calls.length;
    adapter.setPlaybackRate(0.75);
    expect(vi.mocked(createAudioPlayer).mock.calls.length).toBe(calls);
    expect(setPlaybackRate).toHaveBeenCalledWith(0.75, 'high');
    statusListener?.({ isLoaded: true, didJustFinish: true, playing: false, currentTime: 1 });
    await done;
  });

  it('cancel releases player resources', async () => {
    const { MobileAudioPlayer } = await import('../packages/tts-mobile/src/MobileAudioPlayer');
    const adapter = new MobileAudioPlayer();
    const requestId = adapter.getNextRequestId();
    const done = adapter.play('file:///a.mp3', requestId);
    await vi.waitFor(() => expect(statusListener).not.toBeNull());
    adapter.cancel();
    await expect(done).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalled();
    expect(deactivateKeepAwake).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);
  });

  it('pause releases keep-awake and resume re-acquires it', async () => {
    const { MobileAudioPlayer } = await import('../packages/tts-mobile/src/MobileAudioPlayer');
    const adapter = new MobileAudioPlayer();
    const requestId = adapter.getNextRequestId();
    const done = adapter.play('file:///a.mp3', requestId);
    await vi.waitFor(() => expect(statusListener).not.toBeNull());
    expect(activateKeepAwakeAsync).toHaveBeenCalledTimes(1);

    adapter.pause();
    expect(deactivateKeepAwake).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);

    adapter.resume();
    expect(activateKeepAwakeAsync).toHaveBeenCalledTimes(2);

    adapter.cancel();
    await done;
  });

  it('stale finish does not release keep-awake of a newer play', async () => {
    const { MobileAudioPlayer } = await import('../packages/tts-mobile/src/MobileAudioPlayer');
    const adapter = new MobileAudioPlayer();
    const firstId = adapter.getNextRequestId();
    const firstDone = adapter.play('file:///first.mp3', firstId);
    await vi.waitFor(() => expect(statusListener).not.toBeNull());
    const firstListener = statusListener;

    const secondId = adapter.getNextRequestId();
    const secondDone = adapter.play('file:///second.mp3', secondId);
    await vi.waitFor(() => expect(statusListener).not.toBeNull());
    expect(statusListener).not.toBe(firstListener);
    expect(activateKeepAwakeAsync.mock.calls.length).toBeGreaterThanOrEqual(2);

    firstListener?.({
      isLoaded: true,
      didJustFinish: true,
      playing: false,
      currentTime: 3,
    });
    // First play was already settled by stop() when the second play started.
    await expect(firstDone).resolves.toBeUndefined();

    // Stale finish must not release the active second play's keep-awake.
    const deactivateAfterStale = deactivateKeepAwake.mock.calls.length;
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);

    adapter.cancel();
    await expect(secondDone).resolves.toBeUndefined();
    expect(deactivateKeepAwake.mock.calls.length).toBeGreaterThan(deactivateAfterStale);
    expect(deactivateKeepAwake).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_PLAYBACK);
  });
});
