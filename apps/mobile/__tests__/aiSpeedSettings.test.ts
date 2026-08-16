import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clampUiSpeed,
  formatUiSpeed,
  MAX_UI_AI_SPEED,
  MIN_UI_AI_SPEED,
  resolveAiPlaybackSpeed,
  uiSpeedToRuntimeRate,
} from '@zaban/tts-mobile';
import {
  AI_SPEED_SLIDER_STEP,
  formatAiSpeedLabel,
  listAiSpeedSliderValues,
  resolvePlaybackRateForVoice,
  runtimeRateForUiSpeed,
} from '../src/settings/aiSpeedSettings';
import {
  clearAppSettingsCacheForTests,
  loadAppSettings,
  saveAppSettings,
} from '../src/settings/appSettingsStorage';

describe('aiSpeedSettings', () => {
  it('formats micro label with one decimal', () => {
    expect(formatAiSpeedLabel(1)).toBe('AI SPEED · 1.0x');
    expect(formatAiSpeedLabel(0.75)).toBe('AI SPEED · 0.8x');
  });

  it('maps UI speed to audibly distinct runtime rates', () => {
    const slow = runtimeRateForUiSpeed(MIN_UI_AI_SPEED);
    const normal = runtimeRateForUiSpeed(1);
    const fast = runtimeRateForUiSpeed(MAX_UI_AI_SPEED);

    expect(slow).toBe(0.5);
    expect(normal).toBe(0.85);
    expect(fast).toBe(1.08);
    expect(fast - slow).toBeGreaterThan(0.5);
  });

  it('increases monotonically across slider steps', () => {
    const rates = listAiSpeedSliderValues().map((ui) => uiSpeedToRuntimeRate(ui));
    for (let i = 1; i < rates.length; i += 1) {
      expect(rates[i]).toBeGreaterThanOrEqual(rates[i - 1]!);
    }
  });

  it('uses finer 0.05 UI steps for smooth dragging', () => {
    const values = listAiSpeedSliderValues();
    expect(values[0]).toBe(MIN_UI_AI_SPEED);
    expect(values[values.length - 1]).toBe(MAX_UI_AI_SPEED);
    expect(values.length).toBeGreaterThan(8);
    expect(values[1]! - values[0]!).toBeCloseTo(AI_SPEED_SLIDER_STEP, 5);
  });

  it.each(['male', 'female'] as const)(
    'applies same playback rate for %s voice',
    (voiceType) => {
      expect(resolvePlaybackRateForVoice(0.6, voiceType)).toBe(
        resolvePlaybackRateForVoice(0.6, voiceType === 'male' ? 'female' : 'male')
      );
      expect(resolvePlaybackRateForVoice(1.1, voiceType)).toBe(
        runtimeRateForUiSpeed(1.1)
      );
    }
  );

  it('persists speed after rapid slider changes without race loss', async () => {
    await AsyncStorage.clear();
    clearAppSettingsCacheForTests();

    await saveAppSettings({ aiPlaybackSpeed: 0.55 });
    await saveAppSettings({ aiPlaybackSpeed: 0.6 });
    await saveAppSettings({ aiPlaybackSpeed: 0.65 });
    await saveAppSettings({ aiPlaybackSpeed: 0.7 });

    const loaded = await loadAppSettings();
    expect(loaded.aiPlaybackSpeed).toBe(0.7);
  });

  it('clamps persisted values to UI range 0.5–1.2', async () => {
    await AsyncStorage.clear();
    clearAppSettingsCacheForTests();

    await saveAppSettings({ aiPlaybackSpeed: 1.5 });
    const loaded = await loadAppSettings();
    expect(loaded.aiPlaybackSpeed).toBe(MAX_UI_AI_SPEED);

    clearAppSettingsCacheForTests();
    await saveAppSettings({ aiPlaybackSpeed: 0.1 });
    const slow = await loadAppSettings();
    expect(slow.aiPlaybackSpeed).toBe(MIN_UI_AI_SPEED);
  });

  it('keeps resolveAiPlaybackSpeed in sync with slider value', () => {
    for (const ui of [0.5, 0.75, 1, 1.05, 1.2]) {
      const clamped = clampUiSpeed(ui);
      expect(resolveAiPlaybackSpeed(clamped).uiSpeed).toBe(clamped);
      expect(formatUiSpeed(clamped)).toMatch(/^\d\.\d$/);
    }
  });
});
