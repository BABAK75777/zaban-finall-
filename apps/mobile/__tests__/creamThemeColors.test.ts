import { getTheme } from '../src/theme/themes';

describe('cream theme colors', () => {
  const cream = getTheme('cream');

  /** Lavender/purple hex values that were removed from cream theme. */
  const removedPurples = ['A898B0', 'A898C0', '9488B0', '6B58B0'];

  it('does not use legacy purple/lavender accent hex on cream', () => {
    const serialized = JSON.stringify(cream).toUpperCase();
    for (const hex of removedPurples) {
      expect(serialized).not.toContain(hex);
    }
  });

  it('uses slate gray for waveform, mic, and selection', () => {
    expect(cream.waveform.active).toBe('#7A8494');
    expect(cream.buttons.micBg).toBe('#8A94A4');
    expect(cream.selection.bg).toBe('#5E6878');
  });

  it('keeps warm gold accent unchanged', () => {
    expect(cream.accent).toBe('#9A7340');
  });
});
