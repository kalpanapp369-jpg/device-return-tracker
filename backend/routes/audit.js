const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

router.get('/', requireAdmin, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const action = req.query.action || '';
    const user   = req.query.user   || '';

    let where = 'WHERE 1=1';
    const params = [];
    let pi = 1;
    if (action) { where += ` AND action=$${pi++}`; params.push(action); }
    if (user)   { where += ` AND user_name ILIKE $${pi++}`; params.push(`%${user}%`); }

    const countRes = await db.query(`SELECT COUNT(*) AS total FROM audit_logs ${where}`, params);
    const total    = parseInt(countRes.rows[0].total);

    const paramsCopy = [...params];
    paramsCopy.push(limit, offset);
    const { rows } = await db.query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${pi} OFFSET $${pi+1}`,
      paramsCopy
    );

    res.json({ success:true, total, page, limit, totalPages:Math.ceil(total/limit), data:rows });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;