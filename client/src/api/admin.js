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

export function getLeadReports() {
  return get('/api/admin/reports/leads');
}

export function getStats() {
  return get('/api/admin/stats');
}
