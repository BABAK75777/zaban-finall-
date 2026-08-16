import * as FileSystem from 'expo-file-system/legacy';
import { imageAssetToDataUrl } from '../src/ocr/imageAssetToDataUrl';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/cache/',
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

describe('imageAssetToDataUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses inline base64 when provided', async () => {
    const url = await imageAssetToDataUrl({
      uri: 'file:///photo.jpg',
      width: 100,
      height: 100,
      base64: 'abc123',
      mimeType: 'image/jpeg',
    });
    expect(url).toBe('data:image/jpeg;base64,abc123');
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  it('reads base64 from file uri when picker omits inline base64', async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('fromfile');
    const url = await imageAssetToDataUrl({
      uri: 'file:///photo.jpg',
      width: 100,
      height: 100,
    });
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///photo.jpg', {
      encoding: 'base64',
    });
    expect(url).toBe('data:image/jpeg;base64,fromfile');
  });

  it('copies content uri to cache before reading on Android', async () => {
    (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('fromcontent');
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

    const url = await imageAssetToDataUrl({
      uri: 'content://media/external/images/media/42',
      width: 100,
      height: 100,
    });

    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'content://media/external/images/media/42',
      to: expect.stringMatching(/^\/cache\/ocr-\d+\.jpg$/),
    });
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^\/cache\/ocr-\d+\.jpg$/),
      { encoding: 'base64' }
    );
    expect(url).toBe('data:image/jpeg;base64,fromcontent');
  });

  it('returns null when content uri copy fails', async () => {
    (FileSystem.copyAsync as jest.Mock).mockRejectedValue(new Error('copy denied'));

    const url = await imageAssetToDataUrl({
      uri: 'content://media/external/images/media/42',
      width: 100,
      height: 100,
    });

    expect(url).toBeNull();
  });
});
