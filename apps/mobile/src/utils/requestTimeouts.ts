/** Shared request timeouts (ms) — kept free of TTS/native imports for testability. */
export const REQUEST_TIMEOUT_MS = {
  tts: 45_000,
  ai: 90_000,
  ocr: 60_000,
  dictionary: 30_000,
} as const;
