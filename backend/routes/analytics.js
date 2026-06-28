const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAuth } = require('../middleware/auth');

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*)                                                      AS total_returns,
        COALESCE(SUM(repair_cost),0)                                  AS total_repair_cost,
        COALESCE(SUM(deposit_refund),0)                               AS total_refunded,
        COALESCE(SUM(deposit_deduction),0)                            AS total_deducted,
        SUM(CASE WHEN settlement_status='Pending'  THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN settlement_status='Approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN settlement_status='Settled'  THEN 1 ELSE 0 END) AS settled,
        SUM(CASE WHEN settlement_status='Rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN device_condition='Good'            THEN 1 ELSE 0 END) AS cond_good,
        SUM(CASE WHEN device_condition='Minor Scratches' THEN 1 ELSE 0 END) AS cond_minor,
        SUM(CASE WHEN device_condition='Major Damage'    THEN 1 ELSE 0 END) AS cond_major,
        SUM(CASE WHEN device_condition='Non-Functional'  THEN 1 ELSE 0 END) AS cond_nonfunc
      FROM return_records`);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/monthly', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        TO_CHAR(return_date,'YYYY-MM')          AS month,
        TO_CHAR(return_date,'Mon YYYY')         AS month_label,
        COUNT(*)                                AS total,
        COALESCE(SUM(repair_cost),0)            AS repair_cost,
        COALESCE(SUM(deposit_refund),0)         AS refunded,
        SUM(CASE WHEN device_condition='Good'            THEN 1 ELSE 0 END) AS good,
        SUM(CASE WHEN device_condition='Minor Scratches' THEN 1 ELSE 0 END) AS minor,
        SUM(CASE WHEN device_condition='Major Damage'    THEN 1 ELSE 0 END) AS major,
        SUM(CASE WHEN device_condition='Non-Functional'  THEN 1 ELSE 0 END) AS nonfunc
      FROM return_records
      WHERE return_date >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(return_date,'YYYY-MM'), TO_CHAR(return_date,'Mon YYYY')
      ORDER BY month ASC`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/top-devices', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT d.device_name, d.serial_number,
             COUNT(rr.id)              AS return_count,
             COALESCE(SUM(rr.repair_cost),0)  AS total_repair_cost,
             COALESCE(AVG(rr.repair_cost),0)  AS avg_repair_cost
      FROM return_records rr
      JOIN rental_bookings rb ON rr.booking_id = rb.id
      JOIN devices         d  ON rb.device_id  = d.id
      GROUP BY d.id, d.device_name, d.serial_number
      ORDER BY return_count DESC LIMIT 5`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/recent-activity', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT rr.id, rr.device_condition, rr.settlement_status,
             rr.repair_cost, rr.return_date, rr.created_at,
             c.name AS customer_name, d.device_name
      FROM return_records rr
      JOIN rental_bookings rb ON rr.booking_id  = rb.id
      JOIN customers       c  ON rb.customer_id = c.id
      JOIN devices         d  ON rb.device_id   = d.id
      ORDER BY rr.created_at DESC LIMIT 8`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;