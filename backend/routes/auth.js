/**
 * Authentication routes
 */

import express from 'express';
import { createUser, findUserByEmail, verifyPassword, generateToken, findUserById } from '../auth/index.js';
import { logAuditEvent } from '../middleware/audit.js';
import { query } from '../db/index.js';

const router = express.Router();

/**
 * POST /auth/signup
 * Create a new user account
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_EMAIL',
        details: 'Valid email address is required'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_PASSWORD',
        details: 'Password must be at least 8 characters'
      });
    }

    // Check if user already exists
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: 'USER_EXISTS',
        details: 'An account with this email already exists'
      });
    }

    // Create user
    const user = await createUser(email, password);
    
    // Generate token
    const token = generateToken(user);

    // Log signup
    await logAuditEvent('signup', { email: user.email }, req);

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      }
    });
  } catch (error) {
    console.error('[Auth:Signup] Error:', error);
    res.status(500).json({
      ok: false,
      error: 'SIGNUP_FAILED',
      details: error.message
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_CREDENTIALS',
        details: 'Email and password are required'
      });
    }

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      await logAuditEvent('login_failed', { email, reason: 'user_not_found' }, req);
      return res.status(401).json({
        ok: false,
        error: 'INVALID_CREDENTIALS',
        details: 'Invalid email or password'
      });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      await logAuditEvent('login_failed', { email: user.email, reason: 'invalid_password' }, req);
      return res.status(401).json({
        ok: false,
        error: 'INVALID_CREDENTIALS',
        details: 'Invalid email or password'
      });
    }

    // Check if suspended
    if (user.status === 'suspended') {
      await logAuditEvent('login_blocked', { email: user.email, reason: 'suspended' }, req);
      return res.status(403).json({
        ok: false,
        error: 'SUSPENDED',
        details: 'Your account has been suspended'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Log successful login
    await logAuditEvent('login', { email: user.email }, req);

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      }
    });
  } catch (error) {
    console.error('[Auth:Login] Error:', error);
    res.status(500).json({
      ok: false,
      error: 'LOGIN_FAILED',
      details: error.message
    });
  }
});

/**
 * POST /auth/logout
 * Logout (client-side token invalidation)
 * For full server-side invalidation, implement token blacklist
 */
router.post('/logout', async (req, res) => {
  try {
    if (req.user) {
      await logAuditEvent('logout', { email: req.user.email }, req);
    }
    res.json({ ok: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[Auth:Logout] Error:', error);
    res.status(500).json({
      ok: false,
      error: 'LOGOUT_FAILED',
      details: error.message
    });
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: 'UNAUTHORIZED',
        details: 'Authentication required'
      });
    }

    // Get fresh user data
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: 'USER_NOT_FOUND',
        details: 'User not found'
      });
    }

    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
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

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        status: user.status,
      },
      quotaLimits: req.user.quotaLimits,
      usage: {
        charsGenerated: usage.chars_generated,
        chunksGenerated: usage.chunks_generated,
        secondsAudioEst: usage.seconds_audio_est,
        requests: usage.requests,
        cacheHitRate: parseFloat(usage.cache_hit_rate) || 0,
        geminiFailures: usage.gemini_failures,
      }
    });
  } catch (error) {
    console.error('[Auth:Me] Error:', error);
    res.status(500).json({
      ok: false,
      error: 'FETCH_USER_FAILED',
      details: error.message
    });
  }
});

export default router;

