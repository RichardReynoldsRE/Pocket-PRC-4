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
    const { userId } = req.user;

    // Read current role from DB (JWT role may be stale)
    const userResult = await query('SELECT team_id, role FROM users WHERE id = $1', [userId]);
    const dbRole = userResult.rows[0]?.role;
    const teamId = userResult.rows[0]?.team_id;

    let result;
    if (dbRole === 'owner') {
      result = await query(
        `SELECT t.*, COUNT(u.id)::int AS member_count
         FROM teams t LEFT JOIN users u ON u.team_id = t.id AND u.is_active = true
         GROUP BY t.id ORDER BY t.created_at DESC`
      );
    } else if (teamId) {
      result = await query(
        `SELECT t.*, COUNT(u.id)::int AS member_count
         FROM teams t LEFT JOIN users u ON u.team_id = t.id AND u.is_active = true
         WHERE t.id = $1
         GROUP BY t.id`,
        [teamId]
      );
    } else {
      return res.json({ teams: [] });
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
    const { userId } = req.user;
    const { name, brokerageName } = req.body;

    // Verify owner/team_lead of this team (read from DB, not JWT)
    const userResult = await query('SELECT team_id, role FROM users WHERE id = $1', [userId]);
    const callerUser = userResult.rows[0];
    if (callerUser.team_id !== id || !['owner', 'team_lead'].includes(callerUser.role)) {
      throw createError('Access denied', 403);
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
    const { userId } = req.user;
    const { email, role: inviteRole } = req.body;

    if (!email) {
      throw createError('Email is required', 400);
    }

    // Verify access (read from DB, not JWT)
    const userResult = await query('SELECT team_id, role FROM users WHERE id = $1', [userId]);
    const callerUser = userResult.rows[0];
    if (callerUser.team_id !== id || !['owner', 'team_lead'].includes(callerUser.role)) {
      throw createError('Access denied', 403);
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
    const { userId } = req.user;

    // Verify access (read from DB, not JWT)
    const userResult = await query('SELECT team_id, role FROM users WHERE id = $1', [userId]);
    const callerUser = userResult.rows[0];
    if (callerUser.team_id !== id || !['owner', 'team_lead'].includes(callerUser.role)) {
      throw createError('Access denied', 403);
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
    const { userId } = req.user;
    const { role } = req.body;

    // Verify caller is owner or team_lead of this team (read from DB, not JWT)
    const callerResult = await query('SELECT team_id, role FROM users WHERE id = $1', [userId]);
    const callerUser = callerResult.rows[0];
    if (callerUser.team_id !== id || !['owner', 'team_lead'].includes(callerUser.role)) {
      throw createError('Access denied', 403);
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

// POST /:id/transfer-ownership - Transfer ownership to another member
router.post('/:id/transfer-ownership', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      throw createError('newOwnerId is required', 400);
    }

    // Verify caller is owner of this team
    const callerResult = await query('SELECT team_id, role FROM users WHERE id = $1', [userId]);
    const caller = callerResult.rows[0];
    if (caller.team_id !== id || caller.role !== 'owner') {
      throw createError('Only the team owner can transfer ownership', 403);
    }

    // Verify target is on this team
    const targetResult = await query('SELECT id, team_id FROM users WHERE id = $1', [newOwnerId]);
    if (targetResult.rows.length === 0 || targetResult.rows[0].team_id !== id) {
      throw createError('User not found in this team', 404);
    }

    // Transfer: promote target to owner, demote caller to team_lead
    await query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', ['owner', newOwnerId]);
    await query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', ['team_lead', userId]);

    res.json({ message: 'Ownership transferred successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete team
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Verify caller is owner of this team
    const callerResult = await query('SELECT team_id, role FROM users WHERE id = $1', [userId]);
    const caller = callerResult.rows[0];
    if (caller.team_id !== id || caller.role !== 'owner') {
      throw createError('Only the team owner can delete the team', 403);
    }

    // Remove all members from the team (set team_id to null, reset to agent role)
    await query(
      `UPDATE users SET team_id = NULL, role = 'agent', updated_at = NOW() WHERE team_id = $1`,
      [id]
    );

    // Delete pending invites
    await query('DELETE FROM team_invites WHERE team_id = $1', [id]);

    // Delete the team
    await query('DELETE FROM teams WHERE id = $1', [id]);

    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
