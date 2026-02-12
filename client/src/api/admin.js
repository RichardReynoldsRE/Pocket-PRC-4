import { get, put, post } from './client';

export function getTeams() {
  return get('/api/admin/teams');
}

export function getUsers() {
  return get('/api/admin/users');
}

export function updateUser(id, data) {
  return put(`/api/admin/users/${id}`, data);
}

export function resetUserPassword(id, sendEmail = false) {
  return post(`/api/admin/users/${id}/reset-password`, { sendEmail });
}

export function getLeadReports(start, end) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  const qs = params.toString();
  return get(`/api/admin/reports/leads${qs ? `?${qs}` : ''}`);
}

export function getChecklistReports(start, end) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  const qs = params.toString();
  return get(`/api/admin/reports/checklists${qs ? `?${qs}` : ''}`);
}

export function getStats() {
  return get('/api/admin/stats');
}
