import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_UI_AI_SPEED } from '@zaban/tts-mobile';
import { READING_SESSION_KEY } from '@zaban/tts-mobile';
import {
  APP_SETTINGS_KEY,
  DEFAULT_TEXT_SIZE,
  clearAppSettingsCacheForTests,
  loadAppSettings,
  saveAppSettings,
} from '../src/settings/appSettingsStorage';

describe('appSettingsStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    clearAppSettingsCacheForTests();
  });

  it('loads and saves AI speed', async () => {
    const initial = await loadAppSettings();
    expect(initial.aiPlaybackSpeed).toBe(1);

    const saved = await saveAppSettings({ aiPlaybackSpeed: 1.1 });
    expect(saved.aiPlaybackSpeed).toBe(1.1);

    const reloaded = await loadAppSettings();
    expect(reloaded.aiPlaybackSpeed).toBe(1.1);
  });

  it('clamps saved AI speed to max UI range', async () => {
    const saved = await saveAppSettings({ aiPlaybackSpeed: 1.3 });
    expect(saved.aiPlaybackSpeed).toBe(MAX_UI_AI_SPEED);
  });

  it('loads and saves font size', async () => {
    await saveAppSettings({ textSize: 36 });
    const reloaded = await loadAppSettings();
    expect(reloaded.textSize).toBe(36);
  });

  it('migrates AI speed from reading session on first load', async () => {
    await AsyncStorage.setItem(
      READING_SESSION_KEY,
      JSON.stringify({ version: 1, text: 'hello', aiSpeed: 1.4 })
    );

    const settings = await loadAppSettings();
    expect(settings.aiPlaybackSpeed).toBe(MAX_UI_AI_SPEED);
    expect(settings.textSize).toBe(DEFAULT_TEXT_SIZE);
  });

  it('persists TTS voice gender across restart', async () => {
    const initial = await loadAppSettings();
    expect(initial.ttsVoiceGender).toBe('female');

    await saveAppSettings({ ttsVoiceGender: 'male' });
    clearAppSettingsCacheForTests();
    const reloaded = await loadAppSettings();
    expect(reloaded.ttsVoiceGender).toBe('male');
  });

  it('changing gender does not reset speed or text size', async () => {
    await saveAppSettings({ aiPlaybackSpeed: 1.1, textSize: 32 });
    await saveAppSettings({ ttsVoiceGender: 'male' });
    const reloaded = await loadAppSettings();
    expect(reloaded.ttsVoiceGender).toBe('male');
    expect(reloaded.aiPlaybackSpeed).toBe(1.1);
    expect(reloaded.textSize).toBe(32);
  });
});
