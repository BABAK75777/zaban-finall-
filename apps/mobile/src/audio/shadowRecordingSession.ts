import { Audio } from 'expo-av';

let activeRecording: Audio.Recording | null = null;
let opChain: Promise<void> = Promise.resolve();

export function runExclusiveShadowRecordingOp<T>(fn: () => Promise<T>): Promise<T> {
  const run = opChain.then(() => fn());
  opChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function unloadRecording(rec: Audio.Recording): Promise<void> {
  try {
    await rec.stopAndUnloadAsync();
  } catch {
    /* ignore */
  }
}

export async function disposeShadowRecording(): Promise<void> {
  return runExclusiveShadowRecordingOp(async () => {
    const rec = activeRecording;
    activeRecording = null;
    if (rec) {
      await unloadRecording(rec);
    }
  });
}

export async function startShadowRecording(): Promise<Audio.Recording> {
  return runExclusiveShadowRecordingOp(async () => {
    const stale = activeRecording;
    activeRecording = null;
    if (stale) {
      await unloadRecording(stale);
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const recording = new Audio.Recording();
    activeRecording = recording;
    try {
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      return recording;
    } catch (err) {
      activeRecording = null;
      await unloadRecording(recording);
      throw err;
    }
  });
}

export async function stopShadowRecording(): Promise<string | null> {
  return runExclusiveShadowRecordingOp(async () => {
    const rec = activeRecording;
    activeRecording = null;
    if (!rec) {
      return null;
    }
    try {
      await rec.stopAndUnloadAsync();
      return rec.getURI();
    } catch {
      return null;
    }
  });
}

/** Test-only: reset module state between tests */
export function __resetShadowRecordingSessionForTests(): void {
  activeRecording = null;
  opChain = Promise.resolve();
}
