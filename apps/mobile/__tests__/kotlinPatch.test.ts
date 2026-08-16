import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.join(__dirname, '..');
const screenStackPath = path.join(
  mobileRoot,
  'node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStack.kt'
);

describe('react-native-screens Kotlin fix (SDK 52 upstream)', () => {
  it('includes removeAt in obtainDrawingOp (upstream, no local patch)', () => {
    const source = fs.readFileSync(screenStackPath, 'utf8');
    expect(source).toContain('drawingOpPool.removeAt(drawingOpPool.lastIndex)');
    expect(source).not.toContain('drawingOpPool.removeLast()');
  });

  it('does not keep obsolete react-native-screens 3.31.1 patch', () => {
    const patchPath = path.join(mobileRoot, 'patches/react-native-screens+3.31.1.patch');
    expect(fs.existsSync(patchPath)).toBe(false);
  });

  it('has no removeFirst/removeLast in ScreenStack obtainDrawingOp path', () => {
    const source = fs.readFileSync(screenStackPath, 'utf8');
    const obtainBlock = source.slice(source.indexOf('private fun obtainDrawingOp'));
    expect(obtainBlock).not.toMatch(/removeFirst\(/);
    expect(obtainBlock).not.toMatch(/removeLast\(/);
  });
});
