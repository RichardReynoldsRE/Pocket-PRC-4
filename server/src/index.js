import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import bcrypt from 'bcryptjs';

import pool, { query } from './database.js';
import runMigrations from './migrations/migrate.js';
import { AppError } from './utils/errors.js';

import authRoutes from './routes/auth.js';
import checklistRoutes from './routes/checklists.js';
import teamRoutes from './routes/teams.js';
import attachmentRoutes from './routes/attachments.js';
import adminRoutes from './routes/admin.js';
import syncRoutes from './routes/sync.js';
import brandingRoutes from './routes/branding.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;

// Middleware - allow Capacitor native origins (https://localhost, capacitor://localhost)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow wildcard
    if (allowedOrigins.includes('*')) return callback(null, true);
    // Allow Capacitor origins
    if (origin.includes('localhost') || origin.includes('capacitor://')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, true); // permissive for now during development
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/branding', brandingRoutes);

// App download - redirects to latest GitHub release APK
app.get('/api/download/app', (_req, res) => {
  res.redirect('https://github.com/RichardReynoldsRE/Pocket-PRC-4/releases/latest/download/app-debug.apk');
});

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

// Production: serve static files from client build
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(__dirname, '../../client/dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // SPA fallback for non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(join(clientDist, 'index.html'));
      }
    });
  }
}

// Global error handler
app.use((err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (max 10MB)' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files (max 20)' });
  }
  if (err.message === 'Only images and PDFs are allowed') {
    return res.status(400).json({ error: err.message });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Startup
async function createDefaultAdmin() {
  try {
    const users = await query('SELECT COUNT(*)::int AS count FROM users');
    if (users.rows[0].count === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)`,
        ['admin@pocketprc.com', hash, 'Admin', 'admin']
      );
      console.log('Default admin created: admin@pocketprc.com / admin123');
    }
  } catch (err) {
    console.error('Failed to create default admin:', err.message);
  }
}

async function createDefaultBranding() {
  try {
    const existing = await query('SELECT id FROM branding WHERE team_id IS NULL');
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO branding (team_id, app_name, primary_color, primary_hover_color, secondary_color, brokerage_name)
         VALUES (NULL, 'Pocket PRC', '#b91c1c', '#991b1b', '#fbbf24', 'Keller Williams Realty')`
      );
      console.log('Default branding row created.');
    }
  } catch (err) {
    console.error('Failed to create default branding:', err.message);
  }
}

async function start() {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('Database connected.');

    // Run migrations
    await runMigrations();

    // Seed defaults
    await createDefaultAdmin();
    await createDefaultBranding();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Pocket PRC server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    console.error('Make sure DATABASE_URL is set and PostgreSQL is running.');
    process.exit(1);
  }
}

start();
