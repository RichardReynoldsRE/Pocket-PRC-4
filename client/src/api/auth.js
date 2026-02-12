import { get, post, put } from './client';

export function login(email, password) {
  return post('/api/auth/login', { email, password });
}

export function register(name, email, password, inviteToken) {
  const body = { name, email, password };
  if (inviteToken) body.inviteToken = inviteToken;
  return post('/api/auth/register', body);
}

export function acceptInvite(inviteToken) {
  return post('/api/auth/accept-invite', { inviteToken });
}

export function refreshToken() {
  return post('/api/auth/refresh');
}

export function getMe() {
  return get('/api/auth/me');
}

export function updateProfile(data) {
  return put('/api/auth/me', data);
}

export function forgotPassword(email) {
  return post('/api/auth/forgot-password', { email });
}

export function resetPassword(token, password) {
  return post('/api/auth/reset-password', { token, password });
}
