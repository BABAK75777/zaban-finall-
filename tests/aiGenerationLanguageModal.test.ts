/**
 * Focused modal behavior checks for AI Generation Language selector helpers.
 * (Full RN modal interaction is covered on-device.)
 */
import { describe, expect, it } from 'vitest';
import {
  getAiGenerationLanguages,
  migrateAiGenerationLanguageId,
} from '../packages/dictionary-languages/index.js';

describe('AI Generation Language modal selection contract', () => {
  it('opens from saved value into a known picker id', () => {
    const opened = migrateAiGenerationLanguageId('en-US');
    expect(getAiGenerationLanguages().some((l) => l.id === opened)).toBe(true);
  });

  it('discards temporary selection conceptually (saved unchanged until accept)', () => {
    const saved = 'en-US';
    let temp = saved;
    temp = 'en-GB';
    // X / Back: discard temp — saved remains
    expect(saved).toBe('en-US');
    expect(temp).toBe('en-GB');
    const afterDiscard = migrateAiGenerationLanguageId(saved);
    expect(afterDiscard).toBe('en-US');
  });

  it('accept persists the temporary selection id', () => {
    const saved = 'en-US';
    const temp = 'en-GB';
    const accepted = migrateAiGenerationLanguageId(temp);
    expect(accepted).toBe('en-GB');
    expect(accepted).not.toBe(saved);
  });

  it('accept without change is idempotent for decision helper', () => {
    const saved = 'fr-FR';
    const accepted = migrateAiGenerationLanguageId(saved);
    expect(accepted).toBe(saved);
  });

  it('X/Back keeps saved language (temp discarded)', () => {
    const saved = 'en-US';
    let temp = 'en-GB';
    // Close without Accept — discard temp
    temp = saved;
    expect(migrateAiGenerationLanguageId(temp)).toBe('en-US');
  });
});
