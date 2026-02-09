import { get, post, put, del } from './client';

export function getAll() {
  return get('/api/checklists');
}

export function getById(id) {
  return get(`/api/checklists/${id}`);
}

export function create(data) {
  return post('/api/checklists', data);
}

export function update(id, data) {
  return put(`/api/checklists/${id}`, data);
}

export function remove(id) {
  return del(`/api/checklists/${id}`);
}

export function assign(id, userId) {
  return put(`/api/checklists/${id}/assign`, { userId });
}

export function updateStatus(id, status) {
  return put(`/api/checklists/${id}/status`, { status });
}
