// Single database entry point.
// - DATABASE_URL set   -> node-postgres pool (Supabase / any PostgreSQL server)
// - DATABASE_URL empty -> embedded PGlite (PostgreSQL in-process, no install)
// Both expose the same two functions, so the rest of the code never cares which is in use.
import fs from 'node:fs';
import { config } from '../config/env.js';

let client;

async function connect() {
  if (config.db.url) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: config.db.url });
    return {
      kind: 'postgres',
      query: (text, params) => pool.query(text, params),
      exec: (sql) => pool.query(sql),
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
