import jwt from 'jsonwebtoken';
import { query } from '../database.js';
import { createError } from '../utils/errors.js';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

const ROLE_HIERARCHY = {
  super_admin: 6,
  owner: 5,
  team_lead: 4,
  agent: 3,
  transaction_coordinator: 2,
  isa: 1,
};

export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('Authentication required', 401));
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Read current role from database (JWT role may be stale after migrations/changes)
    const result = await query('SELECT role FROM users WHERE id = $1', [decoded.userId]);
    const currentRole = result.rows[0]?.role || decoded.role;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: currentRole,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(createError('Token expired', 401));
    }
    return next(createError('Invalid token', 401));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }
    next();
  };
}

export function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    if (userLevel < requiredLevel) {
      return next(createError('Insufficient permissions', 403));
    }
    next();
  };
}
