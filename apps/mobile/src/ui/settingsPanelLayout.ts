import { MAX_UI_AI_SPEED, MIN_UI_AI_SPEED } from '@zaban/tts-mobile';

export const SETTINGS_TEXT_SIZE_MIN = 22;
export const SETTINGS_TEXT_SIZE_MAX = 48;
export const SETTINGS_TEXT_SIZE_STEP = 2;

export const SETTINGS_AI_SPEED_MIN = MIN_UI_AI_SPEED;
export const SETTINGS_AI_SPEED_MAX = MAX_UI_AI_SPEED;
export const SETTINGS_AI_SPEED_STEP = 0.1;

/** Layout tokens are fixed — settings panel does not reflow by screen width. */
export const SETTINGS_PANEL_LAYOUT = {
  headerCentered: true,
  voiceTypeLabelHidden: true,
  aiSpeedLabelHidden: false,
  aiSpeedSliderStep: 0.05,
  aiSpeedSliderMicro: true,
  textSizeHeadingLarge: true,
  textSizeSliderMicro: true,
} as const;

export function formatSettingsHeaderTitle(appVersionLabel: string): string {
  return `Settings · ${appVersionLabel}`;
}

/** Confirms slider ranges stay identical regardless of viewport width. */
export function getSettingsSliderRanges(_viewportWidth: number) {
  return {
    aiSpeed: { min: SETTINGS_AI_SPEED_MIN, max: SETTINGS_AI_SPEED_MAX },
    textSize: { min: SETTINGS_TEXT_SIZE_MIN, max: SETTINGS_TEXT_SIZE_MAX },
  };
}
