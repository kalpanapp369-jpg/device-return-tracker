const db = require('./config/db');

async function run() {
  try {
    await db.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
    await db.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','staff','customer'))");
    console.log('Constraint updated successfully');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

run();
