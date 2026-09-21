import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'pocket-prc-uploads';
const PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN; // e.g., pub-xxx.r2.dev

/**
 * Upload a file buffer to R2.
 * Returns the public URL and the storage key.
 */
export async function uploadFile(buffer, key, mimeType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const url = PUBLIC_DOMAIN
    ? `https://${PUBLIC_DOMAIN}/${key}`
    : `https://${BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;

  return { url, key };
}

/**
 * Delete a file from R2 by key.
 */
export async function deleteFile(key) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

/**
 * Build a storage key for an attachment.
 */
export function buildKey(checklistId, filename) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `attachments/${checklistId}/${Date.now()}-${safe}`;
}
