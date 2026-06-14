/**
 * When to touch activity / run idle cache check (Step B).
 */

export type ActivityTouchEvent = 'playback_start' | 'playback_stop';

export function shouldTouchLastActivityOn(event: ActivityTouchEvent): boolean {
  return event === 'playback_start' || event === 'playback_stop';
}

export function shouldRunIdleCacheCheckOnAppState(appState: string): boolean {
  return appState === 'active';
}
