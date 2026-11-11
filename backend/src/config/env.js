import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

dotenv.config({ path: path.join(backendRoot, '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const DEV_SECRET = 'development-secret';

// A guessable signing secret lets anyone forge a session for any account, so production refuses to start with one.
if (nodeEnv === 'production') {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32 || secret === DEV_SECRET || secret.startsWith('replace_with')) {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production');
  }
}

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv,
  isProduction: nodeEnv === 'production',
  jwtSecret: process.env.JWT_SECRET || DEV_SECRET,
  // Web app (5173) and the Expo browser build of the mobile app (8081). Native apps are not subject to CORS.
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8081',
  // Uploaded images are kept on local disk for now (Supabase Storage at deploy).
  uploadsDir: path.resolve(backendRoot, process.env.UPLOADS_DIR || 'uploads'),
  db: {
    // Set DATABASE_URL to use a real PostgreSQL server (e.g. Supabase).
    // Leave it empty to use the embedded PGlite database stored in dataDir.
    url: process.env.DATABASE_URL || '',
    ssl: process.env.DATABASE_SSL || '', // off | require | no-verify; see db/index.js
    // PGLITE_DATA_DIR=memory:// keeps the embedded database in memory (used by tests).
    inMemory: process.env.PGLITE_DATA_DIR === 'memory://',
    dataDir: path.resolve(backendRoot, process.env.PGLITE_DATA_DIR || '.data/pglite'),
    migrationsDir: path.resolve(backendRoot, '../database/migrations')
  },
  ai: {
    // Optional. Without a key, categorisation falls back to keyword rules.
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5'
  }
};
