import { DARK_TOKENS } from '../src/theme/darkTokens';
import { getTheme } from '../src/theme/themes';

describe('dark theme colors', () => {
  const dark = getTheme('dark');

  /** Neutral black/gray backgrounds removed in favor of dark slate-navy. */
  const removedNeutrals = ['121212', '1C1C1E', '2C2C2E'];

  it('does not use legacy neutral black/gray background hex', () => {
    const serialized = JSON.stringify({ ...DARK_TOKENS, dark }).toUpperCase();
    for (const hex of removedNeutrals) {
      expect(serialized).not.toContain(hex);
    }
  });

  it('uses dark slate-navy for main backgrounds', () => {
    expect(DARK_TOKENS.backgroundPrimary).toBe('#151B28');
    expect(DARK_TOKENS.backgroundSecondary).toBe('#1C2433');
    expect(DARK_TOKENS.backgroundTertiary).toBe('#2A3344');
    expect(dark.bg).toBe('#151B28');
  });

  it('uses slate-tinted glass and card overlays', () => {
    expect(dark.glass.bg).toBe('rgba(21, 27, 40, 0.82)');
    expect(dark.card).toBe('rgba(42, 51, 68, 0.88)');
  });
});
