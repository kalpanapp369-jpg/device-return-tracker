const express = require('express');
const router  = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateReturnRecord }      = require('../middleware/validate');
const { logAction }                 = require('../utils/audit');
const db = require('../config/db');

function calculateDeduction(repairCost, depositAmount) {
  const cost    = parseFloat(repairCost)    || 0;
  const deposit = parseFloat(depositAmount) || 0;
  return { deduction: Math.min(cost, deposit), refund: Math.max(0, deposit - Math.min(cost, deposit)) };
}

const BASE_SELECT = `
  SELECT rr.*,
    rb.rental_start, rb.rental_end, rb.deposit_amount,
    c.name AS customer_name, c.phone AS customer_phone,
    d.device_name, d.serial_number, d.purchase_cost
  FROM return_records rr
  JOIN rental_bookings rb ON rr.booking_id  = rb.id
  JOIN customers       c  ON rb.customer_id = c.id
  JOIN devices         d  ON rb.device_id   = d.id`;

// ── GET /api/returns/track/:identifier (PUBLIC) ──────────────────────────────
router.get('/track/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const query = `
      SELECT rr.id, rr.booking_id, rr.return_date, rr.device_condition, rr.repair_cost, rr.deposit_deduction, rr.deposit_refund, rr.settlement_status, rr.ai_damage_summary,
        d.device_name, d.serial_number, c.name AS customer_name,
        rb.rental_start, rb.rental_end, rb.deposit_amount
      FROM return_records rr
      JOIN rental_bookings rb ON rr.booking_id = rb.id
      JOIN devices d ON rb.device_id = d.id
      JOIN customers c ON rb.customer_id = c.id
      WHERE rr.booking_id::text = $1 OR d.serial_number = $1
      ORDER BY rr.created_at DESC LIMIT 1`;
      
    const { rows } = await db.query(query, [identifier]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'No return record found for this identifier.' });
    
    const photoRes = await db.query('SELECT photo_url FROM damage_evidence WHERE return_id = $1', [rows[0].id]);
    rows[0].photos = photoRes.rows.map(r => r.photo_url);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/returns ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, condition, search, from, to } = req.query;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const sort   = ['created_at','return_date','repair_cost','settlement_status','device_condition']
                    .includes(req.query.sort) ? req.query.sort : 'created_at';
    const order  = req.query.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    let where  = 'WHERE 1=1';
    const params = [];
    let pi = 1;

    if (status)    { where += ` AND rr.settlement_status = $${pi++}`; params.push(status); }
    if (condition) { where += ` AND rr.device_condition  = $${pi++}`; params.push(condition); }
    if (from)      { where += ` AND rr.return_date >= $${pi++}`;      params.push(from); }
    if (to)        { where += ` AND rr.return_date <= $${pi++}`;      params.push(to); }
    if (search) {
      where += ` AND (c.name ILIKE $${pi} OR d.device_name ILIKE $${pi} OR d.serial_number ILIKE $${pi} OR CAST(rr.booking_id AS TEXT) ILIKE $${pi})`;
      params.push(`%${search}%`); pi++;
    }

    const base = `FROM return_records rr JOIN rental_bookings rb ON rr.booking_id=rb.id JOIN customers c ON rb.customer_id=c.id JOIN devices d ON rb.device_id=d.id ${where}`;

    const countRes = await db.query(`SELECT COUNT(*) AS total ${base}`, params);
    const total    = parseInt(countRes.rows[0].total);

    const dataRes  = await db.query(
      `${BASE_SELECT} ${where} ORDER BY rr.${sort} ${order} LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ success:true, count:dataRes.rows.length, total, page, limit, totalPages:Math.ceil(total/limit), data:dataRes.rows });
  } catch (err) {
    console.error('GET /returns:', err);
    res.status(500).json({ success:false, message:err.message });
  }
});

// ── GET /api/returns/booking-lookup ──────────────────────────────────────────
router.get('/booking-lookup', requireAuth, async (req, res) => {
  try {
    const { serial } = req.query;
    if (!serial) return res.status(400).json({ success:false, message:'serial required' });
    const { rows } = await db.query(`
      SELECT rb.id AS booking_id, rb.deposit_amount, rb.rental_start, rb.rental_end, rb.booking_status,
             c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
             d.device_name, d.serial_number, d.category, d.purchase_cost
      FROM rental_bookings rb
      JOIN customers c ON rb.customer_id=c.id
      JOIN devices   d ON rb.device_id=d.id
      WHERE d.serial_number=$1
      ORDER BY rb.id DESC LIMIT 1`, [serial]);
    if (!rows.length) return res.status(404).json({ success:false, message:`No booking for serial: ${serial}` });
    res.json({ success:true, data:rows[0] });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// ── GET /api/returns/:id ──────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`${BASE_SELECT} WHERE rr.id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:'Not found' });
    res.json({ success:true, data:rows[0] });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// ── POST /api/returns ─────────────────────────────────────────────────────────
router.post('/', requireAuth, validateReturnRecord, async (req, res) => {
  try {
    const { booking_id, return_date, device_condition, damage_description, repair_cost, notes } = req.body;

    const { rows: bookings } = await db.query(
      `SELECT id, deposit_amount, booking_status FROM rental_bookings WHERE id=$1`, [booking_id]
    );
    if (!bookings.length) return res.status(404).json({ success:false, message:`Booking #${booking_id} not found` });
    if (bookings[0].booking_status === 'Returned') return res.status(400).json({ success:false, message:`Booking #${booking_id} already returned` });

    const deposit = parseFloat(bookings[0].deposit_amount) || 0;
    const { deduction, refund } = calculateDeduction(repair_cost || 0, deposit);

    const { rows } = await db.query(`
      INSERT INTO return_records
        (booking_id, return_date, device_condition, damage_description, repair_cost, deposit_deduction, deposit_refund, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [booking_id, return_date, device_condition, damage_description||null, parseFloat(repair_cost)||0, deduction, refund, notes||null]
    );

    await db.query(`UPDATE rental_bookings SET booking_status='Returned' WHERE id=$1`, [booking_id]);

    const { rows: created } = await db.query(`${BASE_SELECT} WHERE rr.id=$1`, [rows[0].id]);

    await logAction({ userId:req.user.id, userName:req.user.name, action:'CREATE', tableName:'return_records', recordId:rows[0].id, newData:created[0], ipAddress:req.ip });

    res.status(201).json({ success:true, message:'Return record created', data:created[0] });
  } catch (err) {
    console.error('POST /returns:', err);
    res.status(500).json({ success:false, message:err.message });
  }
});

// ── PUT /api/returns/:id ──────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { return_date, device_condition, damage_description, repair_cost, settlement_status, notes } = req.body;
    if (!return_date || !device_condition) return res.status(400).json({ success:false, message:'return_date and device_condition required' });

    const { rows: old } = await db.query(`SELECT * FROM return_records WHERE id=$1`, [id]);
    if (!old.length) return res.status(404).json({ success:false, message:`Record #${id} not found` });

    const { rows: bkng } = await db.query(`SELECT deposit_amount FROM rental_bookings WHERE id=$1`, [old[0].booking_id]);
    const { deduction, refund } = calculateDeduction(repair_cost||0, bkng[0]?.deposit_amount||0);

    await db.query(`
      UPDATE return_records SET
        return_date=$1, device_condition=$2, damage_description=$3,
        repair_cost=$4, deposit_deduction=$5, deposit_refund=$6,
        settlement_status=$7, notes=$8
      WHERE id=$9`,
      [return_date, device_condition, damage_description||null, parseFloat(repair_cost)||0, deduction, refund, settlement_status||'Pending', notes||null, id]
    );

    const { rows: fresh } = await db.query(`${BASE_SELECT} WHERE rr.id=$1`, [id]);
    await logAction({ userId:req.user.id, userName:req.user.name, action:'UPDATE', tableName:'return_records', recordId:+id, oldData:old[0], newData:fresh[0], ipAddress:req.ip });

    res.json({ success:true, message:'Updated', data:fresh[0] });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// ── DELETE /api/returns/:id (admin only) ──────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { rows: old } = await db.query(`SELECT * FROM return_records WHERE id=$1`, [id]);
    if (!old.length) return res.status(404).json({ success:false, message:`Record #${id} not found` });

    await db.query(`UPDATE rental_bookings SET booking_status='Active' WHERE id=$1`, [old[0].booking_id]);
    await db.query(`DELETE FROM return_records WHERE id=$1`, [id]);

    await logAction({ userId:req.user.id, userName:req.user.name, action:'DELETE', tableName:'return_records', recordId:+id, oldData:old[0], ipAddress:req.ip });

    res.json({ success:true, message:`Record #${id} deleted` });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

module.exports = router;