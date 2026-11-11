// Client for the CouncilConnect API: the same backend the web app uses.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/**
 * Where the backend is.
 *  - EXPO_PUBLIC_API_URL wins when set (deployed backend, or a fixed address).
 *  - In the browser, the backend is on the same machine as the page.
 *  - In Expo Go, hostUri is the address of the computer running `expo start`,
 *    so a phone on the same Wi-Fi reaches the backend on that computer's port 4000.
 */
function resolveApiBase() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'web') return `http://${window.location.hostname}:4000`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:4000`;
}

export const API_BASE = resolveApiBase();
const TOKEN_KEY = 'cc_token';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// The session token is kept in the device keystore; the browser build falls back to localStorage.
let memoryToken = null;

export async function loadToken() {
  try {
    memoryToken = Platform.OS === 'web' ? window.localStorage.getItem(TOKEN_KEY) : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export async function saveToken(token) {
  memoryToken = token || null;
  try {
    if (Platform.OS === 'web') {
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      else window.localStorage.removeItem(TOKEN_KEY);
    } else if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch {
    /* storage unavailable: the session lasts until the app is closed */
  }
}

// Called when the server says the session is no longer valid (set by the auth provider).
let onSessionExpired = () => {};
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(memoryToken ? { Authorization: `Bearer ${memoryToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(`Cannot reach the server at ${API_BASE}. Check that the backend is running and this device is on the same network.`, 0, null);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && memoryToken && !path.startsWith('/auth/login')) onSessionExpired();
    throw new ApiError(data?.error || `Request failed (${response.status})`, response.status, data);
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};

/** Full URL of an uploaded image path returned by the API (or null). */
export const assetUrl = (path) => (path ? `${API_BASE}${path}` : null);
