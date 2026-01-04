/**
 * Quota enforcement middleware
 * Checks and enforces per-user quotas
 */

import { query } from '../db/index.js';
import { getQuotaLimits } from '../auth/index.js';

/**
 * Get today's date in UTC (YYYY-MM-DD)
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get or create today's usage record
 */
async function getOrCreateUsage(userId, date) {
  try {
    const result = await query(
      `INSERT INTO usage_daily (user_id, date, chars_generated, chunks_generated, seconds_audio_est, requests, cache_hit_rate, gemini_failures)
       VALUES ($1, $2, 0, 0, 0, 0, 0.0, 0)
       ON CONFLICT (user_id, date)
       DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [userId, date]
    );
    return result.rows[0];
  } catch (error) {
    // DB not available - return mock usage object
    console.warn('[Quotas] DB not available, using mock usage data');
    return {
      user_id: userId,
      date,
      chars_generated: 0,
      chunks_generated: 0,
      seconds_audio_est: 0,
      requests: 0,
      cache_hit_rate: 0,
      gemini_failures: 0,
    };
  }
}

/**
 * Check if user has exceeded quota
 */
async function checkQuota(userId, plan, quotaLimits, charsToAdd = 0, chunksToAdd = 0, sessionsToAdd = 0) {
  const today = getTodayDate();
  const usage = await getOrCreateUsage(userId, today);

  const checks = [];

  // Check character limit
  if (usage.chars_generated + charsToAdd > quotaLimits.charsPerDay) {
    checks.push({
      ok: false,
      error: 'QUOTA_EXCEEDED',
      details: `Daily character limit reached (${usage.chars_generated}/${quotaLimits.charsPerDay}). Limit resets at midnight UTC.`,
      limit: quotaLimits.charsPerDay,
      used: usage.chars_generated,
    });
  }

  // Check chunk limit
  if (usage.chunks_generated + chunksToAdd > quotaLimits.chunksPerDay) {
    checks.push({
      ok: false,
      error: 'QUOTA_EXCEEDED',
      details: `Daily chunk limit reached (${usage.chunks_generated}/${quotaLimits.chunksPerDay}). Limit resets at midnight UTC.`,
      limit: quotaLimits.chunksPerDay,
      used: usage.chunks_generated,
    });
  }

  // Check session limit
  let sessionsToday = 0;
  try {
    const sessionCount = await query(
      `SELECT COUNT(*) as count
       FROM tts_sessions
       WHERE user_id = $1 AND DATE(created_at) = $2`,
      [userId, today]
    );
    sessionsToday = parseInt(sessionCount.rows[0].count, 10);
  } catch (error) {
    // DB not available - skip session limit check
    console.warn('[Quotas] DB not available, skipping session limit check');
  }
  
  if (sessionsToday + sessionsToAdd > quotaLimits.sessionsPerDay) {
    checks.push({
      ok: false,
      error: 'QUOTA_EXCEEDED',
      details: `Daily session limit reached (${sessionsToday}/${quotaLimits.sessionsPerDay}). Limit resets at midnight UTC.`,
      limit: quotaLimits.sessionsPerDay,
      used: sessionsToday,
    });
  }

  return checks.length > 0 ? checks[0] : { ok: true };
}

/**
 * Quota enforcement middleware for TTS requests
 */
export async function enforceQuota(req, res, next) {
  // Skip if no user (optional auth in dev)
  if (!req.user) {
    return next();
  }

  const { user } = req;
  const quotaLimits = user.quotaLimits || getQuotaLimits(user.plan);

  // Check max chars per request
  const text = req.body?.text || '';
  if (text.length > quotaLimits.maxCharsPerRequest) {
    return res.status(400).json({
      ok: false,
      error: 'TEXT_TOO_LONG',
      details: `Text exceeds maximum length per request (${text.length}/${quotaLimits.maxCharsPerRequest} characters)`,
      maxCharsPerRequest: quotaLimits.maxCharsPerRequest,
    });
  }

  // Check quota before processing
  const charsToAdd = text.length;
  const chunksToAdd = Math.ceil(charsToAdd / (req.body?.chunkMaxChars || 1600));
  const sessionsToAdd = req.path.includes('/session') ? 1 : 0;

  const quotaCheck = await checkQuota(user.id, user.plan, quotaLimits, charsToAdd, chunksToAdd, sessionsToAdd);
  
  if (!quotaCheck.ok) {
    return res.status(403).json(quotaCheck);
  }

  // Attach quota info to request for later usage tracking
  req.quotaInfo = {
    charsToAdd,
    chunksToAdd,
    sessionsToAdd,
    quotaLimits,
  };

  next();
}

/**
 * Track usage after successful request
 */
export async function trackUsage(userId, usageData) {
  const today = getTodayDate();
  const {
    charsGenerated = 0,
    chunksGenerated = 0,
    secondsAudioEst = 0,
    requests = 1,
    cacheHits = 0,
    cacheMisses = 0,
    geminiFailures = 0,
  } = usageData;

  const totalRequests = cacheHits + cacheMisses;
  const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

  try {
    await query(
      `INSERT INTO usage_daily (user_id, date, chars_generated, chunks_generated, seconds_audio_est, requests, cache_hit_rate, gemini_failures)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, date)
       DO UPDATE SET
         chars_generated = usage_daily.chars_generated + $3,
         chunks_generated = usage_daily.chunks_generated + $4,
         seconds_audio_est = usage_daily.seconds_audio_est + $5,
         requests = usage_daily.requests + $6,
         cache_hit_rate = CASE
           WHEN usage_daily.requests + $6 > 0
           THEN ((usage_daily.requests * usage_daily.cache_hit_rate / 100.0) + $7) / (usage_daily.requests + $6) * 100.0
           ELSE usage_daily.cache_hit_rate
         END,
         gemini_failures = usage_daily.gemini_failures + $8,
         updated_at = NOW()`,
      [userId, today, charsGenerated, chunksGenerated, secondsAudioEst, requests, cacheHitRate, geminiFailures]
    );
  } catch (error) {
    // DB not available - silently skip usage tracking
    console.warn('[Quotas] DB not available, skipping usage tracking');
  }
}

