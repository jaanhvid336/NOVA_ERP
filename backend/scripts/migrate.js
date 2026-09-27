import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const directory = fileURLToPath(new URL('../db/migrations/', import.meta.url));

async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const applied = new Set((await pool.query('SELECT filename FROM schema_migrations')).rows.map((row) => row.filename));
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(directory, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

migrate().then(() => pool.end()).catch(async (error) => {
  console.error(error.message);
  await pool.end();
  process.exitCode = 1;
});
