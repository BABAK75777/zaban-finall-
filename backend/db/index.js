/**
 * Database connection and query utilities
 * Uses pg (node-postgres) for PostgreSQL
 */

import pg from 'pg';
const { Pool } = pg;

let pool = null;
export let dbReady = false;

/**
 * Check if required DB environment variables are present
 */
function hasDbConfig() {
  return !!(
    process.env.DB_HOST &&
    process.env.DB_USER &&
    process.env.DB_NAME &&
    process.env.DB_PASSWORD !== undefined // Allow empty string
  );
}

/**
 * Initialize database connection pool
 * Returns true if DB was initialized, false if skipped due to missing config
 */
export function initDb(config = {}) {
  // Check for required environment variables
  if (!hasDbConfig() && Object.keys(config).length === 0) {
    console.warn('[DB] DB disabled (missing env vars: DB_HOST, DB_USER, DB_NAME, DB_PASSWORD). Running in no-db mode.');
    dbReady = false;
    return null;
  }

  try {
    const {
      host = process.env.DB_HOST,
      port = process.env.DB_PORT || 5432,
      database = process.env.DB_NAME,
      user = process.env.DB_USER,
      password = process.env.DB_PASSWORD || '',
      max = 20,
      idleTimeoutMillis = 30000,
      connectionTimeoutMillis = 2000,
    } = config;

    // Validate required config
    if (!host || !database || !user || password === undefined) {
      console.warn('[DB] DB disabled (missing required config). Running in no-db mode.');
      dbReady = false;
      return null;
    }

    pool = new Pool({
      host,
      port: parseInt(port, 10),
      database,
      user,
      password,
      max,
      idleTimeoutMillis,
      connectionTimeoutMillis,
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client', err);
    });

    dbReady = true;
    console.log('[DB] Connection pool initialized');
    return pool;
  } catch (error) {
    console.error('[DB] Failed to initialize connection pool:', error.message);
    dbReady = false;
    pool = null;
    return null;
  }
}

/**
 * Get database pool (throws if not initialized)
 */
export function getPool() {
  if (!pool || !dbReady) {
    throw new Error('Database not available. DB is disabled or not initialized.');
  }
  return pool;
}

/**
 * Execute a query
 * Throws a controlled error if DB is not ready
 */
export async function query(text, params) {
  if (!dbReady || !pool) {
    throw new Error('Database not available. DB is disabled or not initialized.');
  }
  
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[DB] Query executed', { text: text.substring(0, 100), duration: `${duration}ms`, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('[DB] Query error', { text: text.substring(0, 100), error: error.message });
    throw error;
  }
}

/**
 * Execute a transaction
 * Throws a controlled error if DB is not ready
 */
export async function transaction(callback) {
  if (!dbReady || !pool) {
    throw new Error('Database not available. DB is disabled or not initialized.');
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database connections
 */
export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    dbReady = false;
    console.log('[DB] Connection pool closed');
  }
}

