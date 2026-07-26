import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_AI_PLAYBACK_SPEED,
  normalizeAiPlaybackSpeed,
  READING_SESSION_KEY,
} from '@zaban/tts-mobile';

export const APP_SETTINGS_KEY = '@zaban/app_settings_v1';

export const DEFAULT_TEXT_SIZE = 40;
export const MIN_TEXT_SIZE = 24;
export const MAX_TEXT_SIZE = 56;

export type AppSettingsV1 = {
  version: 1;
  aiPlaybackSpeed: number;
  textSize: number;
  /** Stable TTS gender: female | male */
  ttsVoiceGender: 'female' | 'male';
};

let settingsMemoryCache: AppSettingsV1 | null = null;

export function clearAppSettingsCacheForTests(): void {
  settingsMemoryCache = null;
}

export function clampTextSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_TEXT_SIZE;
  return Math.max(MIN_TEXT_SIZE, Math.min(MAX_TEXT_SIZE, Math.round(size)));
}

export function defaultAppSettings(): AppSettingsV1 {
  return {
    version: 1,
    aiPlaybackSpeed: DEFAULT_AI_PLAYBACK_SPEED,
    textSize: DEFAULT_TEXT_SIZE,
    ttsVoiceGender: 'female',
  };
}

function parseTtsVoiceGender(value: unknown): 'female' | 'male' {
  return value === 'male' ? 'male' : 'female';
}

function parseAppSettings(raw: string): AppSettingsV1 | null {
  try {
    const data = JSON.parse(raw) as Partial<AppSettingsV1>;
    if (data.version !== 1) return null;
    return {
      version: 1,
      aiPlaybackSpeed: normalizeAiPlaybackSpeed(data.aiPlaybackSpeed),
      textSize: clampTextSize(
        typeof data.textSize === 'number' ? data.textSize : DEFAULT_TEXT_SIZE
      ),
      ttsVoiceGender: parseTtsVoiceGender(data.ttsVoiceGender),
    };
  } catch {
    return null;
  }
}

async function migrateAiSpeedFromReadingSession(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(READING_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { aiSpeed?: unknown };
    if (typeof data.aiSpeed === 'number' && data.aiSpeed > 0) {
      return normalizeAiPlaybackSpeed(data.aiSpeed);
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function readAppSettings(): Promise<AppSettingsV1> {
  if (settingsMemoryCache) {
    return settingsMemoryCache;
  }

  try {
    const raw = await AsyncStorage.getItem(APP_SETTINGS_KEY);
    if (raw) {
      const parsed = parseAppSettings(raw);
      if (parsed) {
        settingsMemoryCache = parsed;
        return parsed;
      }
    }
  } catch {
    /* fall through */
  }

  const defaults = defaultAppSettings();
  const migratedSpeed = await migrateAiSpeedFromReadingSession();
  if (migratedSpeed != null) {
    defaults.aiPlaybackSpeed = migratedSpeed;
  }
  settingsMemoryCache = defaults;
  return defaults;
}

export async function loadAppSettings(): Promise<AppSettingsV1> {
  try {
    const settings = await readAppSettings();
    const raw = await AsyncStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) {
      await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
    }
    console.log(
      `[SETTINGS] loaded aiSpeed=${settings.aiPlaybackSpeed} font=${settings.textSize}`
    );
    return settings;
  } catch (err) {
    console.warn('[SETTINGS] load failed', err);
    return defaultAppSettings();
  }
}

export async function saveAppSettings(
  patch: Partial<Pick<AppSettingsV1, 'aiPlaybackSpeed' | 'textSize' | 'ttsVoiceGender'>>
): Promise<AppSettingsV1> {
  const current = await readAppSettings();
  const next: AppSettingsV1 = {
    version: 1,
    aiPlaybackSpeed:
      patch.aiPlaybackSpeed != null
        ? normalizeAiPlaybackSpeed(patch.aiPlaybackSpeed)
        : current.aiPlaybackSpeed,
    textSize:
      patch.textSize != null ? clampTextSize(patch.textSize) : current.textSize,
    ttsVoiceGender:
      patch.ttsVoiceGender === 'male' || patch.ttsVoiceGender === 'female'
        ? patch.ttsVoiceGender
        : current.ttsVoiceGender,
  };

  await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
  settingsMemoryCache = next;
  console.log(
    `[SETTINGS] saved aiSpeed=${next.aiPlaybackSpeed} font=${next.textSize} voice=${next.ttsVoiceGender}`
  );
  return next;
}
