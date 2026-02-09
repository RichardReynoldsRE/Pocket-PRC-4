import { Router } from 'express';
import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { query } from '../database.js';
import { verifyToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { createError } from '../utils/errors.js';

const router = Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

router.use(verifyToken);

// POST /:checklistId - Upload files
router.post('/:checklistId', upload.array('files', 20), async (req, res, next) => {
  try {
    const { checklistId } = req.params;
    const { userId } = req.user;

    // Verify checklist exists and user has access
    const checklist = await query('SELECT * FROM checklists WHERE id = $1', [checklistId]);
    if (checklist.rows.length === 0) {
      throw createError('Checklist not found', 404);
    }

    if (!req.files || req.files.length === 0) {
      throw createError('No files uploaded', 400);
    }

    const attachments = [];

    for (const file of req.files) {
      const result = await query(
        `INSERT INTO attachments (checklist_id, uploaded_by, filename, original_name, mime_type, size_bytes, storage_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          checklistId,
          userId,
          file.filename,
          file.originalname,
          file.mimetype,
          file.size,
          file.path,
        ]
      );
      attachments.push(result.rows[0]);
    }

    await query(
      `INSERT INTO activity_log (user_id, checklist_id, action, details)
       VALUES ($1, $2, 'files_uploaded', $3)`,
      [userId, checklistId, JSON.stringify({ count: attachments.length })]
    );

    res.status(201).json({ attachments });
  } catch (err) {
    next(err);
  }
});

// GET /:id/download - Download file
router.get('/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const result = await query(
      `SELECT a.*, c.owner_id, c.team_id, c.assigned_to
       FROM attachments a
       JOIN checklists c ON a.checklist_id = c.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw createError('Attachment not found', 404);
    }

    const attachment = result.rows[0];

    // Access check
    if (role !== 'owner') {
      if (
        attachment.owner_id !== userId &&
        attachment.assigned_to !== userId &&
        attachment.uploaded_by !== userId
      ) {
        throw createError('Access denied', 403);
      }
    }

    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${attachment.original_name}"`
    );

    const stream = createReadStream(attachment.storage_path);
    stream.on('error', () => {
      if (!res.headersSent) {
        next(createError('File not found on disk', 404));
      }
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete attachment
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const result = await query('SELECT * FROM attachments WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw createError('Attachment not found', 404);
    }

    const attachment = result.rows[0];

    // Only uploader or admin can delete
    if (role !== 'owner' && attachment.uploaded_by !== userId) {
      throw createError('Access denied', 403);
    }

    // Delete file from disk
    try {
      await unlink(attachment.storage_path);
    } catch {
      // File may already be gone
    }

    await query('DELETE FROM attachments WHERE id = $1', [id]);

    res.json({ message: 'Attachment deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
