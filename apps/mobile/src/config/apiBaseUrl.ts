import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const DEFAULT_API_URL = 'https://zaban-api-875817275251.europe-west1.run.app';
const DEV_API_PORT = 3001;

function getDebuggerHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate.split(':')[0] || null;
    }
  }

  return null;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** LAN / private IPs baked into APK cannot be reached on other phones or networks. */
export function isPrivateOrLocalHost(hostname: string): boolean {
  if (isLoopbackHost(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  return false;
}

function isAndroidEmulator(): boolean {
  const model = Constants.platform?.model ?? '';
  return /sdk|emulator|generic|virtual/i.test(model);
}

export type ResolveApiBaseUrlOptions = {
  /** Override __DEV__ for unit tests. */
  dev?: boolean;
  /** Override debugger host for unit tests. */
  debuggerHost?: string | null;
  /** Override configured env URL for unit tests. */
  configuredUrl?: string;
};

/**
 * Resolve API base URL.
 * - Release / standalone APK → always cloud HTTPS (never a dev LAN IP from .env).
 * - Dev + Metro attached → local backend on the debugger host.
 * - Dev APK without Metro on another phone → cloud fallback.
 */
export function resolveApiBaseUrl(options: ResolveApiBaseUrlOptions = {}): string {
  const isDev = options.dev ?? __DEV__;
  const configured = (options.configuredUrl ?? process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(
    /\/$/,
    ''
  );

  if (!isDev) {
    return DEFAULT_API_URL;
  }

  try {
    const url = new URL(configured);

    if (!isPrivateOrLocalHost(url.hostname)) {
      return configured;
    }

    const devHost = options.debuggerHost ?? getDebuggerHost();

    if (isLoopbackHost(url.hostname)) {
      if (Platform.OS === 'android' && isAndroidEmulator()) {
        url.hostname = '10.0.2.2';
        return url.toString().replace(/\/$/, '');
      }
      if (devHost && !isLoopbackHost(devHost)) {
        url.hostname = devHost;
        url.port = String(DEV_API_PORT);
        return url.toString().replace(/\/$/, '');
      }
    }

    // LAN IP in .env while Metro is attached (same machine on Wi‑Fi).
    if (devHost && url.hostname === devHost) {
      return configured;
    }

    // Standalone dev APK (no Metro) or unreachable LAN IP → cloud.
    return DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export const API_BASE_URL = resolveApiBaseUrl();

if (__DEV__) {
  console.log('[TTS:Mobile] API_BASE_URL=', API_BASE_URL);
}
