import { Router } from 'express';
import crypto from 'node:crypto';
import { query } from '../database.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { createError } from '../utils/errors.js';

const router = Router();

router.use(verifyToken);

// GET / - List teams
router.get('/', async (req, res, next) => {
  try {
    const { userId, role } = req.user;

    let result;
    if (role === 'owner') {
      result = await query(
        `SELECT t.*, COUNT(u.id)::int AS member_count
         FROM teams t LEFT JOIN users u ON u.team_id = t.id AND u.is_active = true
         GROUP BY t.id ORDER BY t.created_at DESC`
      );
    } else {
      const userResult = await query('SELECT team_id FROM users WHERE id = $1', [userId]);
      const teamId = userResult.rows[0]?.team_id;
      if (!teamId) {
        return res.json({ teams: [] });
      }
      result = await query(
        `SELECT t.*, COUNT(u.id)::int AS member_count
         FROM teams t LEFT JOIN users u ON u.team_id = t.id AND u.is_active = true
         WHERE t.id = $1
         GROUP BY t.id`,
        [teamId]
      );
    }

    res.json({ teams: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST / - Create team
router.post('/', async (req, res, next) => {
  try {
    const { name, brokerageName } = req.body;
    const { userId } = req.user;

    if (!name) {
      throw createError('Team name is required', 400);
    }

    const result = await query(
      `INSERT INTO teams (name, brokerage_name, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, brokerageName || null, userId]
    );

    const team = result.rows[0];

    // Set creator as owner on this team
    await query(
      `UPDATE users SET team_id = $1, role = 'owner', updated_at = NOW() WHERE id = $2`,
      [team.id, userId]
    );

    res.status(201).json({ team });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Team details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT t.*, COUNT(u.id)::int AS member_count
       FROM teams t LEFT JOIN users u ON u.team_id = t.id AND u.is_active = true
       WHERE t.id = $1
       GROUP BY t.id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw createError('Team not found', 404);
    }

    res.json({ team: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update team
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    const { name, brokerageName } = req.body;

    // Verify owner/team_lead of this team
    if (role !== 'owner') {
      const userResult = await query('SELECT team_id, role FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      if (user.team_id !== id || !['owner', 'team_lead'].includes(user.role)) {
        throw createError('Access denied', 403);
      }
    }

    const result = await query(
      `UPDATE teams
       SET name = COALESCE($1, name),
           brokerage_name = COALESCE($2, brokerage_name),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [name || null, brokerageName || null, id]
    );

    if (result.rows.length === 0) {
      throw createError('Team not found', 404);
    }

    res.json({ team: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /:id/invite
router.post('/:id/invite', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    const { email, role: inviteRole } = req.body;

    if (!email) {
      throw createError('Email is required', 400);
    }

    // Verify access
    if (role !== 'owner') {
      const userResult = await query('SELECT team_id, role FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      if (user.team_id !== id || !['owner', 'team_lead'].includes(user.role)) {
        throw createError('Access denied', 403);
      }
    }

    const teamExists = await query('SELECT id FROM teams WHERE id = $1', [id]);
    if (teamExists.rows.length === 0) {
      throw createError('Team not found', 404);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const result = await query(
      `INSERT INTO team_invites (team_id, email, invited_by, role, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, email.toLowerCase(), userId, inviteRole || 'agent', token, expiresAt]
    );

    res.status(201).json({
      invite: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        token,
        expires_at: result.rows[0].expires_at,
        link: `${process.env.APP_URL || 'http://localhost:5173'}/register?invite=${token}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id/members
router.get('/:id/members', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, name, email, role, avatar_url, is_active, created_at
       FROM users WHERE team_id = $1
       ORDER BY role, name`,
      [id]
    );

    res.json({ members: result.rows });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id/members/:userId - Remove member
router.delete('/:id/members/:memberId', async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const { userId, role } = req.user;

    if (role !== 'owner') {
      const userResult = await query('SELECT team_id, role FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      if (user.team_id !== id || !['owner', 'team_lead'].includes(user.role)) {
        throw createError('Access denied', 403);
      }
    }

    // Cannot remove yourself
    if (memberId === userId) {
      throw createError('Cannot remove yourself from the team', 400);
    }

    const result = await query(
      `UPDATE users SET team_id = NULL, updated_at = NOW() WHERE id = $1 AND team_id = $2 RETURNING id`,
      [memberId, id]
    );

    if (result.rows.length === 0) {
      throw createError('Member not found in this team', 404);
    }

    res.json({ message: 'Member removed from team' });
  } catch (err) {
    next(err);
  }
});

// PUT /:id/members/:userId/role - Change member role
router.put('/:id/members/:memberId/role', async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const { userId, role: callerRole } = req.user;
    const { role } = req.body;

    // Verify caller is owner or team_lead of this team
    if (callerRole !== 'owner') {
      const userResult = await query('SELECT team_id, role FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      if (user.team_id !== id || !['owner', 'team_lead'].includes(user.role)) {
        throw createError('Access denied', 403);
      }
    }

    const validRoles = ['owner', 'team_lead', 'agent', 'transaction_coordinator', 'isa'];
    if (!role || !validRoles.includes(role)) {
      throw createError('Invalid role', 400);
    }

    const result = await query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND team_id = $3 RETURNING id, name, email, role`,
      [role, memberId, id]
    );

    if (result.rows.length === 0) {
      throw createError('User not found in this team', 404);
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
