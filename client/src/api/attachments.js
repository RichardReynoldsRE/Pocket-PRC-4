import { post, del } from './client';

export function upload(checklistId, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return post(`/api/attachments/${checklistId}`, formData);
}

export function remove(id) {
  return del(`/api/attachments/${id}`);
}
