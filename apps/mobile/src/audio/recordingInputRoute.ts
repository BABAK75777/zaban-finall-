import type { RecordingInput } from 'expo-audio';

export type RecordingInputKind =
  | 'wired_headset'
  | 'bluetooth_sco'
  | 'builtin_mic'
  | 'playback_only'
  | 'unknown';

const WIRED_HINTS = ['microphonewired', 'wired_headset', 'headsetmic', 'headset_mic'];
const BT_MIC_HINTS = ['bluetoothsco', 'bluetoothhfp', 'bluetooth_hfp', 'hfp'];
const BUILTIN_HINTS = ['microphonebuiltin', 'builtin_mic', 'built-in'];
const PLAYBACK_ONLY_HINTS = ['bluetootha2dp', 'a2dp'];

/** Classify expo-audio RecordingInput.type for route preference logic. */
export function classifyRecordingInputType(type: string): RecordingInputKind {
  const normalized = type.trim().toLowerCase().replace(/\s+/g, '');
  if (WIRED_HINTS.some((hint) => normalized.includes(hint))) {
    return 'wired_headset';
  }
  if (BT_MIC_HINTS.some((hint) => normalized.includes(hint))) {
    return 'bluetooth_sco';
  }
  if (PLAYBACK_ONLY_HINTS.some((hint) => normalized.includes(hint))) {
    return 'playback_only';
  }
  if (BUILTIN_HINTS.some((hint) => normalized.includes(hint))) {
    return 'builtin_mic';
  }
  return 'unknown';
}

/**
 * Prefer wired headset mic, then Bluetooth HFP/SCO, then built-in phone mic.
 * Skips A2DP-only outputs (headphones without mic).
 */
export function selectPreferredRecordingInput(
  inputs: RecordingInput[]
): RecordingInput | null {
  if (inputs.length === 0) {
    return null;
  }

  const wired = inputs.find(
    (input) => classifyRecordingInputType(input.type) === 'wired_headset'
  );
  if (wired) {
    return wired;
  }

  const bluetooth = inputs.find(
    (input) => classifyRecordingInputType(input.type) === 'bluetooth_sco'
  );
  if (bluetooth) {
    return bluetooth;
  }

  const builtin = inputs.find(
    (input) => classifyRecordingInputType(input.type) === 'builtin_mic'
  );
  if (builtin) {
    return builtin;
  }

  const fallback = inputs.find(
    (input) => classifyRecordingInputType(input.type) !== 'playback_only'
  );
  return fallback ?? null;
}

export type ApplyRecordingInputResult = {
  applied: boolean;
  selected: RecordingInput | null;
  reason: 'none_available' | 'applied' | 'set_input_failed' | 'unsupported';
};

function devLog(message: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[RecordingRoute] ${message}`);
  }
}

type RecordingInputController = {
  getAvailableInputs: () => RecordingInput[] | Promise<RecordingInput[]>;
  setInput: (inputUid: string) => void | Promise<void>;
};

/**
 * Apply the best available recording input after prepareToRecordAsync.
 * Safe no-op when expo-audio cannot list or set inputs.
 */
export async function applyPreferredRecordingInput(
  recording: RecordingInputController
): Promise<ApplyRecordingInputResult> {
  try {
    const inputs = await Promise.resolve(recording.getAvailableInputs());
    const selected = selectPreferredRecordingInput(inputs);
    if (!selected) {
      devLog('no preferred input available; using OS default');
      return { applied: false, selected: null, reason: 'none_available' };
    }

    await Promise.resolve(recording.setInput(selected.uid));
    devLog(`input=${selected.type} uid=${selected.uid} name=${selected.name}`);
    return { applied: true, selected, reason: 'applied' };
  } catch (error) {
    devLog(
      `setInput failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return { applied: false, selected: null, reason: 'set_input_failed' };
  }
}
