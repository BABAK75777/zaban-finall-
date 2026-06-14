import { beforeEach, describe, expect, it } from 'vitest';
import { asyncStore } from './mocks/async-storage';

import {  READING_SESSION_KEY,
  MAX_READING_TEXT_CHARS,
  clearReadingSession,
  loadReadingSession,
  resolveRestoredSentenceIndex,
  saveReadingSession,
  shouldClearReadingSession,
  deriveReadingTextForPersist,
} from '../packages/tts-mobile/src/readingSessionStorage';

const fakeId = (s: string) => `id-${s}`;

describe('readingSessionStorage', () => {
  beforeEach(() => {
    asyncStore.clear();
  });

  it('round-trips save and load', async () => {
    await saveReadingSession({
      version: 1,
      text: 'Alpha. Beta. Gamma.',
      readUnit: '2',
      sentenceIndex: 1,
      sentenceId: 'id-Beta',
      aiSpeed: 1.0,
      savedAt: 1_700_000_000_000,
    });

    const loaded = await loadReadingSession();
    expect(loaded).toEqual({
      version: 1,
      text: 'Alpha. Beta. Gamma.',
      readUnit: '2',
      sentenceIndex: 1,
      sentenceId: 'id-Beta',
      aiSpeed: 1.0,
      savedAt: 1_700_000_000_000,
    });
    expect(asyncStore.get(READING_SESSION_KEY)).toBeTruthy();
  });

  it('clear removes session key', async () => {
    await saveReadingSession({
      version: 1,
      text: 'Hello.',
      readUnit: '1',
      sentenceIndex: 0,
      sentenceId: null,
      aiSpeed: 1,
      savedAt: Date.now(),
    });
    await clearReadingSession();
    expect(asyncStore.has(READING_SESSION_KEY)).toBe(false);
    expect(await loadReadingSession()).toBeNull();
  });

  it('empty text on save clears storage', async () => {
    await saveReadingSession({
      version: 1,
      text: '   ',
      readUnit: '1',
      sentenceIndex: 0,
      sentenceId: null,
      aiSpeed: 1,
      savedAt: Date.now(),
    });
    expect(asyncStore.has(READING_SESSION_KEY)).toBe(false);
  });

  it('corrupt JSON returns null and removes key', async () => {
    asyncStore.set(READING_SESSION_KEY, '{not json');
    expect(await loadReadingSession()).toBeNull();
    expect(asyncStore.has(READING_SESSION_KEY)).toBe(false);
  });

  it('truncates oversized text on save', async () => {
    const huge = 'x'.repeat(MAX_READING_TEXT_CHARS + 100);
    await saveReadingSession({
      version: 1,
      text: huge,
      readUnit: '1',
      sentenceIndex: 0,
      sentenceId: null,
      aiSpeed: 1,
      savedAt: Date.now(),
    });
    const loaded = await loadReadingSession();
    expect(loaded?.text.length).toBe(MAX_READING_TEXT_CHARS);
  });

  it('resolveRestoredSentenceIndex clamps when index too high', () => {
    const sentences = ['A.', 'B.', 'C.'];
    expect(resolveRestoredSentenceIndex(sentences, 99, null, fakeId)).toBe(2);
  });

  it('resolveRestoredSentenceIndex finds by sentenceId when index stale', () => {
    const sentences = ['A.', 'B.', 'C.'];
    expect(
      resolveRestoredSentenceIndex(sentences, 0, 'id-B.', fakeId)
    ).toBe(1);
  });

  it('resolveRestoredSentenceIndex keeps clamped index when id matches', () => {
    const sentences = ['A.', 'B.', 'C.'];
    expect(
      resolveRestoredSentenceIndex(sentences, 2, 'id-C.', fakeId)
    ).toBe(2);
  });

  it('shouldClearReadingSession only when text and sentences are empty', () => {
    expect(shouldClearReadingSession('', 0)).toBe(true);
    expect(shouldClearReadingSession('   ', 0)).toBe(true);
    expect(shouldClearReadingSession('', 3)).toBe(false);
    expect(shouldClearReadingSession('hello', 0)).toBe(false);
    expect(shouldClearReadingSession('hello', 3)).toBe(false);
  });

  it('deriveReadingTextForPersist uses sentences when text state is empty', () => {
    expect(deriveReadingTextForPersist('', ['Alpha one.', 'Beta two.'])).toBe(
      'Alpha one. Beta two.'
    );
    expect(deriveReadingTextForPersist('  ', ['Only.'])).toBe('Only.');
    expect(deriveReadingTextForPersist('Hello.', ['Ignored.'])).toBe('Hello.');
    expect(deriveReadingTextForPersist('', [])).toBe('');
  });

  it('save survives desync when text empty but sentences provided via derive', async () => {
    const derived = deriveReadingTextForPersist('', ['Alpha one.', 'Beta two.']);
    await saveReadingSession({
      version: 1,
      text: derived,
      readUnit: '1',
      sentenceIndex: 1,
      sentenceId: null,
      aiSpeed: 1,
      savedAt: Date.now(),
    });
    const loaded = await loadReadingSession();
    expect(loaded?.text).toBe('Alpha one. Beta two.');
    expect(loaded?.sentenceIndex).toBe(1);
  });
});
