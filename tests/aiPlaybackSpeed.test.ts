import { describe, expect, it } from 'vitest';
import {
  DEFAULT_UI_AI_SPEED,
  MIN_UI_AI_SPEED,
  MAX_UI_AI_SPEED,
  TTS_GENERATION_SPEED,
  RUNTIME_RATE_AT_UI_1,
  MIN_RUNTIME_PLAYBACK_RATE,
  MAX_RUNTIME_PLAYBACK_RATE,
  clampUiSpeed,
  clampRuntimePlaybackRate,
  uiSpeedToRuntimeRate,
  resolveAiPlaybackSpeed,
  normalizeAiPlaybackSpeed,
  formatUiSpeed,
  formatRuntimeRate,
} from '../packages/tts-mobile/src/aiPlaybackSpeed';
import {
  shouldCleanupPlaybackOnAppState,
  playbackCleanupLogMessage,
  shouldForceIdleOnActiveRecovery,
} from '../packages/tts-mobile/src/appPlaybackRecovery';
import { OperationGuard } from '../packages/tts-mobile/src/operationGuard';

describe('aiPlaybackSpeed calibration', () => {
  it('defaults UI speed to 1.0 when no valid setting exists', () => {
    expect(normalizeAiPlaybackSpeed(undefined)).toBe(DEFAULT_UI_AI_SPEED);
    expect(normalizeAiPlaybackSpeed(0)).toBe(DEFAULT_UI_AI_SPEED);
  });

  it('maps UI speeds to calibrated runtime rates', () => {
    expect(uiSpeedToRuntimeRate(0.5)).toBe(0.5);
    expect(uiSpeedToRuntimeRate(1.0)).toBe(RUNTIME_RATE_AT_UI_1);
    expect(uiSpeedToRuntimeRate(1.2)).toBe(MAX_RUNTIME_PLAYBACK_RATE);
  });

  it('keeps UI slider range 0.5–1.2', () => {
    expect(clampUiSpeed(0.1)).toBe(MIN_UI_AI_SPEED);
    expect(clampUiSpeed(2)).toBe(MAX_UI_AI_SPEED);
  });

  it('playback start receives calibrated runtime rate', () => {
    const { uiSpeed, runtimeRate } = resolveAiPlaybackSpeed(1.0);
    expect(uiSpeed).toBe(1);
    expect(runtimeRate).toBe(0.85);
    expect(runtimeRate).toBeLessThan(TTS_GENERATION_SPEED);
  });

  it('replay uses same calibrated runtime as playback start', () => {
    const hear = resolveAiPlaybackSpeed(MAX_UI_AI_SPEED);
    const replay = resolveAiPlaybackSpeed(MAX_UI_AI_SPEED);
    expect(replay.runtimeRate).toBe(hear.runtimeRate);
    expect(replay.runtimeRate).toBe(MAX_RUNTIME_PLAYBACK_RATE);
  });

  it('formats UI and runtime for logs', () => {
    expect(formatUiSpeed(1)).toBe('1.0');
    expect(formatRuntimeRate(0.85)).toBe('0.850');
  });

  it('clamps runtime playback rate', () => {
    expect(clampRuntimePlaybackRate(2)).toBe(MAX_RUNTIME_PLAYBACK_RATE);
    expect(clampRuntimePlaybackRate(0.1)).toBe(MIN_RUNTIME_PLAYBACK_RATE);
  });
});

describe('appPlaybackRecovery', () => {
  it('detects background/inactive cleanup', () => {
    expect(shouldCleanupPlaybackOnAppState('background')).toBe(true);
    expect(shouldCleanupPlaybackOnAppState('inactive')).toBe(true);
    expect(shouldCleanupPlaybackOnAppState('active')).toBe(false);
  });

  it('logs cleanup reason for inactive vs background', () => {
    expect(playbackCleanupLogMessage('inactive')).toBe(
      '[APPSTATE] inactive during playback cleanup'
    );
    expect(playbackCleanupLogMessage('background')).toBe(
      '[APPSTATE] background during playback cleanup'
    );
  });

  it('background cleanup releases operation guard', () => {
    const guard = new OperationGuard();
    const token = guard.tryAcquire('ai_playback');
    expect(token).not.toBeNull();
    guard.cancel();
    expect(guard.getActive()).toBe('idle');
    expect(guard.tryAcquire('ai_playback')).not.toBeNull();
  });

  it('forces idle on active recovery when playback stuck', () => {
    expect(shouldForceIdleOnActiveRecovery('fetching', 'idle', 'idle')).toBe(true);
    expect(shouldForceIdleOnActiveRecovery('playing', 'idle', 'idle')).toBe(true);
    expect(shouldForceIdleOnActiveRecovery('idle', 'recording', 'idle')).toBe(true);
    expect(shouldForceIdleOnActiveRecovery('idle', 'idle', 'ai_playback')).toBe(true);
    expect(shouldForceIdleOnActiveRecovery('idle', 'idle', 'idle')).toBe(false);
  });
});
