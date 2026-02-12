import { Router } from 'express';
import crypto from 'node:crypto';
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

// POST /forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw createError('Email is required', 400);
    }

    const result = await query(
      'SELECT id, name, email FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Invalidate any existing unused tokens for this user
      await query(
        `UPDATE password_reset_tokens SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
      );

      // Generate new token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      // Send email via Resend
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

          await resend.emails.send({
            from: 'Pocket PRC <onboarding@resend.dev>',
            to: [user.email],
            subject: 'Reset Your Pocket PRC Password',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #b91c1c;">Reset Your Password</h2>
                <p>Hi ${user.name},</p>
                <p>We received a request to reset your password. Click the button below to set a new password:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" style="background: #b91c1c; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 13px;">This link expires in 1 hour. If you did not request a password reset, you can ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #9ca3af; font-size: 11px;">If the button does not work, copy and paste this URL into your browser:<br/>${resetUrl}</p>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error('Failed to send password reset email:', emailErr.message);
        }
      }
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// POST /reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw createError('Token and password are required', 400);
    }

    if (password.length < 6) {
      throw createError('Password must be at least 6 characters', 400);
    }

    // Find valid token
    const tokenResult = await query(
      `SELECT prt.*, u.is_active
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      throw createError('Invalid or expired reset token', 400);
    }

    const resetToken = tokenResult.rows[0];

    if (!resetToken.is_active) {
      throw createError('Account is deactivated', 403);
    }

    // Update password
    const hash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hash, resetToken.user_id]
    );

    // Mark token as used
    await query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [resetToken.id]
    );

    res.json({ message: 'Password reset successfully. You can now log in.' });
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
