import { describe, expect, it } from '@jest/globals';
import { getTheme, type ThemeId } from '../src/theme/themes';
import {
  SETTINGS_AI_SPEED_MAX,
  SETTINGS_AI_SPEED_MIN,
  SETTINGS_PANEL_LAYOUT,
  SETTINGS_TEXT_SIZE_MAX,
  SETTINGS_TEXT_SIZE_MIN,
  formatSettingsHeaderTitle,
  getSettingsSliderRanges,
} from '../src/ui/settingsPanelLayout';
import { AI_SPEED_SLIDER_STEP } from '../src/settings/aiSpeedSettings';

const THEME_IDS: ThemeId[] = ['dark', 'light', 'cream'];
const VIEWPORT_WIDTHS = [320, 720, 1080];

describe('settingsPanelLayout', () => {
  it('centers Settings and app version on one header line', () => {
    expect(formatSettingsHeaderTitle('Mamlio v1.2.1')).toBe('Settings · Mamlio v1.2.1');
  });

  it('limits AI speed slider to 0.5–1.2', () => {
    expect(SETTINGS_AI_SPEED_MIN).toBe(0.5);
    expect(SETTINGS_AI_SPEED_MAX).toBe(1.2);
  });

  it('keeps text size range 22–48', () => {
    expect(SETTINGS_TEXT_SIZE_MIN).toBe(22);
    expect(SETTINGS_TEXT_SIZE_MAX).toBe(48);
  });

  it.each(VIEWPORT_WIDTHS)('uses identical slider ranges at width %i', (width) => {
    const narrow = getSettingsSliderRanges(320);
    const wide = getSettingsSliderRanges(width);
    expect(wide).toEqual(narrow);
  });

  it('hides voice type section label', () => {
    expect(SETTINGS_PANEL_LAYOUT.voiceTypeLabelHidden).toBe(true);
  });

  it('shows AI speed micro label and fine slider step', () => {
    expect(SETTINGS_PANEL_LAYOUT.aiSpeedLabelHidden).toBe(false);
    expect(SETTINGS_PANEL_LAYOUT.aiSpeedSliderStep).toBe(AI_SPEED_SLIDER_STEP);
    expect(AI_SPEED_SLIDER_STEP).toBe(0.05);
  });

  it.each(THEME_IDS)('exposes slider colors for %s theme', (themeId) => {
    const theme = getTheme(themeId);
    expect(theme.slider.fill).toBeTruthy();
    expect(theme.slider.track).toBeTruthy();
    expect(theme.slider.border).toBeTruthy();
    expect(theme.textDim).toBeTruthy();
    expect(theme.textMuted).toBeTruthy();
  });
});
