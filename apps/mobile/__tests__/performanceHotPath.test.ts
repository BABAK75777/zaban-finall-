import fs from 'fs';
import path from 'path';

const indexPath = path.join(__dirname, '..', 'app', 'index.tsx');
const cachePath = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'packages',
  'tts-mobile',
  'src',
  'sentenceAudioCache.ts'
);
const longTextPath = path.join(__dirname, '..', 'src', 'utils', 'longTextProcessing.ts');
const playerPath = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'packages',
  'tts-mobile',
  'src',
  'MobileAudioPlayer.ts'
);

describe('performance freeze regressions (proven hot paths)', () => {
  const indexSrc = fs.readFileSync(indexPath, 'utf8');

  it('does not flush persistReadingSession on every text-effect cleanup (keystroke)', () => {
    // The text debounce effect must clearTimeout only — flushing persist in cleanup
    // ran on every keystroke and defeated the debounce.
    const start = indexSrc.indexOf('// Text typing');
    expect(start).toBeGreaterThan(-1);
    const block = indexSrc.slice(start, start + 700);
    expect(block).toContain('clearTimeout(id)');
    expect(block).not.toMatch(/clearTimeout\(id\);\s*void persistReadingSession\(\)/);
  });

  it('does not re-persist the full reading session on aiSpeed / ttsVoiceType changes', () => {
    const start = indexSrc.indexOf('// Position / unit');
    expect(start).toBeGreaterThan(-1);
    const block = indexSrc.slice(start, start + 450);
    expect(block).toContain('[readUnit, sentenceIndex, persistReadingSession]');
    // Dependency array must not include those fields (comments may mention them).
    expect(block).toMatch(/\}, \[readUnit, sentenceIndex, persistReadingSession\]\);/);
    expect(block).not.toMatch(/\[([^\]]*aiSpeed[^\]]*)\]/);
    expect(block).not.toMatch(/\[([^\]]*ttsVoiceType[^\]]*)\]/);
  });

  it('persistReadingSession does not call commitReadingText (avoids setState during persist)', () => {
    const start = indexSrc.indexOf('const persistReadingSession = useCallback');
    const end = indexSrc.indexOf('}, []);', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = indexSrc.slice(start, end);
    expect(body).not.toMatch(/parts\s*=\s*commitReadingText\s*\(/);
    expect(body).toContain('createSafeReadingChunks');
  });

  it('sentence cache write does not use per-byte string concatenation', () => {
    const src = fs.readFileSync(cachePath, 'utf8');
    expect(src).toContain('uint8ArrayToBase64');
    expect(src).not.toMatch(/for \(let i = 0; i < audioBytes\.length; i\+\+\) \{\s*binary \+= /);
    expect(src).not.toMatch(/new Blob\(\[/);
  });

  it('hot-path LONG_TEXT / AI_SPEED logs are gated behind __DEV__', () => {
    const longTextSrc = fs.readFileSync(longTextPath, 'utf8');
    expect(longTextSrc).toMatch(/if \(__DEV__\)[\s\S]*\[LONG_TEXT\] inputLength/);
    const playerSrc = fs.readFileSync(playerPath, 'utf8');
    expect(playerSrc).toMatch(/if \(__DEV__\)[\s\S]*\[AI_SPEED\] setPlaybackRate/);
  });

  it('debounced sentence sync does not also persist (single persist owner)', () => {
    const start = indexSrc.indexOf('// Debounced UI chunk sync only');
    expect(start).toBeGreaterThan(-1);
    const block = indexSrc.slice(start, start + 350);
    expect(block).toContain('syncSentencesFromTextAsync');
    expect(block).not.toContain('persistReadingSession');
  });
});
