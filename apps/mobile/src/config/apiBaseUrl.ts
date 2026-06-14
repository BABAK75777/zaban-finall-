import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_API_URL = 'https://zaban-api-875817275251.europe-west1.run.app';
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

function isAndroidEmulator(): boolean {
  const model = Constants.platform?.model ?? '';
  return /sdk|emulator|generic|virtual/i.test(model);
}

/** Resolve API base URL for dev devices (physical phone cannot use 127.0.0.1). */
export function resolveApiBaseUrl(): string {
  const configured = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

  try {
    const url = new URL(configured);
    if (!isLoopbackHost(url.hostname)) {
      return configured;
    }

    if (Platform.OS === 'android') {
      if (isAndroidEmulator()) {
        url.hostname = '10.0.2.2';
        return url.toString().replace(/\/$/, '');
      }

      const devHost = getDebuggerHost();
      if (devHost && !isLoopbackHost(devHost)) {
        url.hostname = devHost;
        url.port = String(DEV_API_PORT);
        return url.toString().replace(/\/$/, '');
      }
    }
  } catch {
    return configured;
  }

  return configured;
}

export const API_BASE_URL = resolveApiBaseUrl();

if (__DEV__) {
  console.log('[TTS:Mobile] API_BASE_URL=', API_BASE_URL);
}
