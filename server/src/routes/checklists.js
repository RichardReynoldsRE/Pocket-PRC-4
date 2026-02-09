import { Router } from 'express';
import { query } from '../database.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { createError } from '../utils/errors.js';

const router = Router();

router.use(verifyToken);

// GET / - List checklists
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const { userId, role } = req.user;

    let sql = '';
    const params = [];
    let paramIndex = 1;

    if (role === 'admin') {
      sql = 'SELECT c.*, u.name AS owner_name FROM checklists c LEFT JOIN users u ON c.owner_id = u.id';
    } else if (role === 'team_lead') {
      const userResult = await query('SELECT team_id FROM users WHERE id = $1', [userId]);
      const teamId = userResult.rows[0]?.team_id;
      if (teamId) {
        sql = `SELECT c.*, u.name AS owner_name FROM checklists c LEFT JOIN users u ON c.owner_id = u.id
               WHERE (c.team_id = $${paramIndex} OR c.owner_id = $${paramIndex + 1})`;
        params.push(teamId, userId);
        paramIndex += 2;
      } else {
        sql = `SELECT c.*, u.name AS owner_name FROM checklists c LEFT JOIN users u ON c.owner_id = u.id
               WHERE c.owner_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }
    } else {
      sql = `SELECT c.*, u.name AS owner_name FROM checklists c LEFT JOIN users u ON c.owner_id = u.id
             WHERE (c.owner_id = $${paramIndex} OR c.assigned_to = $${paramIndex + 1})`;
      params.push(userId, userId);
      paramIndex += 2;
    }

    if (status) {
      const validStatuses = ['draft', 'in_progress', 'completed', 'archived'];
      if (!validStatuses.includes(status)) {
        throw createError('Invalid status filter', 400);
      }
      if (params.length === 0) {
        sql += ` WHERE status = $${paramIndex}`;
      } else {
        sql += ` AND status = $${paramIndex}`;
      }
      params.push(status);
    }

    sql += ' ORDER BY c.updated_at DESC';

    const result = await query(sql, params);
    res.json({ checklists: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST / - Create checklist
router.post('/', async (req, res, next) => {
  try {
    const { propertyAddress, formData, notes } = req.body;
    const { userId } = req.user;

    const userResult = await query('SELECT team_id FROM users WHERE id = $1', [userId]);
    const teamId = userResult.rows[0]?.team_id || null;

    const result = await query(
      `INSERT INTO checklists (owner_id, team_id, property_address, form_data, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, teamId, propertyAddress || null, JSON.stringify(formData || {}), notes || null]
    );

    await query(
      `INSERT INTO activity_log (user_id, checklist_id, action, details)
       VALUES ($1, $2, 'created', $3)`,
      [userId, result.rows[0].id, JSON.stringify({ propertyAddress })]
    );

    res.status(201).json({ checklist: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Get single checklist with attachments
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const result = await query(
      `SELECT c.*, u.name AS owner_name
       FROM checklists c LEFT JOIN users u ON c.owner_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw createError('Checklist not found', 404);
    }

    const checklist = result.rows[0];

    // Access check
    if (role !== 'admin') {
      if (checklist.owner_id !== userId && checklist.assigned_to !== userId) {
        if (role === 'team_lead') {
          const userResult = await query('SELECT team_id FROM users WHERE id = $1', [userId]);
          if (userResult.rows[0]?.team_id !== checklist.team_id) {
            throw createError('Access denied', 403);
          }
        } else {
          throw createError('Access denied', 403);
        }
      }
    }

    const attachments = await query(
      'SELECT * FROM attachments WHERE checklist_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      checklist: { ...checklist, attachments: attachments.rows },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update checklist
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    const { propertyAddress, formData, notes } = req.body;

    const existing = await query('SELECT * FROM checklists WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw createError('Checklist not found', 404);
    }

    const checklist = existing.rows[0];

    // Verify ownership or role
    if (role !== 'admin' && checklist.owner_id !== userId) {
      if (role === 'team_lead') {
        const userResult = await query('SELECT team_id FROM users WHERE id = $1', [userId]);
        if (userResult.rows[0]?.team_id !== checklist.team_id) {
          throw createError('Access denied', 403);
        }
      } else {
        throw createError('Access denied', 403);
      }
    }

    const result = await query(
      `UPDATE checklists
       SET property_address = COALESCE($1, property_address),
           form_data = COALESCE($2, form_data),
           notes = COALESCE($3, notes),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        propertyAddress !== undefined ? propertyAddress : null,
        formData !== undefined ? JSON.stringify(formData) : null,
        notes !== undefined ? notes : null,
        id,
      ]
    );

    await query(
      `INSERT INTO activity_log (user_id, checklist_id, action, details)
       VALUES ($1, $2, 'updated', $3)`,
      [userId, id, JSON.stringify({ fields: Object.keys(req.body) })]
    );

    res.json({ checklist: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Soft delete (archive)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const existing = await query('SELECT * FROM checklists WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw createError('Checklist not found', 404);
    }

    const checklist = existing.rows[0];

    if (role !== 'admin' && checklist.owner_id !== userId) {
      throw createError('Access denied', 403);
    }

    await query(
      `UPDATE checklists SET status = 'archived', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await query(
      `INSERT INTO activity_log (user_id, checklist_id, action) VALUES ($1, $2, 'archived')`,
      [userId, id]
    );

    res.json({ message: 'Checklist archived' });
  } catch (err) {
    next(err);
  }
});

// PUT /:id/assign
router.put('/:id/assign', requireRole('admin', 'team_lead'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      throw createError('userId is required', 400);
    }

    const existing = await query('SELECT * FROM checklists WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw createError('Checklist not found', 404);
    }

    const result = await query(
      `UPDATE checklists SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [userId, id]
    );

    await query(
      `INSERT INTO activity_log (user_id, checklist_id, action, details)
       VALUES ($1, $2, 'assigned', $3)`,
      [req.user.userId, id, JSON.stringify({ assigned_to: userId })]
    );

    res.json({ checklist: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /:id/status
router.put('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { userId } = req.user;

    const validStatuses = ['draft', 'in_progress', 'completed', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      throw createError('Invalid status', 400);
    }

    const existing = await query('SELECT * FROM checklists WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw createError('Checklist not found', 404);
    }

    const completedAt = status === 'completed' ? 'NOW()' : 'NULL';

    const result = await query(
      `UPDATE checklists
       SET status = $1, completed_at = ${completedAt}, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    await query(
      `INSERT INTO activity_log (user_id, checklist_id, action, details)
       VALUES ($1, $2, 'status_changed', $3)`,
      [userId, id, JSON.stringify({ status })]
    );

    res.json({ checklist: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
