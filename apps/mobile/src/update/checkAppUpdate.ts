import { resolveAppVersionString } from '../config/appVersion';
import { isUpdateAvailable } from './compareVersions';
import { fetchUpdateConfig } from './fetchUpdateConfig';
import type { ResolvedUpdatePrompt } from './types';

export type AppUpdateCheckResult =
  | {
      updateAvailable: false;
      currentVersion: string;
      latestVersion?: string;
      reason?: 'up-to-date' | 'fetch-failed' | 'no-url';
    }
  | {
      updateAvailable: true;
      currentVersion: string;
      latestVersion: string;
      prompt: ResolvedUpdatePrompt;
    };

export async function checkAppUpdate(
  currentVersion: string = resolveAppVersionString()
): Promise<AppUpdateCheckResult> {
  console.log(`[UPDATE_CHECK] currentVersion=${currentVersion}`);

  const remote = await fetchUpdateConfig();
  if (!remote) {
    console.log('[UPDATE_CHECK] updateAvailable=false');
    return {
      updateAvailable: false,
      currentVersion,
      reason: 'fetch-failed',
    };
  }

  const { latestVersion } = remote;
  console.log(`[UPDATE_CHECK] latestVersion=${latestVersion}`);

  const available = isUpdateAvailable(currentVersion, latestVersion);
  console.log(`[UPDATE_CHECK] updateAvailable=${available}`);

  if (!available) {
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion,
      reason: 'up-to-date',
    };
  }

  return {
    updateAvailable: true,
    currentVersion,
    latestVersion,
    prompt: remote,
  };
}
