const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://return_tracker_db_user:WqfDvmg8LIJijA43TBk26qSqir54FJCw@dpg-d90kkndckfvc73dhl0r0-a.ohio-postgres.render.com/return_tracker_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDB() {
  try {
    await client.connect();
    console.log('Connected to Render PostgreSQL!');
    
    const schemaSql = `
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(15) NOT NULL,
        email VARCHAR(100),
        customer_type VARCHAR(50) DEFAULT 'Rental Customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        serial_number VARCHAR(50) UNIQUE NOT NULL,
        device_name VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        purchase_cost DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'Available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rental_bookings (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customers(id),
        device_id INT NOT NULL REFERENCES devices(id),
        rental_start DATE NOT NULL,
        rental_end DATE NOT NULL,
        deposit_amount DECIMAL(10,2) DEFAULT 0,
        rental_amount DECIMAL(10,2) DEFAULT 0,
        booking_status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS return_records (
        id SERIAL PRIMARY KEY,
        booking_id INT NOT NULL REFERENCES rental_bookings(id),
        return_date DATE NOT NULL,
        device_condition VARCHAR(50) NOT NULL,
        damage_description TEXT,
        damage_photo_url VARCHAR(255),
        repair_cost DECIMAL(10,2) DEFAULT 0,
        deposit_deduction DECIMAL(10,2) DEFAULT 0,
        deposit_refund DECIMAL(10,2) DEFAULT 0,
        settlement_status VARCHAR(20) DEFAULT 'Pending',
        approved_by VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS damage_evidence (
        id SERIAL PRIMARY KEY,
        return_id INT NOT NULL REFERENCES return_records(id),
        photo_url VARCHAR(255) NOT NULL,
        description VARCHAR(200),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      INSERT INTO customers (name, phone, email, customer_type) VALUES
      ('Ravi Kumar', '9876543210', 'ravi@email.com', 'Rental Customer'),
      ('TechCorp Events', '9988776655', 'techcorp@email.com', 'Corporate Client'),
      ('Priya Sharma', '9123456789', 'priya@email.com', 'Rental Customer')
      ON CONFLICT DO NOTHING;

      INSERT INTO devices (serial_number, device_name, category, purchase_cost) VALUES
      ('DEV-001', 'Dell Laptop 15"', 'Laptop', 55000.00),
      ('DEV-002', 'Canon DSLR Camera', 'Camera', 45000.00),
      ('DEV-003', 'iPad Pro 12.9"', 'Tablet', 80000.00),
      ('NEW-19568', 'MacBook Pro M3 Max', 'Laptop', 350000.00)
      ON CONFLICT (serial_number) DO NOTHING;
    `;
    
    await client.query(schemaSql);
    console.log('Schema created successfully!');
    
    // Test data for bookings
    await client.query(`
      INSERT INTO rental_bookings (customer_id, device_id, rental_start, rental_end, deposit_amount, rental_amount) VALUES
      (1, 1, '2026-05-01', '2026-06-01', 5000.00, 2000.00),
      (2, 2, '2026-05-15', '2026-06-15', 4000.00, 3000.00),
      (3, 3, '2026-06-01', '2026-06-30', 8000.00, 5000.00),
      (1, 4, '2026-06-01', '2026-06-15', 50000.00, 10000.00)
      ON CONFLICT DO NOTHING;
    `);
    console.log('Test bookings inserted!');
    
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await client.end();
  }
}

initDB();
