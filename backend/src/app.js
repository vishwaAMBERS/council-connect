import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import adminRoutes from './routes/admin.js';
import inviteCodeRoutes from './routes/inviteCodes.js';

export function createApp({ logRequests = true } = {}) {
  const app = express();

  // Behind a hosting proxy (Render, Railway, ...) the client address is in X-Forwarded-For.
  if (config.isProduction) app.set('trust proxy', 1);

  // Standard security headers. Uploaded images are loaded by the web app from another origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

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

  // Slow down password guessing and bulk sign-ups. Counted per client address.
  const limiter = (windowMinutes, limit, message) => rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: message }
  });
  app.use('/auth/login', limiter(15, 30, 'Too many sign-in attempts. Try again in a few minutes'));
  app.use('/auth/register', limiter(60, 20, 'Too many accounts created from this network. Try again later'));

  app.use('/auth', authRoutes);
  app.use('/events', eventRoutes);
  app.use('/grievances', grievanceRoutes);
  app.use('/lost-found', lostFoundRoutes);
  app.use(uploadRoutes); // /uploads (POST)
  app.use('/contact-requests', contactRequestRoutes);
  app.use(directoryRoutes); // /meta, /directory, /users
  app.use(verificationRoutes); // /council-profiles, /verification
  app.use(campusRoutes); // /locations, /map, /notifications
  app.use(adminRoutes); // /analytics, /audit-logs, /archive
  app.use(inviteCodeRoutes); // /invite-codes

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
