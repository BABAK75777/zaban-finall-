/**
 * Authentication middleware
 * Validates JWT tokens and attaches user to request
 */

import { verifyToken, findUserById } from '../auth/index.js';

/**
 * Check if guest mode is enabled
 * Defaults to guest mode if AUTH_MODE is not set (for development)
 */
function isGuestMode() {
  const authMode = process.env.AUTH_MODE || 'guest';
  return authMode === 'guest';
}

/**
 * Extract token from Authorization header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Authentication middleware
 * Requires valid JWT token
 */
export async function requireAuth(req, res, next) {
  // Allow health checks, root endpoint, and auth endpoints without auth
  if (req.path === '/' || req.path === '/health' || req.path === '/healthz' || req.path === '/readyz' || req.path.startsWith('/auth/')) {
    return next();
  }

  // Skip auth in guest mode
  if (isGuestMode()) {
    return next();
  }

  // Check for emergency kill switch
  if (process.env.TTS_DISABLED === 'true') {
    return res.status(503).json({
      ok: false,
      error: 'SERVICE_DISABLED',
      details: 'TTS service is temporarily disabled'
    });
  }

  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED',
      details: 'Authentication required. Please provide a valid token.'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED',
      details: 'Invalid or expired token'
    });
  }

  // Fetch user from database to check status
  let user;
  try {
    user = await findUserById(decoded.userId);
  } catch (error) {
    // DB not available - in dev mode, allow but warn; in production, reject
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        ok: false,
        error: 'SERVICE_UNAVAILABLE',
        details: 'Database unavailable'
      });
    }
    // In dev mode, if DB is not available, allow request but skip user lookup
    console.warn('[Auth] DB not available, skipping user lookup in dev mode');
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED',
      details: 'Database not available. User authentication requires DB connection.'
    });
  }
  
  if (!user) {
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED',
      details: 'User not found'
    });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      ok: false,
      error: 'SUSPENDED',
      details: 'Your account has been suspended'
    });
  }

  // Attach user to request
  req.user = {
    id: user.id,
    email: user.email,
    plan: user.plan,
    status: user.status,
    quotaLimits: decoded.quotaLimits, // From token
  };

  next();
}

/**
 * Optional auth middleware (for backward compatibility in dev)
 * Attaches user if token is present, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  // Skip auth in guest mode
  if (isGuestMode()) {
    return next();
  }

  // In production, require auth (unless guest mode)
  if (process.env.NODE_ENV === 'production') {
    return requireAuth(req, res, next);
  }

  // In dev, allow requests without auth (backward compatibility)
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      try {
        const user = await findUserById(decoded.userId);
        if (user && user.status !== 'suspended') {
          req.user = {
            id: user.id,
            email: user.email,
            plan: user.plan,
            status: user.status,
            quotaLimits: decoded.quotaLimits,
          };
        }
      } catch (error) {
        // DB not available - skip user lookup, continue without user
        console.warn('[Auth] DB not available, skipping user lookup in optionalAuth');
      }
    }
  }

  next();
}

/**
 * API Key authentication middleware
 * Protects all routes except allowlisted public endpoints
 * Uses x-api-key header and process.env.API_KEY
 */
const API_KEY_ALLOWLIST = new Set(['/', '/health', '/healthz', '/readyz']);

export function requireApiKey(req, res, next) {
  // Allow public endpoints
  const path = req.path.split('?')[0]; // Remove query string for comparison
  if (API_KEY_ALLOWLIST.has(path)) {
    return next();
  }

  // Get API key from header (case-insensitive)
  const providedKey = req.get('x-api-key') || req.get('X-Api-Key') || req.get('X-API-Key');
  const expectedKey = process.env.API_KEY;

  // If no API key is configured, fail in production (safety)
  if (!expectedKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[API-Key] ERROR: API_KEY environment variable is required in production');
      return res.status(500).json({
        ok: false,
        error: 'Configuration Error',
        details: 'API key authentication is not properly configured'
      });
    }
    // In dev, allow if no key is set (for local development)
    console.warn('[API-Key] WARNING: API_KEY not set, allowing request in dev mode');
    return next();
  }

  // Check if key is provided and matches
  if (!providedKey || providedKey !== expectedKey) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized'
    });
  }

  next();
}
