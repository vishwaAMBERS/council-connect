import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env.js';
import { query, dbKind } from './db/index.js';
import { h, notFound, errorHandler } from './lib/http.js';
import authRoutes from './routes/auth.js';
import directoryRoutes from './routes/directory.js';
import contactRequestRoutes from './routes/contactRequests.js';
import verificationRoutes from './routes/verification.js';
import uploadRoutes from './routes/uploads.js';
import eventRoutes from './routes/events.js';
import grievanceRoutes from './routes/grievances.js';
import lostFoundRoutes from './routes/lostFound.js';
import campusRoutes from './routes/campus.js';

export function createApp({ logRequests = true } = {}) {
  const app = express();

  app.use(cors({ origin: config.corsOrigin.split(',').map((origin) => origin.trim()) }));
  app.use(express.json({ limit: '100kb' }));
  if (logRequests) app.use(morgan('dev'));

  app.get('/health', h(async (req, res) => {
    try {
      await query('SELECT 1');
      res.json({ ok: true, service: 'councilconnect-backend', environment: config.nodeEnv, database: await dbKind() });
    } catch (error) {
      res.status(503).json({ ok: false, error: `Database unavailable: ${error.message}` });
    }
  }));

  // Uploaded images. They are served as plain files; nosniff stops a browser treating one as a page.
  app.use('/uploads', express.static(config.uploadsDir, {
    index: false,
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
  }));

  app.use('/auth', authRoutes);
  app.use('/events', eventRoutes);
  app.use('/grievances', grievanceRoutes);
  app.use('/lost-found', lostFoundRoutes);
  app.use(uploadRoutes); // /uploads (POST)
  app.use('/contact-requests', contactRequestRoutes);
  app.use(directoryRoutes); // /meta, /directory, /users
  app.use(verificationRoutes); // /council-profiles, /verification
  app.use(campusRoutes); // /locations, /map, /notifications

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
