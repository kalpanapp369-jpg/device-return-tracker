const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { logAction }   = require('../utils/audit');

// GET all KYC records
router.get('/', requireAuth, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    let where = 'WHERE 1=1';
    const params = [];
    let pi = 1;
    if (search) {
      where += ` AND (c.name ILIKE $${pi} OR c.phone ILIKE $${pi} OR c.email ILIKE $${pi})`;
      params.push(`%${search}%`); pi++;
    }
    const countRes = await db.query(`SELECT COUNT(*) AS total FROM kyc_records k JOIN customers c ON k.customer_id=c.id ${where}`, params);
    const total    = parseInt(countRes.rows[0].total);
    const paramsCopy = [...params, limit, offset];
    const { rows } = await db.query(`
      SELECT k.*, c.name AS customer_name, c.phone, c.email, c.customer_type
      FROM kyc_records k
      JOIN customers c ON k.customer_id = c.id
      ${where} ORDER BY k.created_at DESC LIMIT $${pi} OFFSET $${pi+1}`, paramsCopy);
    res.json({ success:true, total, page, limit, totalPages:Math.ceil(total/limit), data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET single KYC record
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT k.*, c.name AS customer_name, c.phone, c.email, c.customer_type
      FROM kyc_records k JOIN customers c ON k.customer_id=c.id WHERE k.id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:'Not found' });
    res.json({ success:true, data:rows[0] });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// CREATE KYC record
router.post('/', requireAuth, async (req, res) => {
  try {
    const { customer_id, id_type, id_number, address, agreement_signed, deposit_paid, deposit_amount, notes } = req.body;
    if (!customer_id || !id_type || !id_number)
      return res.status(400).json({ success:false, message:'customer_id, id_type, id_number required' });
    const { rows } = await db.query(`
      INSERT INTO kyc_records (customer_id, id_type, id_number, address, agreement_signed, deposit_paid, deposit_amount, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [customer_id, id_type, id_number, address||null, agreement_signed||false, deposit_paid||false, parseFloat(deposit_amount)||0, notes||null]);
    await logAction({ userId:req.user.id, userName:req.user.name, action:'CREATE', tableName:'kyc_records', recordId:rows[0].id, newData:rows[0], ipAddress:req.ip });
    res.status(201).json({ success:true, message:'KYC record created', data:rows[0] });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// UPDATE KYC
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id_type, id_number, address, agreement_signed, deposit_paid, deposit_amount, kyc_status, notes } = req.body;
    const { rows } = await db.query(`
      UPDATE kyc_records SET id_type=$1, id_number=$2, address=$3, agreement_signed=$4,
        deposit_paid=$5, deposit_amount=$6, kyc_status=$7, notes=$8 WHERE id=$9 RETURNING *`,
      [id_type, id_number, address||null, agreement_signed, deposit_paid, parseFloat(deposit_amount)||0, kyc_status||'Pending', notes||null, req.params.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:'Not found' });
    await logAction({ userId:req.user.id, userName:req.user.name, action:'UPDATE', tableName:'kyc_records', recordId:+req.params.id, newData:rows[0], ipAddress:req.ip });
    res.json({ success:true, message:'KYC updated', data:rows[0] });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET all customers (for dropdown)
router.get('/meta/customers', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT id, name, phone, email, customer_type FROM customers ORDER BY name ASC`);
    res.json({ success:true, data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

const { sendKYCOtpEmail } = require('../utils/mailer');

// In-memory cache for OTPs
const otpStore = new Map();

// Generate and send OTP
router.post('/send-otp', requireAuth, async (req, res) => {
  try {
    const { customer_id } = req.body;
    if (!customer_id) return res.status(400).json({ success: false, message: 'Customer ID required' });

    const { rows } = await db.query('SELECT name, email, phone FROM customers WHERE id = $1', [customer_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Customer not found' });
    
    const customer = rows[0];
    const email = customer.email;
    if (!email) return res.status(400).json({ success: false, message: 'Customer has no email registered' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    
    // Store OTP in memory with 10 min expiry
    otpStore.set(customer_id.toString(), { otp, expires: Date.now() + 10 * 60000 });

    // Send via email
    await sendKYCOtpEmail({ to: email, customerName: customer.name, otp });
    
    res.json({ success: true, message: `OTP sent to email (${email}) and phone` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify OTP
router.post('/verify-otp', requireAuth, async (req, res) => {
  try {
    const { customer_id, otp } = req.body;
    if (!customer_id || !otp) return res.status(400).json({ success: false, message: 'Customer ID and OTP required' });

    const record = otpStore.get(customer_id.toString());
    if (!record) return res.status(400).json({ success: false, message: 'No OTP generated or expired' });
    
    if (Date.now() > record.expires) {
      otpStore.delete(customer_id.toString());
      return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP matches! Clear it.
    otpStore.delete(customer_id.toString());
    
    res.json({ success: true, message: 'OTP Verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;