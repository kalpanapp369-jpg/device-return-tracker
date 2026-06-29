const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  connectionString: 'postgresql://return_tracker_db_user:WqfDvmg8LIJijA43TBk26qSqir54FJCw@dpg-d90kkndckfvc73dhl0r0-a.ohio-postgres.render.com/return_tracker_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    
    // Hash password "password123"
    const hash = await bcrypt.hash('password123', 12);
    
    // Update passwords for all users
    await client.query("UPDATE users SET password_hash = $1", [hash]);
    
    console.log('Successfully reset passwords for all users to "password123"!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
