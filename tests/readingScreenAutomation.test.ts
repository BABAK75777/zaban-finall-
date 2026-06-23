import { describe, expect, it } from 'vitest';
import { READING_TEST_IDS } from '../apps/mobile/src/ui/testIds';
import {
  VIEWPORT_WIDTHS,
  controlsDockFitsScreenWidth,
  navPillsFitScreenWidth,
  waveformFitsScreenWidth,
} from '../apps/mobile/src/ui/responsiveLayout';

/** Expected accessibility labels used by Maestro flows. */
export const READING_A11Y_LABELS = {
  menu: 'Menu',
  heroPlaceholder: 'Paste or write text to begin reading.',
  shadow: 'Shadow',
  back: 'Back',
  hearAi: 'Hear AI',
  next: 'Next',
  settingsEdit: 'Edit',
} as const;

describe('reading screen testIDs', () => {
  it('exposes stable testIDs for automation', () => {
    expect(READING_TEST_IDS.menu).toBe('reading-menu');
    expect(READING_TEST_IDS.heroSentence).toBe('reading-hero-sentence');
    expect(READING_TEST_IDS.statusHint).toBe('reading-status-hint');
    expect(READING_TEST_IDS.shadow).toBe('reading-shadow');
    expect(READING_TEST_IDS.back).toBe('reading-back');
    expect(READING_TEST_IDS.hearAi).toBe('reading-hear-ai');
    expect(READING_TEST_IDS.next).toBe('reading-next');
    expect(READING_TEST_IDS.settingsEditText).toBe('reading-settings-edit-text');
    expect(READING_TEST_IDS.settingsAi).toBe('reading-settings-ai');
    expect(READING_TEST_IDS.settingsDic).toBe('reading-settings-dic');
    expect(READING_TEST_IDS.settingsAlbum).toBe('reading-settings-album');
    expect(READING_TEST_IDS.settingsCamera).toBe('reading-settings-camera');
    expect(READING_TEST_IDS.topAlbum).toBe('reading-top-album');
    expect(READING_TEST_IDS.topCamera).toBe('reading-top-camera');
    expect(READING_TEST_IDS.settingsDictionaryModal).toBe('reading-settings-dictionary-modal');
  });
});

describe('reading screen layout overflow (320 / 414)', () => {
  for (const width of [VIEWPORT_WIDTHS.smallPhone, VIEWPORT_WIDTHS.largePhone]) {
    it(`primary controls fit at ${width}px`, () => {
      expect(navPillsFitScreenWidth(width)).toBe(true);
      expect(waveformFitsScreenWidth(width)).toBe(true);
      expect(controlsDockFitsScreenWidth(width)).toBe(true);
    });
  }
});
