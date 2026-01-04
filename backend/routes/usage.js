/**
 * Usage and dashboard routes
 */

import express from 'express';
import { query } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /usage/dashboard
 * Get user's usage dashboard data
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  // In guest mode, return 503 as dashboard requires auth and DB
  const authMode = process.env.AUTH_MODE || 'guest';
  if (authMode === 'guest' || !req.user) {
    return res.status(503).json({
      ok: false,
      error: 'SERVICE_UNAVAILABLE',
      details: 'Dashboard is not available in guest mode'
    });
  }

  try {
    const { user } = req;
    const today = new Date().toISOString().split('T')[0];

    // Get today's usage
    const usageResult = await query(
      `SELECT * FROM usage_daily WHERE user_id = $1 AND date = $2`,
      [user.id, today]
    );
    const usage = usageResult.rows[0] || {
      chars_generated: 0,
      chunks_generated: 0,
      seconds_audio_est: 0,
      requests: 0,
      cache_hit_rate: 0,
      gemini_failures: 0,
    };

    // Get recent sessions (last 7 days)
    const sessionsResult = await query(
      `SELECT id, session_key, total_chunks, created_at, last_active_at, status
       FROM tts_sessions
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.id]
    );

    // Get session stats
    const sessionStatsResult = await query(
      `SELECT 
         COUNT(*) as total_sessions,
         COUNT(*) FILTER (WHERE DATE(created_at) = $2) as sessions_today,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
         COUNT(*) FILTER (WHERE status = 'error') as error_sessions
       FROM tts_sessions
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
      [user.id, today]
    );
    const sessionStats = sessionStatsResult.rows[0];

    // Get average TTF (time to first audio) - estimate from chunk latencies
    const avgLatencyResult = await query(
      `SELECT AVG(gemini_latency_ms) as avg_latency_ms
       FROM tts_chunks
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days' AND gemini_latency_ms IS NOT NULL`,
      [user.id]
    );
    const avgLatency = avgLatencyResult.rows[0]?.avg_latency_ms || 0;

    res.json({
      ok: true,
      usage: {
        charsGenerated: usage.chars_generated,
        charsLimit: user.quotaLimits.charsPerDay,
        chunksGenerated: usage.chunks_generated,
        chunksLimit: user.quotaLimits.chunksPerDay,
        sessionsToday: parseInt(sessionStats.sessions_today, 10) || 0,
        sessionsLimit: user.quotaLimits.sessionsPerDay,
        secondsAudioEst: usage.seconds_audio_est,
        requests: usage.requests,
        cacheHitRate: parseFloat(usage.cache_hit_rate) || 0,
        geminiFailures: usage.gemini_failures,
        avgLatencyMs: Math.round(parseFloat(avgLatency)) || 0,
      },
      sessions: {
        total: parseInt(sessionStats.total_sessions, 10) || 0,
        completed: parseInt(sessionStats.completed_sessions, 10) || 0,
        errors: parseInt(sessionStats.error_sessions, 10) || 0,
        recent: sessionsResult.rows.map(s => ({
          id: s.id,
          sessionKey: s.session_key,
          totalChunks: s.total_chunks,
          createdAt: s.created_at,
          lastActiveAt: s.last_active_at,
          status: s.status,
        })),
      },
      plan: user.plan,
      quotaLimits: user.quotaLimits,
    });
  } catch (error) {
    console.error('[Usage:Dashboard] Error:', error);
    res.status(500).json({
      ok: false,
      error: 'FETCH_DASHBOARD_FAILED',
      details: error.message
    });
  }
});

export default router;

