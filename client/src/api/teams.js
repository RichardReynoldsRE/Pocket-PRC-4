import { get, post } from './client';

export function getAll() {
  return get('/api/teams');
}

export function create(data) {
  return post('/api/teams', data);
}

export function invite(teamId, email, role) {
  return post(`/api/teams/${teamId}/invite`, { email, role });
}

export function getMembers(teamId) {
  return get(`/api/teams/${teamId}/members`);
}
