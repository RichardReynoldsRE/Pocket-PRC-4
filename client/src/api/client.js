import { Capacitor } from '@capacitor/core';

const API_HOST = 'https://pocket-prc-app-production.up.railway.app';

// On native platforms (Android/iOS), always use the production API.
// On web, use relative URLs so the Vite dev proxy works, or the same-origin in production.
const BASE_URL = Capacitor.isNativePlatform()
  ? API_HOST
  : (import.meta.env.VITE_API_URL || '');

let isRefreshing = false;
let refreshPromise = null;

async function refreshAccessToken() {
  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Refresh failed');

  const data = await res.json();
  localStorage.setItem('token', data.token);
  return data.token;
}

async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${url}`, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    // Try refreshing the token once before logging out
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken()
        .finally(() => { isRefreshing = false; });
    }

    try {
      const newToken = await refreshPromise;
      // Retry the original request with the new token
      const retryHeaders = { ...options.headers, 'Authorization': `Bearer ${newToken}` };
      if (options.body && !(options.body instanceof FormData)) {
        retryHeaders['Content-Type'] = 'application/json';
      }
      const retryRes = await fetch(`${BASE_URL}${url}`, { ...options, headers: retryHeaders, credentials: 'include' });

      if (retryRes.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }

      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ error: retryRes.statusText }));
        throw new Error(err.error || err.message || 'Request failed');
      }

      if (retryRes.status === 204) return null;
      return retryRes.json();
    } catch {
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || 'Request failed');
  }

  if (res.status === 204) return null;
  return res.json();
}

export function get(url) {
  return request(url);
}

export function post(url, data) {
  return request(url, {
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}

export function put(url, data) {
  return request(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function del(url) {
  return request(url, { method: 'DELETE' });
}
