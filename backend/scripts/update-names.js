import pg from 'pg';
const c = new pg.Client({ connectionString: 'postgresql://postgres:password@localhost:5432/atlas_erp_db' });

async function run() {
  await c.connect();
  // Update emails
  await c.query(`UPDATE users SET email = 'rep@nova.local' WHERE email = 'rep@atlas.local'`);
  await c.query(`UPDATE users SET email = 'manager@nova.local' WHERE email = 'manager@atlas.local'`);
  await c.query(`UPDATE users SET email = 'warehouse@nova.local' WHERE email = 'warehouse@atlas.local'`);
  await c.query(`UPDATE users SET email = 'finance@nova.local' WHERE email = 'finance@atlas.local'`);
  
  // Update products
  await c.query(`UPDATE products SET name = 'Nova Task Chair' WHERE name = 'Atlas Task Chair'`);
  await c.query(`UPDATE products SET name = 'Nova Standing Desk' WHERE name = 'Atlas Standing Desk'`);
  
  console.log('Database emails and product names updated to Nova successfully!');
  await c.end();
}

run().catch(console.error);
