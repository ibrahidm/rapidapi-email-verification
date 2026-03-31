/**
 * Database Connection
 *
 * Uses postgres.js - a lightweight Postgres client optimized for serverless.
 * Connection pooling handled automatically.
 */

import postgres from 'postgres';

// Lazy initialization - only connect when actually used
let sql: ReturnType<typeof postgres> | null = null;

/**
 * Get the database connection.
 * Creates connection on first call, reuses on subsequent calls.
 */
export function getDb() {
  if (!sql) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    sql = postgres(connectionString, {
      // Serverless-friendly settings
      max: 5, // Max connections in pool
      idle_timeout: 20, // Close idle connections after 20 seconds
      connect_timeout: 10, // Connection timeout in seconds
    });
  }

  return sql;
}

/**
 * Check if database is configured.
 * Used to skip DB operations in development without a database.
 */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
