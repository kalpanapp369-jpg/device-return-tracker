const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../config/db');

// Ensure user is a customer
const requireCustomer = (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'Customer access required' });
  }
  next();
};

// GET available devices
router.get('/devices', requireAuth, requireCustomer, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT id, device_name, serial_number, category, purchase_cost FROM devices WHERE status = 'Available' ORDER BY device_name ASC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET my rentals
router.get('/my-rentals', requireAuth, requireCustomer, async (req, res) => {
  try {
    const { rows: custRows } = await db.query('SELECT id FROM customers WHERE email = $1 LIMIT 1', [req.user.email]);
    if (!custRows.length) return res.status(404).json({ success: false, message: 'Customer record not found' });
    const customerId = custRows[0].id;

    const query = `
      SELECT rb.id as booking_id, rb.rental_start, rb.rental_end, rb.booking_status, rb.deposit_amount,
             d.device_name, d.serial_number,
             rr.id as return_id, rr.settlement_status, rr.deposit_refund, rr.device_condition
      FROM rental_bookings rb
      JOIN devices d ON rb.device_id = d.id
      LEFT JOIN return_records rr ON rr.booking_id = rb.id
      WHERE rb.customer_id = $1
      ORDER BY rb.created_at DESC
    `;
    const { rows } = await db.query(query, [customerId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST rent a device
router.post('/rent', requireAuth, requireCustomer, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { deviceId, rentalStart, rentalEnd, depositAmount } = req.body;
    if (!deviceId || !rentalStart || !rentalEnd) return res.status(400).json({ success: false, message: 'Missing required fields' });

    await client.query('BEGIN');
    
    // Find customer_id
    const { rows: custRows } = await client.query('SELECT id FROM customers WHERE email = $1 LIMIT 1', [req.user.email]);
    if (!custRows.length) throw new Error('Customer record not found in system.');
    const customerId = custRows[0].id;

    // Check device availability
    const { rows: devRows } = await client.query('SELECT id, status FROM devices WHERE id = $1 FOR UPDATE', [deviceId]);
    if (!devRows.length || devRows[0].status !== 'Available') throw new Error('Device is not available.');

    // Update device
    await client.query(`UPDATE devices SET status = 'Rented' WHERE id = $1`, [deviceId]);

    // Create booking
    const bRes = await client.query(
      `INSERT INTO rental_bookings (customer_id, device_id, rental_start, rental_end, deposit_amount, booking_status)
       VALUES ($1, $2, $3, $4, $5, 'Active') RETURNING *`,
      [customerId, deviceId, rentalStart, rentalEnd, depositAmount || 0]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Device rented successfully!', data: bRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
