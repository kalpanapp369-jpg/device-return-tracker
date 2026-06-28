const db = require('./config/db');

async function fixDB() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Dropping old maintenance table...');
    await client.query('DROP TABLE IF EXISTS maintenance CASCADE');
    
    console.log('Creating new maintenance table...');
    await client.query(`
      CREATE TABLE maintenance (
        id SERIAL PRIMARY KEY,
        device_id INT NOT NULL REFERENCES devices(id),
        return_id INT REFERENCES return_records(id),
        issue_description TEXT NOT NULL,
        technician VARCHAR(100),
        estimated_cost DECIMAL(10,2) DEFAULT 0,
        actual_cost DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'Open',
        priority VARCHAR(20) DEFAULT 'Medium',
        resolution_notes TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await client.query('COMMIT');
    console.log('Successfully updated maintenance table schema!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error fixing DB:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

fixDB();
