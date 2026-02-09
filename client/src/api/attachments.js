import { get, post, del } from './client';

export function upload(checklistId, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return post(`/api/checklists/${checklistId}/attachments`, formData);
}

export function download(id) {
  return get(`/api/attachments/${id}`);
}

export function remove(id) {
  return del(`/api/attachments/${id}`);
}
