export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** Wrap an async route handler so rejections reach the error middleware. */
export const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

/** Trimmed string from request input, or '' when missing / not a string. */
export const str = (value) => (typeof value === 'string' ? value.trim() : '');

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, ...error.extra });
  }
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
}
