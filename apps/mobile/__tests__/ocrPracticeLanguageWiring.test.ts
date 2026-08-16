import fs from 'fs';
import path from 'path';

const indexPath = path.join(__dirname, '..', 'app', 'index.tsx');

describe('Camera/Gallery OCR central guard wiring', () => {
  const indexSrc = fs.readFileSync(indexPath, 'utf8');

  it('handlePhotoOcr uses central Practice-language validation', () => {
    const start = indexSrc.indexOf('const handlePhotoOcr = useCallback');
    expect(start).toBeGreaterThan(-1);
    const end = indexSrc.indexOf('const handleAlbumPhotoPress = useCallback', start);
    expect(end).toBeGreaterThan(start);
    const block = indexSrc.slice(start, end);

    expect(block).toContain('validatePracticeLanguageForOcrEntry');
    expect(block).toContain('validateOcrContentForPractice');
    expect(block).toContain('showInProgressLanguageDialog');
    expect(block).toContain('showLanguageMismatchDialog');
  });

  it('Camera and Gallery both route through handlePhotoOcr', () => {
    expect(indexSrc).toContain("void handlePhotoOcr('library')");
    expect(indexSrc).toContain("void handlePhotoOcr('camera')");
  });

  it('blocks OCR commit on mismatch before handleTextChange', () => {
    const start = indexSrc.indexOf('const handlePhotoOcr = useCallback');
    const end = indexSrc.indexOf('const handleAlbumPhotoPress = useCallback', start);
    const block = indexSrc.slice(start, end);
    const mismatchIdx = block.indexOf('LANGUAGE_MISMATCH');
    const applyIdx = block.indexOf('handleTextChange(extracted)');
    expect(mismatchIdx).toBeGreaterThan(-1);
    expect(applyIdx).toBeGreaterThan(-1);
    expect(mismatchIdx).toBeLessThan(applyIdx);
  });
});
