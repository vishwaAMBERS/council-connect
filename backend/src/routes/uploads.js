// Image uploads (profile photos, event posters, complaint and lost/found photos).
// Files are stored on local disk for now; the plan is Supabase Storage at deploy.
import fs from 'node:fs';
import crypto from 'node:crypto';
import express from 'express';
import multer from 'multer';
import { config } from '../config/env.js';
import { HttpError, h } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

const EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const MAX_BYTES = 5 * 1024 * 1024;

// The first bytes of the file must match the declared type, so a renamed file is rejected.
const SIGNATURES = {
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } });

/** A stored upload path as accepted in posterUrl / imageUrl / avatarUrl fields. */
export const isUploadUrl = (value) => typeof value === 'string' && /^\/uploads\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(value);

/** Normalises an optional upload-url field: '' / null / undefined -> null, otherwise must be valid. */
export function optionalUploadUrl(value, label = 'Image') {
  if (value === undefined || value === null || value === '') return null;
  if (!isUploadUrl(value)) throw new HttpError(400, `${label} must be a file uploaded through /uploads`);
  return value;
}

const router = express.Router();

router.post('/uploads', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, 'Image must be 5 MB or smaller'));
    if (error) return next(new HttpError(400, 'Could not read the uploaded file'));
    return next();
  });
}, h(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Attach an image in the "file" field');
  const extension = EXTENSIONS[req.file.mimetype];
  if (!extension || !SIGNATURES[extension](req.file.buffer)) {
    throw new HttpError(400, 'Only PNG, JPEG or WebP images are accepted');
  }
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  const name = `${crypto.randomUUID()}.${extension}`;
  await fs.promises.writeFile(`${config.uploadsDir}/${name}`, req.file.buffer);
  res.status(201).json({ url: `/uploads/${name}` });
}));

export default router;
