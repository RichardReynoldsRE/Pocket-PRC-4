import { get, post, put, del } from './client';

export function getAll() {
  return get('/api/teams');
}

export function create(data) {
  return post('/api/teams', data);
}

export function update(teamId, data) {
  return put(`/api/teams/${teamId}`, data);
}

export function invite(teamId, email, role) {
  return post(`/api/teams/${teamId}/invite`, { email, role });
}

export function getMembers(teamId) {
  return get(`/api/teams/${teamId}/members`);
}

export function removeMember(teamId, memberId) {
  return del(`/api/teams/${teamId}/members/${memberId}`);
}

export function changeMemberRole(teamId, memberId, role) {
  return put(`/api/teams/${teamId}/members/${memberId}/role`, { role });
}
