const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const JWT_SECRET  = process.env.JWT_SECRET || 'device_tracker_secret_2026';
const JWT_EXPIRES = '8h';

router.post('/register', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'name, email and password required' });

    await client.query('BEGIN');
    const { rows: existing } = await client.query('SELECT id FROM users LIMIT 1');
    const role = (email === 'admin@onepoint.com' || existing.length === 0) ? 'admin' : 'customer';

    const hash = await bcrypt.hash(password, 12);
    await client.query(`INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)`, [name, email, hash, role]);

    if (role === 'customer') {
      const p = phone || '0000000000';
      await client.query(`INSERT INTO customers (name, email, phone, customer_type) VALUES ($1,$2,$3,'E-commerce Customer') ON CONFLICT DO NOTHING`, [name, email, p]);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Account created successfully. Please log in.' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Email already registered' });
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const user  = rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET, { expiresIn: JWT_EXPIRES }
    );

    await logAction({ userId: user.id, userName: user.name, action: 'LOGIN', ipAddress: req.ip });

    res.json({
      success: true, message: 'Login successful', token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'staff' } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'name, email and password required' });
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id',
      [name, email, hash, role]
    );
    res.status(201).json({ success: true, message: 'User created', id: rows[0].id });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Email already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    if (+req.params.id === req.user.id)
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;