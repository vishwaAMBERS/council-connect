// Applies database/migrations/*.sql in filename order, once each.
// Usage: npm run migrate            (apply pending)
//        npm run db:reset           (wipe embedded database, then apply all)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../config/env.js';
import { query, exec, closeDb, dbKind } from './index.js';

export async function migrate({ log = console.log } = {}) {
  await exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const applied = new Set((await query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const files = fs.existsSync(config.db.migrationsDir)
    ? fs.readdirSync(config.db.migrationsDir).filter((f) => f.endsWith('.sql')).sort()
    : [];

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(config.db.migrationsDir, file), 'utf8');
    await exec(`BEGIN;\n${sql}\n;COMMIT;`).catch(async (error) => {
      await exec('ROLLBACK').catch(() => {});
      throw new Error(`Migration ${file} failed: ${error.message}`);
    });
    await query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    log(`applied ${file}`);
    count += 1;
  }
  log(`${await dbKind()}: ${count} migration(s) applied, ${files.length} total`);
  return count;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--reset')) {
    if (config.db.url) {
      console.error('Refusing to reset: DATABASE_URL is set. --reset only wipes the embedded database.');
      process.exit(1);
    }
    fs.rmSync(config.db.dataDir, { recursive: true, force: true });
    console.log('embedded database wiped');
  }
  migrate()
    .then(closeDb)
    .catch(async (error) => {
      console.error(error.message);
      await closeDb().catch(() => {});
      process.exit(1);
    });
}
