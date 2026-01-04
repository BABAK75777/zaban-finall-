/**
 * Hashing utilities for TTS chunks
 * Isomorphic implementation that works in both browser and Node.js
 */

/**
 * Type guard to check if we're in a browser environment with WebCrypto
 */
function hasWebCrypto(): boolean {
  return typeof globalThis !== 'undefined' && 
         typeof globalThis.crypto !== 'undefined' && 
         'subtle' in globalThis.crypto &&
         typeof globalThis.TextEncoder !== 'undefined';
}

/**
 * Compute SHA1 hash for chunk (isomorphic: works in browser and Node.js)
 * 
 * - Browser: Uses WebCrypto API (globalThis.crypto.subtle)
 * - Node.js: Uses node:crypto createHash('sha1')
 * 
 * @param input - String to hash
 * @returns Promise resolving to lowercase hex SHA1 hash
 */
export async function sha1Hash(input: string): Promise<string> {
  // Browser path: Use WebCrypto API
  if (hasWebCrypto()) {
    const encoder = new globalThis.TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Node.js path: Use node:crypto
  // Dynamic import to avoid bundling node:crypto in browser builds
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error - node:crypto is only available in Node.js runtime, not in browser
    const crypto = await import('node:crypto');
    return crypto.createHash('sha1').update(input, 'utf8').digest('hex');
  } catch (error) {
    // Fallback: if dynamic import fails (shouldn't happen in Node), throw helpful error
    throw new Error(
      'SHA1 hashing failed: WebCrypto not available and node:crypto import failed. ' +
      'Are you running in a browser without WebCrypto support or Node.js without crypto module?'
    );
  }
}

/**
 * Generate hash for a chunk with all TTS parameters
 */
export async function generateChunkHash(
  text: string,
  voiceId: string = 'en-US-Standard-C',
  preset: string = 'default',
  speed: number = 1.0,
  pitch: number = 0.0,
  format: string = 'mp3',
  sampleRate: number = 24000
): Promise<string> {
  const normalized = text.trim().replace(/\s+/g, ' ').replace(/\n+/g, '\n');
  const hashInput = `${normalized}|${voiceId}|${preset}|${speed}|${pitch}|${format}|${sampleRate}`;
  return sha1Hash(hashInput);
}

/**
 * Generate session key from full text and options
 */
export async function generateSessionKey(
  fullText: string,
  voiceId: string,
  speed: number,
  format: string
): Promise<string> {
  const normalized = fullText.trim().replace(/\s+/g, ' ').replace(/\n+/g, '\n');
  const input = `${normalized}|${voiceId}|${speed}|${format}`;
  return sha1Hash(input);
}

