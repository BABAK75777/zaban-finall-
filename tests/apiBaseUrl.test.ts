import { describe, expect, it } from 'vitest';
import {
  DEFAULT_API_URL,
  isPrivateOrLocalHost,
  resolveApiBaseUrl,
} from '../apps/mobile/src/config/apiBaseUrl';

describe('resolveApiBaseUrl', () => {
  it('uses cloud HTTPS in release builds regardless of .env LAN IP', () => {
    expect(
      resolveApiBaseUrl({
        dev: false,
        configuredUrl: 'http://192.168.86.21:3001',
      })
    ).toBe(DEFAULT_API_URL);
  });

  it('uses cloud when standalone dev APK has no Metro debugger host', () => {
    expect(
      resolveApiBaseUrl({
        dev: true,
        configuredUrl: 'http://192.168.86.21:3001',
        debuggerHost: null,
      })
    ).toBe(DEFAULT_API_URL);
  });

  it('rewrites loopback to debugger host in dev', () => {
    expect(
      resolveApiBaseUrl({
        dev: true,
        configuredUrl: 'http://127.0.0.1:3001',
        debuggerHost: '192.168.86.21',
      })
    ).toBe('http://192.168.86.21:3001');
  });

  it('keeps LAN IP in dev when Metro debugger matches configured host', () => {
    expect(
      resolveApiBaseUrl({
        dev: true,
        configuredUrl: 'http://192.168.86.21:3001',
        debuggerHost: '192.168.86.21',
      })
    ).toBe('http://192.168.86.21:3001');
  });

  it('keeps public HTTPS URL in dev', () => {
    expect(
      resolveApiBaseUrl({
        dev: true,
        configuredUrl: DEFAULT_API_URL,
      })
    ).toBe(DEFAULT_API_URL);
  });
});

describe('isPrivateOrLocalHost', () => {
  it('detects loopback and LAN addresses', () => {
    expect(isPrivateOrLocalHost('127.0.0.1')).toBe(true);
    expect(isPrivateOrLocalHost('192.168.1.10')).toBe(true);
    expect(isPrivateOrLocalHost('10.0.0.5')).toBe(true);
    expect(isPrivateOrLocalHost('172.16.0.1')).toBe(true);
  });

  it('allows public hostnames', () => {
    expect(isPrivateOrLocalHost('zaban-api-875817275251.europe-west1.run.app')).toBe(false);
  });
});

/** Mirrors ReadingScreen syncSentencesFromText index policy. */
function resolveSentenceIndexAfterTextSync(
  prevIndex: number,
  prevFirst: string,
  nextFirst: string,
  nextCount: number,
  forceResetIndex: boolean
): number {
  const textReplaced =
    prevFirst.trim().length > 0 && nextFirst.trim().length > 0 && prevFirst.trim() !== nextFirst.trim();
  const shouldReset = forceResetIndex || textReplaced;
  if (shouldReset || nextCount === 0) return 0;
  return Math.min(prevIndex, nextCount - 1);
}

describe('sentence index after text sync', () => {
  it('resets to 0 when AI generates entirely new text', () => {
    expect(
      resolveSentenceIndexAfterTextSync(12, 'Old first sentence.', 'Brand new opening.', 8, true)
    ).toBe(0);
  });

  it('resets to 0 when first sentence changes (full manual replace)', () => {
    expect(
      resolveSentenceIndexAfterTextSync(12, 'Old first sentence.', 'Brand new opening.', 8, false)
    ).toBe(0);
  });

  it('keeps index when only later sentences were edited', () => {
    expect(
      resolveSentenceIndexAfterTextSync(
        12,
        'Same opening sentence.',
        'Same opening sentence.',
        15,
        false
      )
    ).toBe(12);
  });

  it('clamps index when new text has fewer sentences', () => {
    expect(
      resolveSentenceIndexAfterTextSync(12, 'Same opening.', 'Same opening.', 5, false)
    ).toBe(4);
  });
});
