import { uint8ArrayToBase64 } from '../../../packages/tts-mobile/src/uint8ArrayToBase64';

describe('uint8ArrayToBase64 (AI/TTS cache write)', () => {
  it('encodes Uint8Array without Blob/ArrayBuffer construction', () => {
    const bytes = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 1, 2, 3, 250, 251]);
    expect(uint8ArrayToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
  });

  it('does not throw the RN Blob ArrayBufferView error', () => {
    const OriginalBlob = global.Blob;
    // @ts-expect-error simulate React Native Blob
    global.Blob = class {
      constructor() {
        throw new Error(
          "Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported"
        );
      }
    };

    try {
      const bytes = new Uint8Array(4096);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = i % 256;
      }
      expect(uint8ArrayToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    } finally {
      global.Blob = OriginalBlob;
    }
  });
});
