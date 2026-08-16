/** Stable testIDs for reading-screen automation (Maestro, jest-expo). */
export const READING_TEST_IDS = {
  menu: 'reading-menu',
  heroSentence: 'reading-hero-sentence',
  statusHint: 'reading-status-hint',
  shadow: 'reading-shadow',
  back: 'reading-back',
  hearAi: 'reading-hear-ai',
  next: 'reading-next',
  controlsDock: 'reading-controls-dock',
  adBanner: 'reading-ad-banner',
  adBannerContent: 'reading-ad-banner-content',
  adBannerSpacer: 'reading-ad-banner-spacer',
  adBannerReservedSlot: 'reading-ad-banner-reserved-slot',
  adSafeGap: 'reading-ad-safe-gap',
  settingsPanel: 'reading-settings-panel',
  settingsClose: 'reading-settings-close',
  settingsEditText: 'reading-settings-edit-text',
  settingsAi: 'reading-settings-ai',
  settingsDic: 'reading-settings-dic',
  settingsAlbum: 'reading-settings-album',
  settingsCamera: 'reading-settings-camera',
  settingsVersion: 'reading-settings-version',
  settingsHelp: 'reading-settings-help',
  settingsLanguages: 'reading-settings-languages',
  settingsAiLanguage: 'reading-settings-ai-language',
  settingsAiSpeedLabel: 'reading-settings-ai-speed-label',
  settingsAiSpeedSlider: 'reading-settings-ai-speed-slider',
  topCamera: 'reading-top-camera',
  topDic: 'reading-top-dic',
  photoSourceModal: 'reading-photo-source-modal',
  photoSourceClose: 'reading-photo-source-close',
  photoSourcePhotos: 'reading-photo-source-photos',
  photoSourceCamera: 'reading-photo-source-camera',
  photoSourceLibrary: 'reading-photo-source-library',
  settingsDictionaryModal: 'reading-settings-dictionary-modal',
  settingsDictionaryClose: 'reading-settings-dictionary-close',
  practiceText: 'reading-practice-text',
  practiceTextClose: 'reading-practice-text-close',
  practiceTextInput: 'reading-practice-text-input',
  aiModal: 'reading-ai-modal',
  aiModalClose: 'reading-ai-modal-close',
  aiModalDismiss: 'reading-ai-modal-dismiss',
  aiModalGenerate: 'reading-ai-modal-generate',
  aiModalPromptFooter: 'reading-ai-modal-request-section',
  /** Your Request + TextInput + Generate (alias of aiModalPromptFooter). */
  aiModalRequestSection: 'reading-ai-modal-request-section',
  aiModalFormScroll: 'reading-ai-modal-form-scroll',
  aiModalSettingsScroll: 'reading-ai-modal-settings-scroll',
  aiModalSettingsSection: 'reading-ai-modal-settings-section',
  aiPromptInput: 'reading-ai-prompt-input',
  aiCefrSlider: 'reading-ai-cefr-slider',
  aiCefrLabel: (level: string) => `reading-ai-cefr-${level}`,
  themeDark: 'reading-theme-dark',
  themeLight: 'reading-theme-light',
  themeCream: 'reading-theme-cream',
  updateModal: 'update-available-modal',
  updateModalClose: 'update-available-close',
  updateModalUpdate: 'update-available-update',
} as const;

export function readUnitTestId(value: string): string {
  return `reading-read-unit-${value.replace('/', '-')}`;
}

export function voiceTestId(voice: 'female' | 'male'): string {
  return `reading-voice-${voice}`;
}

export function themeTestId(id: 'dark' | 'light' | 'cream'): string {
  switch (id) {
    case 'dark':
      return READING_TEST_IDS.themeDark;
    case 'light':
      return READING_TEST_IDS.themeLight;
    case 'cream':
      return READING_TEST_IDS.themeCream;
  }
}
