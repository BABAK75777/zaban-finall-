import { OperationGuard } from '@zaban/tts-mobile';

/**
 * Simulates reading-screen audio ops: AI playback, Shadow record, Back/Next nav.
 * Guards against stuck guard state when buttons are mashed during dialogue playback.
 */

function simulateHearAi(guard: OperationGuard, cancel: () => void): boolean {
  cancel();
  return guard.tryAcquire('ai_playback') != null;
}

function simulateShadowStart(guard: OperationGuard, cancel: () => void): boolean {
  cancel();
  return guard.tryAcquire('recording') != null;
}

function simulateNavDuringPlayback(guard: OperationGuard, cancel: () => void): boolean {
  cancel();
  return guard.tryAcquire('ai_playback') != null;
}

describe('reading controls stress (no hang)', () => {
  it('rejects second ai_playback while first is in flight (no stacked acquire)', () => {
    const guard = new OperationGuard();
    const first = guard.tryAcquire('ai_playback');
    expect(first).toBe(1);
    expect(guard.tryAcquire('ai_playback')).toBeNull();
    expect(guard.getActive()).toBe('ai_playback');
    guard.release(1, 'ai_playback');
    expect(guard.getActive()).toBe('idle');
  });

  it('rapid AI + Shadow + AI mash ends idle after cancel', () => {
    const guard = new OperationGuard();
    const cancel = () => {
      guard.cancel();
    };

    for (let i = 0; i < 40; i++) {
      if (i % 3 === 0) {
        simulateHearAi(guard, cancel);
      } else if (i % 3 === 1) {
        simulateShadowStart(guard, cancel);
      } else {
        simulateNavDuringPlayback(guard, cancel);
      }
      if (i % 5 === 0) {
        cancel();
      }
    }

    cancel();
    expect(guard.getActive()).toBe('idle');
    expect(guard.tryAcquire('ai_playback')).not.toBeNull();
    guard.cancel();
  });

  it('AI during playback then Back/Next does not leave guard stuck', () => {
    const guard = new OperationGuard();
    const cancel = () => guard.cancel();

    const token = guard.tryAcquire('ai_playback');
    expect(token).toBe(1);

    const navStarted = simulateNavDuringPlayback(guard, cancel);
    expect(navStarted).toBe(true);
    expect(guard.getActive()).toBe('ai_playback');

    guard.release(guard.getGeneration(), 'ai_playback');
    expect(guard.getActive()).toBe('idle');

    cancel();
    expect(guard.getActive()).toBe('idle');
  });

  it('shadow blocked during AI until cancel', () => {
    const guard = new OperationGuard();
    guard.tryAcquire('ai_playback');
    expect(guard.tryAcquire('recording')).toBeNull();
    guard.cancel();
    expect(guard.tryAcquire('recording')).not.toBeNull();
  });

  it('100 rapid cancel cycles complete without stuck guard', () => {
    const guard = new OperationGuard();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    for (let i = 0; i < 100; i++) {
      const op = i % 2 === 0 ? 'ai_playback' : 'recording';
      const token = guard.tryAcquire(op);
      if (token != null) {
        if (i % 3 === 0) {
          guard.release(token, op);
        } else {
          guard.cancel();
        }
      } else {
        guard.cancel();
      }
    }

    log.mockRestore();
    expect(guard.getActive()).toBe('idle');
  });
});
