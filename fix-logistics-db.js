const db = require('./backend/config/db');

async function fixDB() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // Drop the old incorrectly structured table
    console.log('Dropping old logistics table...');
    await client.query('DROP TABLE IF EXISTS logistics CASCADE');
    
    // Create the new correct table
    console.log('Creating new logistics table...');
    await client.query(`
      CREATE TABLE logistics (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        device_id INTEGER REFERENCES devices(id),
        type VARCHAR(20) NOT NULL,
        scheduled_date DATE,
        scheduled_time TIME,
        address TEXT,
        assigned_to VARCHAR(100),
        status VARCHAR(20) DEFAULT 'Scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await client.query('COMMIT');
    console.log('Successfully updated logistics table schema!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error fixing DB:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

fixDB();
