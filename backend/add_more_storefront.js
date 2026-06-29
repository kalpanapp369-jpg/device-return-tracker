const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://return_tracker_db_user:WqfDvmg8LIJijA43TBk26qSqir54FJCw@dpg-d90kkndckfvc73dhl0r0-a.ohio-postgres.render.com/return_tracker_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB. Adding more available devices...');
    
    await client.query(`
      INSERT INTO devices (serial_number, device_name, category, purchase_cost, status) VALUES
      ('DEV-012', 'Apple iPhone 15 Pro Max', 'Smartphone', 140000.00, 'Available'),
      ('DEV-013', 'Samsung Galaxy S24 Ultra', 'Smartphone', 130000.00, 'Available'),
      ('DEV-014', 'GoPro HERO 12 Black', 'Camera', 45000.00, 'Available'),
      ('DEV-015', 'DJI Ronin RS 3 Gimbal', 'Accessories', 48000.00, 'Available'),
      ('DEV-016', 'Bose QuietComfort Ultra', 'Audio', 35000.00, 'Available'),
      ('DEV-017', 'Sony Alpha a7 IV Mirrorless', 'Camera', 210000.00, 'Available'),
      ('DEV-018', 'Microsoft Surface Pro 9', 'Tablet', 125000.00, 'Available'),
      ('DEV-019', 'Razer Blade 16 Gaming Laptop', 'Laptop', 280000.00, 'Available'),
      ('DEV-020', 'LG 65" OLED 4K TV', 'Display', 175000.00, 'Available'),
      ('DEV-021', 'Yamaha Stage Keyboard', 'Audio', 85000.00, 'Available')
      ON CONFLICT (serial_number) DO NOTHING;
    `);
    
    console.log('Successfully inserted 10 more available items.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
