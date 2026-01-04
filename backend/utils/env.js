/**
 * Environment variable utilities
 * Handles loading and reading environment variables with fallbacks
 */

/**
 * Get OpenAI API key from environment variables
 * Checks multiple possible env var names for backward compatibility
 * 
 * Priority order:
 * 1. OPENAI_API_KEY (primary)
 * 2. OCR_OPENAI_API_KEY (OCR-specific)
 * 3. API_KEY (legacy fallback)
 * 
 * @returns {string | null} API key if found, null otherwise
 */
export function getOpenAIApiKey() {
  // Try OPENAI_API_KEY first (primary)
  let key = process.env.OPENAI_API_KEY;
  if (key && typeof key === 'string' && key.trim().length > 0) {
    return key.trim();
  }
  
  // Try OCR_OPENAI_API_KEY (OCR-specific)
  key = process.env.OCR_OPENAI_API_KEY;
  if (key && typeof key === 'string' && key.trim().length > 0) {
    return key.trim();
  }
  
  // Try API_KEY (legacy fallback)
  key = process.env.API_KEY;
  if (key && typeof key === 'string' && key.trim().length > 0) {
    return key.trim();
  }
  
  // No key found
  return null;
}

/**
 * Check if OpenAI API key is configured
 * @returns {boolean} true if key is available, false otherwise
 */
export function isOpenAIApiKeyConfigured() {
  return getOpenAIApiKey() !== null;
}

