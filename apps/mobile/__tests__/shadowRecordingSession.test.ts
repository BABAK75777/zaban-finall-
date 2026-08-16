import {
  RECORDING_START_SETTLE_MS,
  RECORDING_STOP_TAIL_MS,
  __resetShadowRecordingSessionForTests,
  __setShadowRecordingDelayForTests,
  disposeShadowRecording,
  getActiveShadowRecording,
  startShadowRecording,
  stopShadowRecording,
} from '../src/audio/shadowRecordingSession';
import {
  AUDIO_KEEP_AWAKE_TAG_RECORDING,
  __resetAudioKeepAwakeForTests,
} from '../../../packages/tts-mobile/src/audioKeepAwake';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const mockRecording = {
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  record: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn(),
  getAvailableInputs: jest.fn().mockReturnValue([]),
  setInput: jest.fn(),
  uri: 'file:///shadow.m4a' as string | null,
};

jest.mock('expo-audio', () => ({
  AudioModule: {
    AudioRecorder: jest.fn().mockImplementation(() => mockRecording),
  },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('shadowRecordingSession timing', () => {
  const delays: number[] = [];

  beforeEach(() => {
    delays.length = 0;
    __resetShadowRecordingSessionForTests();
    __resetAudioKeepAwakeForTests();
    __setShadowRecordingDelayForTests(async (ms) => {
      delays.push(ms);
    });
    mockRecording.uri = 'file:///shadow.m4a';
    jest.clearAllMocks();
  });

  it('waits for start settle time after record() before returning', async () => {
    await startShadowRecording();
    expect(mockRecording.record).toHaveBeenCalledTimes(1);
    expect(delays).toContain(RECORDING_START_SETTLE_MS);
    expect(getActiveShadowRecording()).toBeTruthy();
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_RECORDING);
  });

  it('waits for tail buffer before stop()', async () => {
    await startShadowRecording();
    const uri = await stopShadowRecording();
    expect(delays).toContain(RECORDING_STOP_TAIL_MS);
    expect(mockRecording.stop).toHaveBeenCalledTimes(1);
    expect(mockRecording.remove).toHaveBeenCalled();
    expect(uri).toBe('file:///shadow.m4a');
    expect(getActiveShadowRecording()).toBeNull();
    expect(deactivateKeepAwake).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_RECORDING);
  });

  it('does not read URI before stop() completes', async () => {
    const order: string[] = [];
    mockRecording.stop.mockImplementation(async () => {
      order.push('stop');
    });
    Object.defineProperty(mockRecording, 'uri', {
      configurable: true,
      get() {
        order.push('uri');
        return 'file:///shadow.m4a';
      },
    });

    await startShadowRecording();
    await stopShadowRecording();
    expect(order[0]).toBe('stop');
    expect(order).toContain('uri');
    expect(order.indexOf('stop')).toBeLessThan(order.indexOf('uri'));
  });

  it('does not leave keep-awake active when prepare fails', async () => {
    mockRecording.prepareToRecordAsync.mockRejectedValueOnce(new Error('prepare failed'));
    await expect(startShadowRecording()).rejects.toThrow('prepare failed');
    expect(activateKeepAwakeAsync).not.toHaveBeenCalled();
    expect(getActiveShadowRecording()).toBeNull();
  });

  it('releases keep-awake on dispose', async () => {
    await startShadowRecording();
    await disposeShadowRecording();
    expect(deactivateKeepAwake).toHaveBeenCalledWith(AUDIO_KEEP_AWAKE_TAG_RECORDING);
    expect(getActiveShadowRecording()).toBeNull();
  });
});
