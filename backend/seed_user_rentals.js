const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://return_tracker_db_user:WqfDvmg8LIJijA43TBk26qSqir54FJCw@dpg-d90kkndckfvc73dhl0r0-a.ohio-postgres.render.com/return_tracker_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    
    // Add bookings for peddamariveedukalpana@gmail.com
    let userRes = await client.query("SELECT id FROM customers WHERE email = 'peddamariveedukalpana@gmail.com'");
    if (userRes.rows.length === 0) {
      console.log('Customer peddamariveedukalpana@gmail.com not found in customers table, inserting...');
      await client.query("INSERT INTO customers (name, email, phone, customer_type) VALUES ('peddamariveedu.kalpana', 'peddamariveedukalpana@gmail.com', '0000000000', 'Rental Customer')");
      userRes = await client.query("SELECT id FROM customers WHERE email = 'peddamariveedukalpana@gmail.com'");
    }
    const customerId2 = userRes.rows[0].id;

    // Fetch some available devices
    const deviceRes = await client.query("SELECT id FROM devices WHERE status = 'Available' LIMIT 6");
    const devices = deviceRes.rows;

    for (let i = 0; i < devices.length; i++) {
      const devId = devices[i].id;
      await client.query(`
        INSERT INTO rental_bookings (customer_id, device_id, rental_start, rental_end, deposit_amount, rental_amount, booking_status)
        VALUES ($1, $2, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '5 days', 15000, 5000, 'Active')
      `, [customerId2, devId]);
      await client.query("UPDATE devices SET status = 'Rented' WHERE id = $1", [devId]);
    }
    
    console.log(`Successfully added ${devices.length} rentals to peddamariveedukalpana's account!`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
