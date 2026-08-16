import { BRANDING } from '../config/branding';

/** Shown when the how-to website cannot load (offline / error). */
export const ONBOARDING_FALLBACK_TITLE = `Welcome to ${BRANDING.appName}`;

export const ONBOARDING_FALLBACK_BODY = [
  'Paste or type text on the Reading screen, then tap AI to hear it spoken aloud.',
  'Use Shadow to record your voice and compare it with the AI playback.',
  'Tap words in the sentence to look them up and save vocabulary for practice.',
  'Open the menu to adjust voice, speed, themes, and photo OCR.',
  'When you are ready, tap “Start using Mamlio” below to open the AI practice screen.',
].join('\n\n');
