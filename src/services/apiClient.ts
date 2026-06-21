import { auth } from './firebase';

// In production, the backend lives on Render (no Firebase Hosting rewrite in use).
// Locally, Vite's dev proxy forwards relative /api/* calls to localhost:3001.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function resolveUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!API_BASE_URL) return input;
  if (typeof input === 'string' && input.startsWith('/api/')) {
    return `${API_BASE_URL}${input}`;
  }
  return input;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(resolveUrl(input), {
    ...init,
    headers,
  });
}
