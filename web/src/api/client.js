// Thin client for the CouncilConnect API. All server state goes through here.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'cc_token';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: session lasts until reload */
  }
};

// AuthContext listens for this to sign the user out when the session is no longer valid.
export const SESSION_EXPIRED_EVENT = 'cc:session-expired';

async function request(method, path, body) {
  const token = getToken();
  const isForm = body instanceof FormData;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check that the backend is running.', 0, null);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token && !path.startsWith('/auth/login')) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(data?.error || `Request failed (${response.status})`, response.status, data);
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
  /** Uploads one image and resolves to its stored path, e.g. "/uploads/<id>.png". */
  upload: async (file) => {
    const form = new FormData();
    form.append('file', file);
    return (await request('POST', '/uploads', form)).url;
  },
};

/** Full URL for a stored upload path returned by the API (or null). */
export const assetUrl = (path) => (path ? `${API_BASE}${path}` : null);
