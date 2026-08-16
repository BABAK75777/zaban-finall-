import { describe, expect, it } from 'vitest';
import { applyPreferredRecordingInput } from '../apps/mobile/src/audio/recordingInputRoute';
import type { RecordingInput } from 'expo-audio';

describe('applyPreferredRecordingInput', () => {
  it('applies wired headset input and returns applied=true', async () => {
    const inputs: RecordingInput[] = [
      { uid: 'builtin-1', name: 'Phone', type: 'MicrophoneBuiltIn' },
      { uid: 'wired-1', name: 'Headset', type: 'MicrophoneWired' },
    ];
    let selectedUid: string | null = null;

    const result = await applyPreferredRecordingInput({
      getAvailableInputs: async () => inputs,
      setInput: async (uid) => {
        selectedUid = uid;
      },
    });

    expect(result.applied).toBe(true);
    expect(result.reason).toBe('applied');
    expect(selectedUid).toBe('wired-1');
  });

  it('falls back safely when setInput fails', async () => {
    const result = await applyPreferredRecordingInput({
      getAvailableInputs: async () => [
        { uid: 'wired-1', name: 'Headset', type: 'MicrophoneWired' },
      ],
      setInput: async () => {
        throw new Error('E_AUDIO_SETINPUTFAIL');
      },
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('set_input_failed');
  });

  it('does not throw when no inputs are available', async () => {
    const result = await applyPreferredRecordingInput({
      getAvailableInputs: async () => [],
      setInput: async () => undefined,
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('none_available');
  });
});
