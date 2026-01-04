/**
 * Audit logging middleware
 * Logs security and important events
 */

import { query } from '../db/index.js';

/**
 * Log an audit event
 */
export async function logAuditEvent(eventType, details = {}, req = null) {
  try {
    const userId = req?.user?.id || null;
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.headers?.['user-agent'] || null;

    await query(
      `INSERT INTO audit_logs (user_id, event_type, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, eventType, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (error) {
    // Don't fail requests if audit logging fails (DB not available or other error)
    if (error.message && error.message.includes('Database not available')) {
      // DB not available - silently skip audit logging
      console.warn('[Audit] DB not available, skipping audit logging');
    } else {
      console.error('[Audit] Failed to log event:', error);
    }
  }
}

/**
 * Audit middleware factory
 */
export function auditMiddleware(eventType, getDetails = () => ({})) {
  return async (req, res, next) => {
    // Log before processing
    const details = getDetails(req);
    await logAuditEvent(eventType, details, req);
    next();
  };
}

