// Single database entry point.
// - DATABASE_URL set   -> node-postgres pool (Supabase / any PostgreSQL server)
// - DATABASE_URL empty -> embedded PGlite (PostgreSQL in-process, no install)
// Both expose the same two functions, so the rest of the code never cares which is in use.
import fs from 'node:fs';
import { config } from '../config/env.js';

let client;

/**
 * TLS for the PostgreSQL connection, from DATABASE_SSL:
 *   off        no TLS (the default for a database on this machine)
 *   require    TLS with certificate verification (the default for any other host)
 *   no-verify  TLS without verifying the certificate; only for providers whose certificate
 *              chain is not in the system trust store, and only if you accept that risk
 */
function sslOption() {
  const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(config.db.url);
  const mode = config.db.ssl || (local ? 'off' : 'require');
  if (mode === 'off') return false;
  if (mode === 'no-verify') return { rejectUnauthorized: false };
  if (mode === 'require') return { rejectUnauthorized: true };
  throw new Error(`DATABASE_SSL must be off, require or no-verify (got "${mode}")`);
}

async function connect() {
  if (config.db.url) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: config.db.url, ssl: sslOption() });
    return {
      kind: 'postgres',
      query: (text, params) => pool.query(text, params),
      // Scripts (migrations) run on one dedicated connection. If a script fails part-way through a
      // transaction, it is rolled back on that same connection before the connection is reused.
      exec: async (sql) => {
        const connection = await pool.connect();
        try {
          return await connection.query(sql);
        } catch (error) {
          await connection.query('ROLLBACK').catch(() => {});
          throw error;
        } finally {
          connection.release();
        }
      },
      close: () => pool.end()
    };
  }

  const { PGlite } = await import('@electric-sql/pglite');
  if (!config.db.inMemory) fs.mkdirSync(config.db.dataDir, { recursive: true });
  const lite = config.db.inMemory ? new PGlite() : new PGlite(config.db.dataDir);
  await lite.waitReady;
  return {
    kind: 'pglite',
    query: (text, params) => lite.query(text, params),
    exec: (sql) => lite.exec(sql),
    close: () => lite.close()
  };
}

async function getClient() {
  if (!client) client = connect();
  return client;
}

/** Run one parameterised statement. Returns { rows }. */
export async function query(text, params = []) {
  const db = await getClient();
  return db.query(text, params);
}

/** Run a multi-statement SQL script (migrations, seeds). No parameters. */
export async function exec(sql) {
  const db = await getClient();
  return db.exec(sql);
}

export async function dbKind() {
  return (await getClient()).kind;
}

export async function closeDb() {
  if (!client) return;
  const db = await client;
  client = undefined;
  await db.close();
}
