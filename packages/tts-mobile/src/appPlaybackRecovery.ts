/**
 * App lifecycle helpers for playback interrupt / recovery (testable).
 */

export function shouldCleanupPlaybackOnAppState(appState: string): boolean {
  return appState === 'background' || appState === 'inactive';
}

export function playbackCleanupLogMessage(appState: string): string {
  if (appState === 'inactive') {
    return '[APPSTATE] inactive during playback cleanup';
  }
  if (appState === 'background') {
    return '[APPSTATE] background during playback cleanup';
  }
  return `[APPSTATE] ${appState} during playback cleanup`;
}

export const APPSTATE_ACTIVE_RECOVERY_LOG = '[APPSTATE] active recovery completed';

export const OPERATION_GUARD_BACKGROUND_RELEASE_LOG =
  '[OPERATION_GUARD] released after app background';

export function shouldForceIdleOnActiveRecovery(
  status: string,
  shadowPhase: string,
  guardActive: string
): boolean {
  if (status === 'fetching' || status === 'playing') {
    return true;
  }
  if (shadowPhase === 'playing' || shadowPhase === 'starting' || shadowPhase === 'recording') {
    return true;
  }
  if (guardActive !== 'idle') {
    return true;
  }
  return false;
}
