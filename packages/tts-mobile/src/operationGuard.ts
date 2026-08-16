/**
 * Mutual exclusion for AI playback vs recording (and other audio ops).
 */

import { logGuardTransition, toEnduranceGuardState } from './enduranceDiagnostics';

export type PlaybackOperation = 'idle' | 'ai_playback' | 'recording';

export class OperationGuard {
  private active: PlaybackOperation = 'idle';
  private generation = 0;

  getActive(): PlaybackOperation {
    return this.active;
  }

  getGeneration(): number {
    return this.generation;
  }

  /**
   * @returns generation token if acquired, null if rejected
   */
  tryAcquire(op: PlaybackOperation): number | null {
    if (this.active !== 'idle') {
      console.log(`[OperationGuard] rejected operation=${op} active=${this.active}`);
      logGuardTransition({
        action: 'reject',
        operation: op,
        from: toEnduranceGuardState(this.active),
        to: toEnduranceGuardState(this.active),
        generation: this.generation,
      });
      return null;
    }
    const from = toEnduranceGuardState(this.active);
    this.active = op;
    this.generation += 1;
    console.log(`[OperationGuard] acquired operation=${op} generation=${this.generation}`);
    logGuardTransition({
      action: 'acquire',
      operation: op,
      from,
      to: toEnduranceGuardState(op),
      generation: this.generation,
    });
    return this.generation;
  }

  release(generation: number, op: PlaybackOperation): void {
    if (this.generation === generation && this.active === op) {
      const from = toEnduranceGuardState(this.active);
      this.active = 'idle';
      console.log(`[OperationGuard] released operation=${op} generation=${generation}`);
      logGuardTransition({
        action: 'release',
        operation: op,
        from,
        to: 'idle',
        generation,
      });
    }
  }

  cancel(): number {
    const from = toEnduranceGuardState(this.active);
    this.generation += 1;
    this.active = 'idle';
    console.log(`[OperationGuard] cancel generation=${this.generation}`);
    logGuardTransition({
      action: 'cancel',
      from,
      to: 'stopped',
      generation: this.generation,
    });
    return this.generation;
  }

  isCurrent(generation: number): boolean {
    return this.generation === generation;
  }
}
