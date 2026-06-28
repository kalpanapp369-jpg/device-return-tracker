const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../config/db');

// GET all active bookings
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT rb.*, c.name as customer_name, c.phone as customer_phone, d.device_name, d.serial_number 
      FROM rental_bookings rb
      JOIN customers c ON rb.customer_id = c.id
      JOIN devices d ON rb.device_id = d.id
      ORDER BY rb.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET all customers (for dropdown)
router.get('/customers', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT id, name, phone FROM customers ORDER BY name ASC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET available devices (for dropdown)
router.get('/devices', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT id, device_name, serial_number, purchase_cost FROM devices WHERE status = 'Available' ORDER BY device_name ASC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create a new booking
router.post('/', requireAuth, async (req, res) => {
  const client = await db.pool.connect(); // use pool connect for transaction
  try {
    await client.query('BEGIN');
    
    const { 
      customerId, customerName, customerPhone, customerEmail,
      deviceId, deviceName, deviceSerial, deviceCost,
      rentalStart, rentalEnd, depositAmount, rentalAmount
    } = req.body;

    let finalCustomerId = customerId;
    let finalDeviceId = deviceId;

    // 1. Create customer if not provided
    if (!finalCustomerId) {
      if (!customerName || !customerPhone) throw new Error("Customer Name and Phone required for new customer");
      const cRes = await client.query(
        `INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3) RETURNING id`,
        [customerName, customerPhone, customerEmail || null]
      );
      finalCustomerId = cRes.rows[0].id;
    }

    // 2. Create device if not provided
    if (!finalDeviceId) {
      if (!deviceName || !deviceSerial || !deviceCost) throw new Error("Device Name, Serial, and Cost required for new device");
      const dRes = await client.query(
        `INSERT INTO devices (device_name, serial_number, purchase_cost, status, category) VALUES ($1, $2, $3, 'Rented', 'Electronics') RETURNING id`,
        [deviceName, deviceSerial, deviceCost]
      );
      finalDeviceId = dRes.rows[0].id;
    } else {
      // Update existing device to Rented
      await client.query(`UPDATE devices SET status = 'Rented' WHERE id = $1`, [finalDeviceId]);
    }

    // 3. Create booking
    const bRes = await client.query(
      `INSERT INTO rental_bookings (customer_id, device_id, rental_start, rental_end, deposit_amount, rental_amount, booking_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Active') RETURNING *`,
      [finalCustomerId, finalDeviceId, rentalStart, rentalEnd, depositAmount || 0, rentalAmount || 0]
    );

    // 4. Auto-create Logistics Delivery Task
    await client.query(
      `INSERT INTO logistics (customer_id, device_id, type, scheduled_date, status, notes)
       VALUES ($1, $2, 'Delivery', $3, 'Scheduled', 'Auto-created from new booking')`,
      [finalCustomerId, finalDeviceId, rentalStart]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Booking created successfully', data: bRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
