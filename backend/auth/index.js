/**
 * Authentication utilities
 * JWT-based authentication with email/password
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 12;

/**
 * Hash a password
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    plan: user.plan,
    quotaLimits: getQuotaLimits(user.plan),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Get quota limits for a plan
 */
export function getQuotaLimits(plan) {
  const limits = {
    free: {
      charsPerDay: 50000,
      chunksPerDay: 200,
      sessionsPerDay: 20,
      maxCharsPerRequest: 5000,
      maxSessionsPerHour: 10,
    },
    pro: {
      charsPerDay: 500000,
      chunksPerDay: 2000,
      sessionsPerDay: 200,
      maxCharsPerRequest: 10000,
      maxSessionsPerHour: 50,
    },
  };
  return limits[plan] || limits.free;
}

/**
 * Create a new user
 */
export async function createUser(email, password) {
  const passwordHash = await hashPassword(password);
  const result = await query(
    `INSERT INTO users (email, password_hash, plan, status)
     VALUES ($1, $2, 'free', 'active')
     RETURNING id, email, plan, status, created_at`,
    [email.toLowerCase().trim(), passwordHash]
  );
  return result.rows[0];
}

/**
 * Find user by email
 */
export async function findUserByEmail(email) {
  const result = await query(
    `SELECT id, email, password_hash, plan, status, created_at, updated_at
     FROM users
     WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return result.rows[0] || null;
}

/**
 * Find user by ID
 */
export async function findUserById(userId) {
  const result = await query(
    `SELECT id, email, plan, status, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Update user status
 */
export async function updateUserStatus(userId, status) {
  const result = await query(
    `UPDATE users
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, plan, status`,
    [status, userId]
  );
  return result.rows[0] || null;
}

/**
 * Update user plan
 */
export async function updateUserPlan(userId, plan) {
  const result = await query(
    `UPDATE users
     SET plan = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, plan, status`,
    [plan, userId]
  );
  return result.rows[0] || null;
}

