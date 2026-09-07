import pg from 'pg';
import { config } from '../config.js';

// Shared connection pool. Created lazily on first query.
let pool = null;

function getPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });
    pool.on('error', (err) => console.error('[db] Unexpected pool error', err));
  }
  return pool;
}

export const query = (text, params) => getPool().query(text, params);

export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) { await pool.end(); pool = null; }
}
