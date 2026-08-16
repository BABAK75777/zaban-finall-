import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OperationGuard } from '../packages/tts-mobile/src/operationGuard';

describe('OperationGuard endurance logs', () => {
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

  it('rejects duplicate acquire while busy', () => {
    const guard = new OperationGuard();
    guard.tryAcquire('ai_playback');
    expect(guard.tryAcquire('ai_playback')).toBeNull();
    guard.cancel();
    expect(guard.getActive()).toBe('idle');
  });

  it('emits guard_transition on acquire, release, cancel, reject', () => {
    const guard = new OperationGuard();

    guard.tryAcquire('ai_playback');
    guard.release(1, 'ai_playback');
    guard.tryAcquire('recording');
    guard.release(2, 'recording');
    guard.tryAcquire('ai_playback');
    guard.tryAcquire('recording');
    guard.cancel();

    const endurance = logs.filter((l) => l.includes('[Endurance] guard_transition'));
    expect(endurance.some((l) => l.includes('"action":"acquire"') && l.includes('"to":"playing"'))).toBe(
      true
    );
    expect(endurance.some((l) => l.includes('"action":"release"') && l.includes('"to":"idle"'))).toBe(
      true
    );
    expect(endurance.some((l) => l.includes('"action":"reject"'))).toBe(true);
    expect(endurance.some((l) => l.includes('"action":"cancel"') && l.includes('"to":"stopped"'))).toBe(
      true
    );
  });
});
