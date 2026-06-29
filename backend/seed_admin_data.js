const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://return_tracker_db_user:WqfDvmg8LIJijA43TBk26qSqir54FJCw@dpg-d90kkndckfvc73dhl0r0-a.ohio-postgres.render.com/return_tracker_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB. Seeding sample data for Admin Panel...');

    // Add Customers
    await client.query(`
      INSERT INTO customers (name, email, phone, customer_type) VALUES
      ('Anil Kumar', 'anil.kumar@example.com', '9876543211', 'Corporate Client'),
      ('Suresh Reddy', 'suresh.reddy@example.com', '9876543212', 'Event Organizer'),
      ('Neha Sharma', 'neha.sharma@example.com', '9876543213', 'Rental Customer')
      ON CONFLICT DO NOTHING;
    `);

    const custRes = await client.query('SELECT id FROM customers LIMIT 5');
    const custIds = custRes.rows.map(r => r.id);

    const devRes = await client.query('SELECT id FROM devices LIMIT 5');
    const devIds = devRes.rows.map(r => r.id);

    if (custIds.length < 3 || devIds.length < 3) {
      console.log('Not enough customers or devices to seed returns.');
      return;
    }

    // Add Bookings
    await client.query(`
      INSERT INTO rental_bookings (customer_id, device_id, rental_start, rental_end, deposit_amount, rental_amount, booking_status) VALUES
      ($1, $2, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '2 days', 50000, 15000, 'Returned'),
      ($3, $4, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '1 day', 20000, 5000, 'Returned'),
      ($1, $5, CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE - INTERVAL '5 days', 100000, 30000, 'Returned')
    `, [custIds[0], devIds[0], custIds[1], devIds[1], devIds[2]]); // Added specific device indexing

    const bookRes = await client.query("SELECT id FROM rental_bookings WHERE booking_status = 'Returned' LIMIT 3");
    const bookIds = bookRes.rows.map(r => r.id);

    // Add Return Records
    if (bookIds.length >= 3) {
      await client.query(`
        INSERT INTO return_records (booking_id, return_date, device_condition, damage_description, repair_cost, deposit_deduction, deposit_refund, settlement_status, notes) VALUES
        ($1, CURRENT_DATE - INTERVAL '1 day', 'Minor Scratches', 'Scratches on back cover', 1500, 1500, 48500, 'Pending', 'Waiting for admin approval'),
        ($2, CURRENT_DATE - INTERVAL '2 days', 'Major Damage', 'Screen cracked heavily', 12000, 12000, 8000, 'Pending', 'Requires full screen replacement'),
        ($3, CURRENT_DATE - INTERVAL '4 days', 'Good', 'No damage found', 0, 0, 100000, 'Settled', 'Refund processed successfully')
      `, [bookIds[0], bookIds[1], bookIds[2]]);
      
      const retRes = await client.query("SELECT id FROM return_records LIMIT 3");
      const retIds = retRes.rows.map(r => r.id);

      // Add Damage Evidence
      await client.query(`
        INSERT INTO damage_evidence (return_id, photo_url, description) VALUES
        ($1, 'https://images.unsplash.com/photo-1592837339739-688924b22c7a?q=80&w=200', 'Scratch mark'),
        ($2, 'https://images.unsplash.com/photo-1574342551469-8eab51ce7c01?q=80&w=200', 'Cracked display')
      `, [retIds[0], retIds[1]]);
    }

    console.log('Successfully seeded admin sample data!');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await client.end();
  }
}

run();
