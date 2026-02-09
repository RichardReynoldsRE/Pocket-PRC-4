import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pool, { query } from '../database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations() {
  const result = await query('SELECT filename FROM schema_migrations ORDER BY id');
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigrations() {
  try {
    await ensureMigrationsTable();
    const applied = await getAppliedMigrations();

    const files = await readdir(__dirname);
    const sqlFiles = files
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of sqlFiles) {
      if (applied.has(file)) continue;

      const sql = await readFile(join(__dirname, file), 'utf-8');
      console.log(`Running migration: ${file}`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        count++;
        console.log(`  Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  Failed: ${file}`, err.message);
        throw err;
      } finally {
        client.release();
      }
    }

    if (count === 0) {
      console.log('No new migrations to apply.');
    } else {
      console.log(`Applied ${count} migration(s).`);
    }
  } catch (err) {
    console.error('Migration error:', err.message);
    throw err;
  }
}

// Allow running directly: node src/migrations/migrate.js
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runMigrations;
