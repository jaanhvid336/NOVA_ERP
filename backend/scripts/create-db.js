import pg from 'pg';
import { config } from '../src/config.js';

const target = new URL(config.databaseUrl);
const databaseName = target.pathname.slice(1) || 'atlas_erp_db';
const adminUrl = new URL(target);
adminUrl.pathname = '/postgres';
const client = new pg.Client({ connectionString: adminUrl.toString() });

await client.connect();
const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
if (!exists.rows[0]) {
  if (databaseName !== 'atlas_erp_db') throw new Error('For safety, db:create only creates atlas_erp_db');
  await client.query('CREATE DATABASE atlas_erp_db');
  console.log('Created atlas_erp_db');
} else {
  console.log(`${databaseName} already exists`);
}
await client.end();
