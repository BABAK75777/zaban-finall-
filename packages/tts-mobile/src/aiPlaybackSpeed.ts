/**
 * AI playback speed: UI slider values vs calibrated Expo AV runtime rate.
 *
 * TTS audio is always generated at TTS_GENERATION_SPEED (1.0). Playback tempo is
 * applied only client-side via setPlaybackRate so every sentence sounds consistent.
 */

/** User-facing slider min/max (settings UI). */
export const MIN_UI_AI_SPEED = 0.5;
export const MAX_UI_AI_SPEED = 1.2;
export const DEFAULT_UI_AI_SPEED = 1.0;

/** Fixed provider speed — never bake tempo into cached MP3. */
export const TTS_GENERATION_SPEED = 1.0;

/** Natural reading at UI 1.0x (calibrated below provider 1.0). */
export const RUNTIME_RATE_AT_UI_1 = 0.85;

/** Slope below 1.0x UI: 0.5 → 0.50 runtime, 1.0 → 0.85 runtime. */
export const UI_TO_RUNTIME_RATE_SLOPE_LOW = 0.7;

/** Slope above 1.0x UI: 1.0 → 0.85 runtime, 1.2 → 1.08 runtime. */
export const UI_TO_RUNTIME_RATE_SLOPE_HIGH = 1.15;

/** @deprecated Piecewise mapping — prefer UI_TO_RUNTIME_RATE_SLOPE_LOW/HIGH */
export const UI_TO_RUNTIME_RATE_SLOPE = UI_TO_RUNTIME_RATE_SLOPE_HIGH;

export const MIN_RUNTIME_PLAYBACK_RATE = 0.5;
export const MAX_RUNTIME_PLAYBACK_RATE = 1.08;

/** @deprecated Use MIN_UI_AI_SPEED */
export const MIN_AI_PLAYBACK_SPEED = MIN_UI_AI_SPEED;
/** @deprecated Use MAX_UI_AI_SPEED */
export const MAX_AI_PLAYBACK_SPEED = MAX_UI_AI_SPEED;
/** @deprecated Use DEFAULT_UI_AI_SPEED */
export const DEFAULT_AI_PLAYBACK_SPEED = DEFAULT_UI_AI_SPEED;

export function clampUiSpeed(speed: number): number {
  return Math.max(MIN_UI_AI_SPEED, Math.min(MAX_UI_AI_SPEED, speed));
}

/** @deprecated Use clampUiSpeed */
export function clampAiPlaybackSpeed(speed: number): number {
  return clampUiSpeed(speed);
}

export function clampRuntimePlaybackRate(rate: number): number {
  return Math.max(MIN_RUNTIME_PLAYBACK_RATE, Math.min(MAX_RUNTIME_PLAYBACK_RATE, rate));
}

/** Map user-facing slider value to Expo AV playback rate (piecewise linear, anchored at 1.0 → 0.85). */
export function uiSpeedToRuntimeRate(uiSpeed: number): number {
  const ui = clampUiSpeed(uiSpeed);
  let raw: number;
  if (ui <= DEFAULT_UI_AI_SPEED) {
    const span = DEFAULT_UI_AI_SPEED - MIN_UI_AI_SPEED;
    const t = span > 0 ? (ui - MIN_UI_AI_SPEED) / span : 0;
    raw = MIN_RUNTIME_PLAYBACK_RATE + t * (RUNTIME_RATE_AT_UI_1 - MIN_RUNTIME_PLAYBACK_RATE);
  } else {
    const span = MAX_UI_AI_SPEED - DEFAULT_UI_AI_SPEED;
    const t = span > 0 ? (ui - DEFAULT_UI_AI_SPEED) / span : 0;
    raw = RUNTIME_RATE_AT_UI_1 + t * (MAX_RUNTIME_PLAYBACK_RATE - RUNTIME_RATE_AT_UI_1);
  }
  return clampRuntimePlaybackRate(Math.round(raw * 1000) / 1000);
}

export function resolveAiPlaybackSpeed(uiSpeed: number): {
  uiSpeed: number;
  runtimeRate: number;
} {
  const ui = clampUiSpeed(uiSpeed);
  return { uiSpeed: ui, runtimeRate: uiSpeedToRuntimeRate(ui) };
}

/** Use when loading persisted speed; defaults to UI 1.0 only when no valid setting exists. */
export function normalizeAiPlaybackSpeed(speed: unknown): number {
  if (typeof speed === 'number' && speed > 0 && Number.isFinite(speed)) {
    return clampUiSpeed(speed);
  }
  return DEFAULT_UI_AI_SPEED;
}

export function formatUiSpeed(speed: number): string {
  const clamped = clampUiSpeed(speed);
  return (Math.round(clamped * 10) / 10).toFixed(1);
}

/** @deprecated Use formatUiSpeed */
export function formatAiPlaybackSpeed(speed: number): string {
  return formatUiSpeed(speed);
}

export function formatRuntimeRate(rate: number): string {
  return clampRuntimePlaybackRate(rate).toFixed(3);
}

function speedLogPair(uiSpeed: number): string {
  const { runtimeRate } = resolveAiPlaybackSpeed(uiSpeed);
  return `uiSpeed=${formatUiSpeed(uiSpeed)} runtimeRate=${formatRuntimeRate(runtimeRate)}`;
}

export function logAiSpeedSettingChanged(uiSpeed: number): void {
  console.log(`[AI_SPEED] settingChanged ${speedLogPair(uiSpeed)}`);
}

export function logAiSpeedPersisted(uiSpeed: number): void {
  console.log(`[AI_SPEED] persisted ${speedLogPair(uiSpeed)}`);
}

export function logAiSpeedPlaybackStart(uiSpeed: number): void {
  console.log(`[AI_SPEED] playbackStart ${speedLogPair(uiSpeed)}`);
}

export function logAiSpeedAppliedAfterLoad(uiSpeed: number): void {
  console.log(`[AI_SPEED] appliedAfterLoad ${speedLogPair(uiSpeed)}`);
}

export function logRuntimeRateAppliedAfterLoad(runtimeRate: number): void {
  console.log(
    `[AI_SPEED] appliedAfterLoad runtimeRate=${formatRuntimeRate(runtimeRate)}`
  );
}

export function logAiSpeedSetPlaybackRate(uiSpeed: number, reason?: string): void {
  const suffix = reason ? ` reason=${reason}` : '';
  console.log(`[AI_SPEED] setPlaybackRate ${speedLogPair(uiSpeed)}${suffix}`);
}

export function logAiSpeedReplay(uiSpeed: number): void {
  console.log(`[AI_SPEED] replay ${speedLogPair(uiSpeed)}`);
}

/** @deprecated Use logAiSpeedAppliedAfterLoad */
export function logAiSpeedSoundLoaded(uiSpeed: number): void {
  logAiSpeedAppliedAfterLoad(uiSpeed);
}
