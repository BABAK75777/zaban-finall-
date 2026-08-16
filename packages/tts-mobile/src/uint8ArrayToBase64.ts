/**
 * Linear Uint8Array → Base64 for React Native.
 *
 * RN Blob throws:
 *   Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported
 * so Blob + FileReader must not be used for TTS cache writes.
 *
 * Chunked fromCharCode + btoa is O(n), not per-byte concatenation.
 */
const FROM_CHAR_CODE_CHUNK = 0x8000;

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += FROM_CHAR_CODE_CHUNK) {
    const end = Math.min(i + FROM_CHAR_CODE_CHUNK, bytes.length);
    const sub = bytes.subarray(i, end);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}
