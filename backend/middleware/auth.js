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
  // Allow health checks and auth endpoints without auth
  if (req.path === '/health' || req.path === '/healthz' || req.path === '/readyz' || req.path.startsWith('/auth/')) {
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

