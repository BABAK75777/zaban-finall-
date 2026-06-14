/**

 * Structured logs for device endurance testing. Prefix: [Endurance]

 * Diagnostics only — no behavior changes.

 */



export const ENDURANCE_PREFIX = '[Endurance]';



/** Log vocabulary for OperationGuard transitions (maps internal ai_playback → playing). */

export type EnduranceGuardState = 'idle' | 'playing' | 'recording' | 'stopped';



export type ReplayAudioSource = 'cache' | 'network' | 'none';



export type LifecyclePhase = 'active' | 'background' | 'restored' | 'inactive';



export function toEnduranceGuardState(

  op: 'idle' | 'ai_playback' | 'recording'

): Exclude<EnduranceGuardState, 'stopped'> {

  if (op === 'ai_playback') return 'playing';

  if (op === 'recording') return 'recording';

  return 'idle';

}



export function replayAudioSource(

  resolved: { fromCache: boolean } | null,

  allowNetwork: boolean

): ReplayAudioSource {

  if (!resolved) return 'none';

  return resolved.fromCache ? 'cache' : 'network';

}



export function mapLifecyclePhase(

  next: string,

  previous: string | null

): LifecyclePhase {

  if (next === 'active' && (previous === 'background' || previous === 'inactive')) {

    return 'restored';

  }

  if (next === 'active') return 'active';

  if (next === 'background') return 'background';

  return 'inactive';

}



export function logEndurance(event: string, payload: Record<string, unknown>): void {

  console.log(`${ENDURANCE_PREFIX} ${event}`, JSON.stringify(payload));

}



export function logGuardTransition(payload: {

  action: 'acquire' | 'release' | 'cancel' | 'reject';

  operation?: string;

  from: EnduranceGuardState;

  to: EnduranceGuardState;

  generation: number;

}): void {

  logEndurance('guard_transition', payload);

}



export function logReplaySource(payload: {

  sentenceId: string;

  trigger: 'hear' | 'replay' | 'nav';

  audioSource: ReplayAudioSource;

  allowNetwork: boolean;

}): void {

  logEndurance('replay_source', payload);

}



export function logRingCleanup(payload: {

  evictedCount: number;

  retainedCount: number;

  retainedSentenceIds: string[];

  evictedSentenceIds: string[];

}): void {

  logEndurance('ring_cleanup', payload);

}



export function logLifecycle(payload: {

  phase: LifecyclePhase;

  rawState: string;

  previousRawState: string | null;

}): void {

  logEndurance('lifecycle', payload);

}



export function logNavigation(payload: {

  direction: 'back' | 'next';

  sentenceIndex: number;

  sentenceId: string;

}): void {

  logEndurance('navigation', payload);

}



export function logTempAudioCount(tempFileCount: number, context: string): void {

  logEndurance('temp_audio_count', { tempFileCount, context });

}


