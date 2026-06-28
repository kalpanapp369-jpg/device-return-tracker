const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { logAction }   = require('../utils/audit');

router.get('/', requireAuth, async (req, res) => {
  try {
    const status = req.query.status || '';
    let where = 'WHERE 1=1';
    const params = [];
    let pi = 1;
    if (status) { where += ` AND m.status=$${pi++}`; params.push(status); }
    const { rows } = await db.query(`
      SELECT m.*, d.device_name, d.serial_number, d.category,
             rr.device_condition AS return_condition
      FROM maintenance m
      LEFT JOIN devices        d  ON m.device_id  = d.id
      LEFT JOIN return_records rr ON m.return_id  = rr.id
      ${where} ORDER BY m.created_at DESC`, params);
    res.json({ success:true, count:rows.length, data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { device_id, return_id, issue_description, technician, estimated_cost, priority } = req.body;
    if (!device_id || !issue_description)
      return res.status(400).json({ success:false, message:'device_id and issue_description required' });
    const { rows } = await db.query(`
      INSERT INTO maintenance (device_id, return_id, issue_description, technician, estimated_cost, priority)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [device_id, return_id||null, issue_description, technician||null, parseFloat(estimated_cost)||0, priority||'Medium']);
    // Update device status to Under Repair
    await db.query(`UPDATE devices SET status='Under Repair' WHERE id=$1`, [device_id]);
    await logAction({ userId:req.user.id, userName:req.user.name, action:'CREATE', tableName:'maintenance', recordId:rows[0].id, newData:rows[0], ipAddress:req.ip });
    res.status(201).json({ success:true, data:rows[0] });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { issue_description, technician, estimated_cost, actual_cost, status, priority, resolution_notes } = req.body;
    const { rows } = await db.query(`
      UPDATE maintenance SET issue_description=$1, technician=$2, estimated_cost=$3,
        actual_cost=$4, status=$5, priority=$6, resolution_notes=$7,
        completed_at=CASE WHEN $5='Completed' THEN NOW() ELSE completed_at END
      WHERE id=$8 RETURNING *`,
      [issue_description, technician||null, parseFloat(estimated_cost)||0, parseFloat(actual_cost)||0, status||'Open', priority||'Medium', resolution_notes||null, req.params.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:'Not found' });
    // If completed, set device back to Available
    if (status === 'Completed') {
      await db.query(`UPDATE devices SET status='Available' WHERE id=(SELECT device_id FROM maintenance WHERE id=$1)`, [req.params.id]);
    }
    res.json({ success:true, data:rows[0] });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;