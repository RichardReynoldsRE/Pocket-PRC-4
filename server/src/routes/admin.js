import { Router } from 'express';
import { query } from '../database.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { createError } from '../utils/errors.js';

const router = Router();

// GET /branding - PUBLIC (no auth required)
router.get('/branding', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM branding WHERE team_id IS NULL LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        branding: {
          app_name: 'Pocket PRC',
          primary_color: '#b91c1c',
          primary_hover_color: '#991b1b',
          secondary_color: '#fbbf24',
          logo_url: null,
          brokerage_name: 'Keller Williams Realty',
        },
      });
    }

    res.json({ branding: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// All remaining routes require auth + admin
router.use(verifyToken, requireRole('owner'));

// PUT /branding - Update default branding
router.put('/branding', async (req, res, next) => {
  try {
    const { app_name, primary_color, primary_hover_color, secondary_color, logo_url, brokerage_name } = req.body;

    // Validate hex colors if provided
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    if (primary_color && !hexRegex.test(primary_color)) {
      throw createError('Invalid primary_color hex format', 400);
    }
    if (primary_hover_color && !hexRegex.test(primary_hover_color)) {
      throw createError('Invalid primary_hover_color hex format', 400);
    }
    if (secondary_color && !hexRegex.test(secondary_color)) {
      throw createError('Invalid secondary_color hex format', 400);
    }

    const result = await query(
      `UPDATE branding
       SET app_name = COALESCE($1, app_name),
           primary_color = COALESCE($2, primary_color),
           primary_hover_color = COALESCE($3, primary_hover_color),
           secondary_color = COALESCE($4, secondary_color),
           logo_url = COALESCE($5, logo_url),
           brokerage_name = COALESCE($6, brokerage_name),
           updated_at = NOW()
       WHERE team_id IS NULL
       RETURNING *`,
      [app_name || null, primary_color || null, primary_hover_color || null, secondary_color || null, logo_url || null, brokerage_name || null]
    );

    if (result.rows.length === 0) {
      throw createError('Default branding not found', 404);
    }

    res.json({ branding: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /users - List all users
router.get('/users', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.team_id, u.avatar_url, u.is_active, u.created_at,
              t.name AS team_name
       FROM users u
       LEFT JOIN teams t ON u.team_id = t.id
       ORDER BY u.created_at DESC`
    );

    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

// PUT /users/:id - Update user role/status
router.put('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, is_active } = req.body;
    const { userId } = req.user;

    // Cannot demote self
    if (id === userId && role && role !== 'owner') {
      throw createError('Cannot change your own role', 400);
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (role !== undefined) {
      const validRoles = ['owner', 'team_lead', 'agent', 'transaction_coordinator', 'isa'];
      if (!validRoles.includes(role)) {
        throw createError('Invalid role', 400);
      }
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (is_active !== undefined) {
      // Cannot deactivate self
      if (id === userId && !is_active) {
        throw createError('Cannot deactivate your own account', 400);
      }
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      throw createError('No fields to update', 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, email, role, team_id, is_active, created_at`,
      values
    );

    if (result.rows.length === 0) {
      throw createError('User not found', 404);
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /stats - Dashboard statistics
router.get('/stats', async (_req, res, next) => {
  try {
    const [usersCount, checklistsCount, byStatus, recentActivity] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM users WHERE is_active = true'),
      query('SELECT COUNT(*)::int AS count FROM checklists'),
      query(
        `SELECT status, COUNT(*)::int AS count FROM checklists GROUP BY status`
      ),
      query(
        `SELECT al.*, u.name AS user_name
         FROM activity_log al
         LEFT JOIN users u ON al.user_id = u.id
         ORDER BY al.created_at DESC
         LIMIT 20`
      ),
    ]);

    const statusMap = {};
    for (const row of byStatus.rows) {
      statusMap[row.status] = row.count;
    }

    res.json({
      stats: {
        total_users: usersCount.rows[0].count,
        total_checklists: checklistsCount.rows[0].count,
        checklists_by_status: statusMap,
        recent_activity: recentActivity.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
