import { get, post } from './client';

export function login(email, password) {
  return post('/api/auth/login', { email, password });
}

export function register(name, email, password) {
  return post('/api/auth/register', { name, email, password });
}

export function refreshToken() {
  return post('/api/auth/refresh');
}

export function getMe() {
  return get('/api/auth/me');
}
