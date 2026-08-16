import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';

function extensionForMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('heic') || mime.includes('heif')) return 'heic';
  return 'jpg';
}

function needsUriCopy(uri: string): boolean {
  return (
    uri.startsWith('content://') ||
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://')
  );
}

async function readUriAsBase64(uri: string, mime: string): Promise<string | null> {
  let readUri = uri;
  let cachePath: string | null = null;

  if (Platform.OS === 'android' && needsUriCopy(uri)) {
    cachePath = `${FileSystem.cacheDirectory ?? ''}ocr-${Date.now()}.${extensionForMime(mime)}`;
    if (!cachePath || !FileSystem.cacheDirectory) {
      console.log('[OCR] cacheDirectory unavailable for content uri copy');
      return null;
    }
    try {
      await FileSystem.copyAsync({ from: uri, to: cachePath });
      readUri = cachePath;
      console.log(`[OCR] copied picker uri to cache uri=${cachePath}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log(`[OCR] failed copy uri to cache reason=${reason}`);
      return null;
    }
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(readUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64) {
      console.log('[OCR] read base64 returned empty string');
      return null;
    }
    return base64;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.log(`[OCR] failed read base64 reason=${reason} uri=${readUri.slice(0, 64)}`);
    return null;
  } finally {
    if (cachePath) {
      void FileSystem.deleteAsync(cachePath, { idempotent: true }).catch(() => {});
    }
  }
}

/**
 * Build a data URL for OCR from a picker asset.
 * Falls back to reading base64 from the file URI when the picker omits inline base64.
 */
export async function imageAssetToDataUrl(asset: ImagePickerAsset): Promise<string | null> {
  const mime = asset.mimeType ?? 'image/jpeg';

  if (asset.base64?.length) {
    console.log(`[OCR] using inline base64 length=${asset.base64.length}`);
    return `data:${mime};base64,${asset.base64}`;
  }

  if (!asset.uri) {
    console.log('[OCR] asset missing uri and inline base64');
    return null;
  }

  console.log(
    `[OCR] base64 missing from picker; reading from uri=${asset.uri.slice(0, 64)} mime=${mime}`
  );
  const base64 = await readUriAsBase64(asset.uri, mime);
  if (!base64) {
    return null;
  }
  return `data:${mime};base64,${base64}`;
}
