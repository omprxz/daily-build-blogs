import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config/index.js';
import * as schema from './schema.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.database.url,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[Database Pool Error]:', err.message);
});

export const db = drizzle(pool, { schema });

// Helper to check DB connectivity
export async function checkDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return { connected: true };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
