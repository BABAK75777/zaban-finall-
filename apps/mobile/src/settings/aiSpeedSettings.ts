import {
  clampUiSpeed,
  formatUiSpeed,
  MAX_UI_AI_SPEED,
  MIN_UI_AI_SPEED,
  resolveAiPlaybackSpeed,
} from '@zaban/tts-mobile';

/** Finer steps for smooth slider drag (0.5–1.2 in 0.05 increments). */
export const AI_SPEED_SLIDER_STEP = 0.05;

export function formatAiSpeedLabel(uiSpeed: number): string {
  return `AI SPEED · ${formatUiSpeed(uiSpeed)}x`;
}

export function normalizeAiSpeedSliderValue(raw: number): number {
  return clampUiSpeed(raw);
}

export function runtimeRateForUiSpeed(uiSpeed: number): number {
  return resolveAiPlaybackSpeed(uiSpeed).runtimeRate;
}

/** Playback rate is voice-agnostic — TTS tempo is applied client-side after fetch. */
export function resolvePlaybackRateForVoice(
  uiSpeed: number,
  _voiceType: 'male' | 'female'
): number {
  return runtimeRateForUiSpeed(uiSpeed);
}

export function listAiSpeedSliderValues(
  min = MIN_UI_AI_SPEED,
  max = MAX_UI_AI_SPEED,
  step = AI_SPEED_SLIDER_STEP
): number[] {
  const values: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) {
    values.push(parseFloat(clampUiSpeed(v).toFixed(2)));
  }
  return values;
}
