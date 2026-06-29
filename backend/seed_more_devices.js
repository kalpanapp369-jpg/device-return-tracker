const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://return_tracker_db_user:WqfDvmg8LIJijA43TBk26qSqir54FJCw@dpg-d90kkndckfvc73dhl0r0-a.ohio-postgres.render.com/return_tracker_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB. Inserting more devices...');
    
    await client.query(`
      INSERT INTO devices (serial_number, device_name, category, purchase_cost, status) VALUES
      ('DEV-004', 'Sony PlayStation 5', 'Gaming', 50000.00, 'Available'),
      ('DEV-005', 'DJI Mavic 3 Drone', 'Camera', 120000.00, 'Available'),
      ('DEV-006', 'Meta Quest 3 VR', 'Gaming', 45000.00, 'Available'),
      ('DEV-007', 'Epson 4K Projector', 'Display', 85000.00, 'Available'),
      ('DEV-008', 'Samsung 49" Odyssey Monitor', 'Display', 110000.00, 'Available'),
      ('DEV-009', 'Logitech PTZ Pro 2 Camera', 'Camera', 65000.00, 'Available'),
      ('DEV-010', 'Apple Mac Studio M2', 'Desktop', 190000.00, 'Available'),
      ('DEV-011', 'JBL PartyBox 710', 'Audio', 60000.00, 'Available')
      ON CONFLICT (serial_number) DO NOTHING;
    `);
    
    console.log('Successfully inserted more items.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
