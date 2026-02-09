import { Router } from 'express';
import { query } from '../database.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { createError } from '../utils/errors.js';

const router = Router();

// GET / - Get branding for a team (or default)
router.get('/', async (req, res, next) => {
  try {
    const { team_id } = req.query;

    let result;
    if (team_id) {
      result = await query(
        `SELECT * FROM branding WHERE team_id = $1 LIMIT 1`,
        [team_id]
      );
    }

    // Fall back to default branding if no team-specific branding
    if (!result || result.rows.length === 0) {
      result = await query(
        `SELECT * FROM branding WHERE team_id IS NULL LIMIT 1`
      );
    }

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

// PUT / - Update team branding (team_lead of own team, or owner)
router.put('/', verifyToken, async (req, res, next) => {
  try {
    const { userId, role } = req.user;
    const { team_id, app_name, primary_color, primary_hover_color, secondary_color, logo_url, brokerage_name } = req.body;

    // If team_id is provided, verify access
    if (team_id) {
      if (role !== 'owner') {
        const userResult = await query('SELECT team_id, role FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];
        if (user.team_id !== team_id || user.role !== 'team_lead') {
          throw createError('Access denied', 403);
        }
      }

      // Upsert team branding
      const existing = await query('SELECT id FROM branding WHERE team_id = $1', [team_id]);

      let result;
      if (existing.rows.length > 0) {
        result = await query(
          `UPDATE branding
           SET app_name = COALESCE($1, app_name),
               primary_color = COALESCE($2, primary_color),
               primary_hover_color = COALESCE($3, primary_hover_color),
               secondary_color = COALESCE($4, secondary_color),
               logo_url = COALESCE($5, logo_url),
               brokerage_name = COALESCE($6, brokerage_name),
               updated_at = NOW()
           WHERE team_id = $7
           RETURNING *`,
          [app_name || null, primary_color || null, primary_hover_color || null, secondary_color || null, logo_url || null, brokerage_name || null, team_id]
        );
      } else {
        result = await query(
          `INSERT INTO branding (team_id, app_name, primary_color, primary_hover_color, secondary_color, logo_url, brokerage_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [team_id, app_name || 'Pocket PRC', primary_color || '#b91c1c', primary_hover_color || '#991b1b', secondary_color || '#fbbf24', logo_url || null, brokerage_name || 'Keller Williams Realty']
        );
      }

      return res.json({ branding: result.rows[0] });
    }

    // No team_id means default branding - owner only
    if (role !== 'owner') {
      throw createError('Only owners can update default branding', 403);
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

    res.json({ branding: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
