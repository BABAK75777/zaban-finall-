export type UpdateConfigResponse = {
  latestVersion: string;
  minimumSupportedVersion?: string;
  updateUrl?: string;
  message?: string;
};

export type ResolvedUpdatePrompt = {
  latestVersion: string;
  updateUrl: string | null;
  message: string;
};

export const DEFAULT_UPDATE_MESSAGE =
  'A newer version of Mamlio is available. Please update for the latest fixes and improvements.';

export const DEFAULT_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.babakworks.mamlio';
