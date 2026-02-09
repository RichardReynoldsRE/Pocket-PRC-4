import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database.js';
import { verifyToken } from '../middleware/auth.js';
import { createError } from '../utils/errors.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    team_id: user.team_id,
    avatar_url: user.avatar_url,
    is_active: user.is_active,
    created_at: user.created_at,
  };
}

// POST /register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, inviteToken } = req.body;

    if (!name || !email || !password) {
      throw createError('Name, email, and password are required', 400);
    }

    if (password.length < 6) {
      throw createError('Password must be at least 6 characters', 400);
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    if (existing.rows.length > 0) {
      throw createError('Email already registered', 409);
    }

    let teamId = null;
    let role = 'agent';

    if (inviteToken) {
      const invite = await query(
        `SELECT * FROM team_invites
         WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
        [inviteToken]
      );
      if (invite.rows.length === 0) {
        throw createError('Invalid or expired invite token', 400);
      }
      teamId = invite.rows[0].team_id;
      role = invite.rows[0].role || 'agent';

      await query(
        'UPDATE team_invites SET accepted_at = NOW() WHERE id = $1',
        [invite.rows[0].id]
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, team_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email.toLowerCase(), passwordHash, name, role, teamId]
    );

    const user = result.rows[0];
    const token = generateAccessToken(user);

    res.status(201).json({
      user: sanitizeUser(user),
      token,
    });
  } catch (err) {
    next(err);
  }
});

// POST /login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createError('Email and password are required', 400);
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);

    if (result.rows.length === 0) {
      throw createError('Invalid email or password', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw createError('Account is deactivated', 403);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw createError('Invalid email or password', 401);
    }

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.json({
      user: sanitizeUser(user),
      token,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw createError('Refresh token required', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch {
      throw createError('Invalid refresh token', 401);
    }

    if (decoded.type !== 'refresh') {
      throw createError('Invalid token type', 401);
    }

    const result = await query('SELECT * FROM users WHERE id = $1', [
      decoded.userId,
    ]);

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      throw createError('User not found or deactivated', 401);
    }

    const user = result.rows[0];
    const token = generateAccessToken(user);

    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// GET /me
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [
      req.user.userId,
    ]);

    if (result.rows.length === 0) {
      throw createError('User not found', 404);
    }

    res.json({ user: sanitizeUser(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PUT /me
router.put('/me', verifyToken, async (req, res, next) => {
  try {
    const { name, avatar_url, current_password, new_password } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(avatar_url);
    }

    // Password change
    if (current_password && new_password) {
      if (new_password.length < 6) {
        throw createError('New password must be at least 6 characters', 400);
      }

      const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);
      if (userResult.rows.length === 0) {
        throw createError('User not found', 404);
      }

      const valid = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
      if (!valid) {
        throw createError('Current password is incorrect', 400);
      }

      const newHash = await bcrypt.hash(new_password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(newHash);
    }

    if (updates.length === 0) {
      throw createError('No fields to update', 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({ user: sanitizeUser(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;
