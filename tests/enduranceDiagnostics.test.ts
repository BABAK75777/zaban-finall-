import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ENDURANCE_PREFIX,
  logEndurance,
  logGuardTransition,
  logReplaySource,
  logRingCleanup,
  logLifecycle,
  logNavigation,
  logTempAudioCount,
  mapLifecyclePhase,
  replayAudioSource,
  toEnduranceGuardState,
} from '../packages/tts-mobile/src/enduranceDiagnostics';

describe('endurance diagnostics (Stage 1)', () => {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logEndurance uses [Endurance] prefix and JSON payload', () => {
    logEndurance('test_event', { foo: 1 });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain(ENDURANCE_PREFIX);
    expect(logs[0]).toContain('test_event');
    expect(logs[0]).toContain('"foo":1');
  });

  it('toEnduranceGuardState maps ai_playback to playing', () => {
    expect(toEnduranceGuardState('idle')).toBe('idle');
    expect(toEnduranceGuardState('ai_playback')).toBe('playing');
    expect(toEnduranceGuardState('recording')).toBe('recording');
  });

  it('replayAudioSource reports cache, network, none', () => {
    expect(replayAudioSource({ fromCache: true }, false)).toBe('cache');
    expect(replayAudioSource({ fromCache: false }, true)).toBe('network');
    expect(replayAudioSource(null, false)).toBe('none');
  });

  it('mapLifecyclePhase detects restored from background', () => {
    expect(mapLifecyclePhase('active', 'background')).toBe('restored');
    expect(mapLifecyclePhase('active', 'inactive')).toBe('restored');
    expect(mapLifecyclePhase('active', null)).toBe('active');
    expect(mapLifecyclePhase('background', 'active')).toBe('background');
  });

  it('structured helpers emit expected event names', () => {
    logGuardTransition({
      action: 'acquire',
      operation: 'ai_playback',
      from: 'idle',
      to: 'playing',
      generation: 1,
    });
    logReplaySource({
      sentenceId: 'abc',
      trigger: 'replay',
      audioSource: 'cache',
      allowNetwork: false,
    });
    logRingCleanup({
      evictedCount: 2,
      retainedCount: 1,
      retainedSentenceIds: ['a'],
      evictedSentenceIds: ['b', 'c'],
    });
    logLifecycle({ phase: 'restored', rawState: 'active', previousRawState: 'background' });
    logNavigation({ direction: 'next', sentenceIndex: 2, sentenceId: 'id2' });
    logTempAudioCount(3, 'after_play');

    const joined = logs.join('\n');
    expect(joined).toContain('guard_transition');
    expect(joined).toContain('replay_source');
    expect(joined).toContain('ring_cleanup');
    expect(joined).toContain('lifecycle');
    expect(joined).toContain('navigation');
    expect(joined).toContain('temp_audio_count');
  });
});
