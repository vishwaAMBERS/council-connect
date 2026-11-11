import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

dotenv.config({ path: path.join(backendRoot, '.env') });

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'development-secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Uploaded images are kept on local disk for now (Supabase Storage at deploy).
  uploadsDir: path.resolve(backendRoot, process.env.UPLOADS_DIR || 'uploads'),
  db: {
    // Set DATABASE_URL to use a real PostgreSQL server (e.g. Supabase).
    // Leave it empty to use the embedded PGlite database stored in dataDir.
    url: process.env.DATABASE_URL || '',
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
