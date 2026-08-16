import fs from 'node:fs';

export const SPLASH_IMAGE_WIDTH_MDPI = 280;

export const MIPMAP_LAUNCHER_SIZES = {
  'mipmap-mdpi': { launcher: 48, foreground: 108 },
  'mipmap-hdpi': { launcher: 72, foreground: 162 },
  'mipmap-xhdpi': { launcher: 96, foreground: 216 },
  'mipmap-xxhdpi': { launcher: 144, foreground: 324 },
  'mipmap-xxxhdpi': { launcher: 192, foreground: 432 },
} as const;

export const SPLASH_DRAWABLE_MULTIPLIERS = {
  'drawable-mdpi': 1,
  'drawable-hdpi': 1.5,
  'drawable-xhdpi': 2,
  'drawable-xxhdpi': 3,
  'drawable-xxxhdpi': 4,
} as const;

export type PngInfo = {
  width: number;
  height: number;
  colorType: number;
};

/** PNG IHDR: width/height at 16–23, color type at byte 25. */
export function readPngInfo(filePath: string): PngInfo {
  const header = fs.readFileSync(filePath).subarray(0, 26);
  if (header.length < 26) {
    throw new Error(`Invalid PNG header: ${filePath}`);
  }
  return {
    width: header.readUInt32BE(16),
    height: header.readUInt32BE(20),
    colorType: header[25]!,
  };
}

export function pngHasAlphaChannel(filePath: string): boolean {
  return readPngInfo(filePath).colorType === 6;
}

export function pngIsFullyOpaque(filePath: string): boolean {
  const { colorType } = readPngInfo(filePath);
  return colorType === 2 || colorType === 6;
}

function isPng(buffer: Buffer): boolean {
  return buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50;
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

/** Read width/height from PNG IHDR or JPEG SOF marker. */
export function readImageDimensions(filePath: string): { width: number; height: number } {
  const buffer = fs.readFileSync(filePath);

  if (isPng(buffer)) {
    const { width, height } = readPngInfo(filePath);
    return { width, height };
  }

  if (isJpeg(buffer)) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1]!;
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      const segmentLength = buffer.readUInt16BE(offset + 2);
      offset += 2 + segmentLength;
    }
    throw new Error(`JPEG dimensions not found: ${filePath}`);
  }

  throw new Error(`Unsupported image format: ${filePath}`);
}

export function expectedSplashBitmapHeight(width: number, sourceAspect: number): number {
  return Math.max(1, Math.floor(width * sourceAspect));
}
