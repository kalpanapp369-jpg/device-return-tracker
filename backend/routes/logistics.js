const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { logAction }   = require('../utils/audit');

router.get('/', requireAuth, async (req, res) => {
  try {
    const status = req.query.status || '';
    const type   = req.query.type   || '';
    let where = 'WHERE 1=1';
    const params = [];
    let pi = 1;
    if (status) { where += ` AND l.status=$${pi++}`; params.push(status); }
    if (type)   { where += ` AND l.type=$${pi++}`;   params.push(type); }
    const { rows } = await db.query(`
      SELECT l.*, c.name AS customer_name, c.phone AS customer_phone,
             d.device_name, d.serial_number
      FROM logistics l
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN devices   d ON l.device_id   = d.id
      ${where} ORDER BY l.scheduled_date ASC, l.scheduled_time ASC`, params);
    res.json({ success:true, count:rows.length, data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { customer_id, device_id, type, scheduled_date, scheduled_time, address, assigned_to, notes } = req.body;
    if (!customer_id || !type || !scheduled_date)
      return res.status(400).json({ success:false, message:'customer_id, type, scheduled_date required' });
    const { rows } = await db.query(`
      INSERT INTO logistics (customer_id, device_id, type, scheduled_date, scheduled_time, address, assigned_to, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [customer_id, device_id||null, type, scheduled_date, scheduled_time||null, address||null, assigned_to||null, notes||null]);
    await logAction({ userId:req.user.id, userName:req.user.name, action:'CREATE', tableName:'logistics', recordId:rows[0].id, newData:rows[0], ipAddress:req.ip });
    res.status(201).json({ success:true, data:rows[0] });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { scheduled_date, scheduled_time, address, assigned_to, status, notes } = req.body;
    const { rows } = await db.query(`
      UPDATE logistics SET scheduled_date=$1, scheduled_time=$2, address=$3,
        assigned_to=$4, status=$5, notes=$6 WHERE id=$7 RETURNING *`,
      [scheduled_date, scheduled_time||null, address||null, assigned_to||null, status||'Scheduled', notes||null, req.params.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:'Not found' });
    res.json({ success:true, data:rows[0] });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM logistics WHERE id=$1', [req.params.id]);
    res.json({ success:true, message:'Deleted' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;