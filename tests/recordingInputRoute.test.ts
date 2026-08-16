import { describe, expect, it } from 'vitest';
import {
  classifyRecordingInputType,
  selectPreferredRecordingInput,
} from '../apps/mobile/src/audio/recordingInputRoute';
import type { RecordingInput } from 'expo-audio';

const builtinMic: RecordingInput = {
  uid: 'builtin-1',
  name: 'Phone Microphone',
  type: 'MicrophoneBuiltIn',
};

const wiredHeadset: RecordingInput = {
  uid: 'wired-1',
  name: 'Wired Headset',
  type: 'MicrophoneWired',
};

const bluetoothSco: RecordingInput = {
  uid: 'bt-sco-1',
  name: 'BT Headset',
  type: 'BluetoothSCO',
};

const bluetoothA2dp: RecordingInput = {
  uid: 'bt-a2dp-1',
  name: 'BT Headphones',
  type: 'BluetoothA2DP',
};

describe('recordingInputRoute', () => {
  it('classifies wired, bluetooth mic, builtin, and playback-only inputs', () => {
    expect(classifyRecordingInputType('MicrophoneWired')).toBe('wired_headset');
    expect(classifyRecordingInputType('HeadsetMic')).toBe('wired_headset');
    expect(classifyRecordingInputType('BluetoothSCO')).toBe('bluetooth_sco');
    expect(classifyRecordingInputType('BluetoothHFP')).toBe('bluetooth_sco');
    expect(classifyRecordingInputType('MicrophoneBuiltIn')).toBe('builtin_mic');
    expect(classifyRecordingInputType('BluetoothA2DP')).toBe('playback_only');
  });

  it('prefers phone mic when no headset is connected', () => {
    expect(selectPreferredRecordingInput([builtinMic])).toEqual(builtinMic);
  });

  it('prefers wired headset mic when connected', () => {
    expect(selectPreferredRecordingInput([builtinMic, wiredHeadset])).toEqual(
      wiredHeadset
    );
  });

  it('prefers bluetooth SCO mic over phone mic when wired is absent', () => {
    expect(selectPreferredRecordingInput([builtinMic, bluetoothSco])).toEqual(
      bluetoothSco
    );
  });

  it('falls back to phone mic when only playback-only bluetooth is listed', () => {
    expect(selectPreferredRecordingInput([builtinMic, bluetoothA2dp])).toEqual(
      builtinMic
    );
  });

  it('prefers wired headset over bluetooth and phone mic', () => {
    expect(
      selectPreferredRecordingInput([builtinMic, bluetoothSco, wiredHeadset])
    ).toEqual(wiredHeadset);
  });
});
