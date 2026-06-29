const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://return_tracker_db_user:WqfDvmg8LIJijA43TBk26qSqir54FJCw@dpg-d90kkndckfvc73dhl0r0-a.ohio-postgres.render.com/return_tracker_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB. Creating missing tables...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'customer',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INT,
          user_name VARCHAR(100),
          action VARCHAR(50) NOT NULL,
          table_name VARCHAR(50),
          record_id INT,
          old_data JSON,
          new_data JSON,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Successfully created users and audit_logs tables.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
