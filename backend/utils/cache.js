/**
 * Secure cache utilities with user isolation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_CACHE_DIR = path.join(__dirname, '..', 'cache', 'tts');

/**
 * Get user-specific cache directory
 */
export function getUserCacheDir(userId) {
  const userDir = path.join(BASE_CACHE_DIR, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

/**
 * Get cache file path for a user
 */
export function getCacheFilePath(userId, hash, format = 'mp3') {
  const userDir = getUserCacheDir(userId);
  return path.join(userDir, `${hash}.${format}`);
}

/**
 * Check if cache file exists for user
 */
export function cacheExists(userId, hash, format = 'mp3') {
  const cachePath = getCacheFilePath(userId, hash, format);
  return fs.existsSync(cachePath);
}

/**
 * Read cache file for user
 */
export function readCache(userId, hash, format = 'mp3') {
  const cachePath = getCacheFilePath(userId, hash, format);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath);
  }
  return null;
}

/**
 * Write cache file for user
 */
export function writeCache(userId, hash, format, buffer) {
  const cachePath = getCacheFilePath(userId, hash, format);
  fs.writeFileSync(cachePath, buffer);
}

/**
 * Get MIME type for format
 */
export function getMimeType(format) {
  const mimeTypes = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg'
  };
  return mimeTypes[format.toLowerCase()] || 'audio/mpeg';
}

