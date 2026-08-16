import { setAudioModeAsync } from 'expo-audio';

/** Audio session for Shadow / microphone recording - enables headset input routing. */
export async function configureRecordingAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'doNotMix',
  });
}

/** Restore playback-oriented audio session after recording stops. */
export async function configurePlaybackAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'duckOthers',
  });
}
