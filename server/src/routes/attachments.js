import { Router } from 'express';
import { query } from '../database.js';
import { verifyToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { uploadFile, deleteFile, buildKey } from '../lib/r2.js';
import { createError } from '../utils/errors.js';

const router = Router();

router.use(verifyToken);

// POST /:checklistId - Upload files to R2
router.post('/:checklistId', upload.array('files', 20), async (req, res, next) => {
  try {
    const { checklistId } = req.params;
    const { userId } = req.user;

    // Verify checklist exists
    const checklist = await query('SELECT * FROM checklists WHERE id = $1', [checklistId]);
    if (checklist.rows.length === 0) {
      throw createError('Checklist not found', 404);
    }

    if (!req.files || req.files.length === 0) {
      throw createError('No files uploaded', 400);
    }

    const attachments = [];

    for (const file of req.files) {
      const key = buildKey(checklistId, file.originalname);
      const { url } = await uploadFile(file.buffer, key, file.mimetype);

      const result = await query(
        `INSERT INTO attachments (checklist_id, uploaded_by, filename, original_name, mime_type, size_bytes, storage_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          checklistId,
          userId,
          key,
          file.originalname,
          file.mimetype,
          file.size,
          url,
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

// GET /:id/download - Redirect to R2 URL
router.get('/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params;

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

    // storage_path now holds the R2 public URL
    res.redirect(attachment.storage_path);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete from R2 and database
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const result = await query('SELECT * FROM attachments WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw createError('Attachment not found', 404);
    }

    const attachment = result.rows[0];

    // Only uploader or super_admin can delete
    if (role !== 'super_admin' && attachment.uploaded_by !== userId) {
      throw createError('Access denied', 403);
    }

    // Delete from R2 (filename column stores the R2 key)
    try {
      await deleteFile(attachment.filename);
    } catch {
      // File may already be gone from R2
    }

    await query('DELETE FROM attachments WHERE id = $1', [id]);

    res.json({ message: 'Attachment deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
