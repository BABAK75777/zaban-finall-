import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetShadowRecordingSessionForTests,
  disposeShadowRecording,
  runExclusiveShadowRecordingOp,
  startShadowRecording,
  stopShadowRecording,
} from '../apps/mobile/src/audio/shadowRecordingSession';
import {
  __getPreparedRecordingForTests,
  __getSelectedInputUidForTests,
  __getSetAudioModeCallCountForTests,
  __resetExpoAvMockForTests,
  __setAvailableInputsForTests,
} from './mocks/expo-audio';

describe('shadowRecordingSession', () => {
  beforeEach(() => {
    __resetExpoAvMockForTests();
    __resetShadowRecordingSessionForTests();
  });

  it('starts and stops a single recording', async () => {
    await startShadowRecording();
    expect(__getPreparedRecordingForTests()).not.toBeNull();

    const uri = await stopShadowRecording();
    expect(uri).toMatch(/^file:\/\/\/mock-recording-/);
    expect(__getPreparedRecordingForTests()).toBeNull();
  });

  it('serializes concurrent starts (no expo prepare collision)', async () => {
    const results = await Promise.allSettled([
      startShadowRecording(),
      startShadowRecording(),
      startShadowRecording(),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(3);
    expect(rejected.length).toBe(0);
    expect(__getPreparedRecordingForTests()).not.toBeNull();

    await disposeShadowRecording();
    expect(__getPreparedRecordingForTests()).toBeNull();
  });

  it('dispose clears active recording before a new start', async () => {
    await startShadowRecording();
    await disposeShadowRecording();
    await expect(startShadowRecording()).resolves.toBeDefined();
    await stopShadowRecording();
  });

  it('runExclusiveShadowRecordingOp chains work in order', async () => {
    const order: number[] = [];
    await Promise.all([
      runExclusiveShadowRecordingOp(async () => {
        order.push(1);
        await new Promise((r) => setTimeout(r, 20));
      }),
      runExclusiveShadowRecordingOp(async () => {
        order.push(2);
      }),
      runExclusiveShadowRecordingOp(async () => {
        order.push(3);
      }),
    ]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('selects wired headset mic before recording starts', async () => {
    __setAvailableInputsForTests([
      { uid: 'builtin-1', name: 'Phone', type: 'MicrophoneBuiltIn' },
      { uid: 'wired-1', name: 'Headset', type: 'MicrophoneWired' },
    ]);

    await startShadowRecording();
    expect(__getSelectedInputUidForTests()).toBe('wired-1');
    await stopShadowRecording();
  });

  it('selects bluetooth SCO mic when wired headset is absent', async () => {
    __setAvailableInputsForTests([
      { uid: 'builtin-1', name: 'Phone', type: 'MicrophoneBuiltIn' },
      { uid: 'bt-1', name: 'BT Headset', type: 'BluetoothSCO' },
    ]);

    await startShadowRecording();
    expect(__getSelectedInputUidForTests()).toBe('bt-1');
    await stopShadowRecording();
  });

  it('keeps phone mic when only builtin input is available', async () => {
    __setAvailableInputsForTests([
      { uid: 'builtin-1', name: 'Phone', type: 'MicrophoneBuiltIn' },
    ]);

    await startShadowRecording();
    expect(__getSelectedInputUidForTests()).toBe('builtin-1');
    await stopShadowRecording();
  });

  it('configures recording audio mode once per recording session start', async () => {
    await startShadowRecording();
    expect(__getSetAudioModeCallCountForTests()).toBe(1);
    await stopShadowRecording();
  });
});

describe('shadow phase lock (mirrors handleShadow idle entry)', () => {
  it('blocks a second idle entry while starting is already claimed', () => {
    let phase: 'idle' | 'starting' | 'recording' = 'idle';
    const entries: string[] = [];

    function tryEnterIdlePath(): boolean {
      if (phase !== 'idle') {
        return false;
      }
      phase = 'starting';
      return true;
    }

    expect(tryEnterIdlePath()).toBe(true);
    entries.push('first');
    expect(tryEnterIdlePath()).toBe(false);
    entries.push('blocked');

    phase = 'recording';
    expect(tryEnterIdlePath()).toBe(false);

    phase = 'idle';
    expect(tryEnterIdlePath()).toBe(true);
    entries.push('third');

    expect(entries).toEqual(['first', 'blocked', 'third']);
  });
});
