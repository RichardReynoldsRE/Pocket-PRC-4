import { get, put } from './client';

export function getUsers() {
  return get('/api/admin/users');
}

export function updateUser(id, data) {
  return put(`/api/admin/users/${id}`, data);
}
