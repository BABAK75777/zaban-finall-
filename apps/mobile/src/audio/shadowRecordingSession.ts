import { AudioModule, RecordingPresets, type AudioRecorder } from 'expo-audio';
import {
  AUDIO_KEEP_AWAKE_TAG_RECORDING,
  acquireAudioKeepAwake,
  releaseAudioKeepAwake,
} from '@zaban/tts-mobile';
import { configureRecordingAudioMode } from './recordingAudioMode';
import { applyPreferredRecordingInput } from './recordingInputRoute';

/** Let the native recorder settle after record() before UI marks "recording". */
export const RECORDING_START_SETTLE_MS = 280;

/** Brief tail after user stops so the final syllable is not clipped. */
export const RECORDING_STOP_TAIL_MS = 320;

let activeRecording: AudioRecorder | null = null;
let opChain: Promise<void> = Promise.resolve();
let recordingAudioModeConfigured = false;
/** Generation token for recording keep-awake; null when not holding the screen awake. */
let recordingKeepAwakeGeneration: number | null = null;
let delayImpl: (ms: number) => Promise<void> = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function holdRecordingKeepAwake(): void {
  recordingKeepAwakeGeneration = acquireAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_RECORDING);
}

function releaseRecordingKeepAwake(): void {
  if (recordingKeepAwakeGeneration == null) {
    return;
  }
  const generation = recordingKeepAwakeGeneration;
  recordingKeepAwakeGeneration = null;
  releaseAudioKeepAwake(AUDIO_KEEP_AWAKE_TAG_RECORDING, generation);
}

type ReleasableRecorder = AudioRecorder & { remove?: () => void; release?: () => void };

function releaseRecorder(rec: AudioRecorder): void {
  const r = rec as ReleasableRecorder;
  try {
    if (typeof r.remove === 'function') {
      r.remove();
      return;
    }
    if (typeof r.release === 'function') {
      r.release();
    }
  } catch {
    /* ignore */
  }
}

export function __setShadowRecordingDelayForTests(fn: (ms: number) => Promise<void>): void {
  delayImpl = fn;
}

export function __resetShadowRecordingDelayForTests(): void {
  delayImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
}

export function runExclusiveShadowRecordingOp<T>(fn: () => Promise<T>): Promise<T> {
  const run = opChain.then(() => fn());
  opChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function unloadRecording(rec: AudioRecorder): Promise<void> {
  try {
    await rec.stop();
  } catch {
    /* ignore */
  }
  releaseRecorder(rec);
}

export function getActiveShadowRecording(): AudioRecorder | null {
  return activeRecording;
}

export async function disposeShadowRecording(): Promise<void> {
  return runExclusiveShadowRecordingOp(async () => {
    const rec = activeRecording;
    activeRecording = null;
    recordingAudioModeConfigured = false;
    releaseRecordingKeepAwake();
    if (rec) {
      await unloadRecording(rec);
    }
  });
}

export type ShadowRecordingStartResult = {
  recording: AudioRecorder;
  startedAtMs: number;
};

/**
 * Prepares, routes input, starts capture, then waits for hardware settle time.
 * Callers should only show "recording" UI after this resolves.
 */
export async function startShadowRecording(): Promise<ShadowRecordingStartResult> {
  return runExclusiveShadowRecordingOp(async () => {
    const stale = activeRecording;
    activeRecording = null;
    releaseRecordingKeepAwake();
    if (stale) {
      await unloadRecording(stale);
    }

    if (!recordingAudioModeConfigured) {
      await configureRecordingAudioMode();
      recordingAudioModeConfigured = true;
    }

    const recording = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    activeRecording = recording;
    try {
      await recording.prepareToRecordAsync();
      await applyPreferredRecordingInput(recording);
      recording.record();
      await delayImpl(RECORDING_START_SETTLE_MS);
      holdRecordingKeepAwake();
      return { recording, startedAtMs: Date.now() };
    } catch (err) {
      activeRecording = null;
      recordingAudioModeConfigured = false;
      releaseRecordingKeepAwake();
      await unloadRecording(recording);
      throw err;
    }
  });
}

/**
 * Waits for tail buffer, then stops and returns the file URI.
 */
export async function stopShadowRecording(): Promise<string | null> {
  return runExclusiveShadowRecordingOp(async () => {
    const rec = activeRecording;
    activeRecording = null;
    recordingAudioModeConfigured = false;
    releaseRecordingKeepAwake();
    if (!rec) {
      return null;
    }
    try {
      await delayImpl(RECORDING_STOP_TAIL_MS);
      await rec.stop();
      const uri = rec.uri;
      releaseRecorder(rec);
      return uri;
    } catch {
      releaseRecorder(rec);
      return null;
    }
  });
}

/** Test-only: reset module state between tests */
export function __resetShadowRecordingSessionForTests(): void {
  activeRecording = null;
  opChain = Promise.resolve();
  recordingAudioModeConfigured = false;
  recordingKeepAwakeGeneration = null;
  __resetShadowRecordingDelayForTests();
}
