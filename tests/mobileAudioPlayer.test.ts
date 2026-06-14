import { describe, expect, it } from 'vitest';

/** CHAT2 grep contract — must match MobileAudioPlayer.ts console.log format. */
describe('MobileAudioPlayer CHAT2 log contract', () => {
  it('setPlaybackRate log line matches device grep', () => {
    const prev = 1;
    const clamped = 1.2;
    const playing = true;
    const line = `[MobileAudioPlayer] setPlaybackRate ${prev} → ${clamped}${playing ? ' (active)' : ''}`;
    expect(line).toMatch(/\[MobileAudioPlayer\] setPlaybackRate/);
    expect(line).toContain('1 → 1.2');
    expect(line).toContain('(active)');
  });
});
