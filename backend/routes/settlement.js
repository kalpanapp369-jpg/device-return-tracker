const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAuth }        = require('../middleware/auth');
const { logAction }          = require('../utils/audit');
const { sendSettlementEmail }= require('../utils/mailer');
const { draftSettlementEmail}= require('../utils/gemini');

async function getRecord(id) {
  const { rows } = await db.query(`
    SELECT rr.*, c.name AS customer_name, c.email AS customer_email,
           d.device_name, rb.deposit_amount
    FROM return_records rr
    JOIN rental_bookings rb ON rr.booking_id  = rb.id
    JOIN customers       c  ON rb.customer_id = c.id
    JOIN devices         d  ON rb.device_id   = d.id
    WHERE rr.id=$1`, [id]);
  return rows[0] || null;
}

router.put('/:id/approve', requireAuth, async (req, res) => {
  try {
    const record = await getRecord(req.params.id);
    if (!record) return res.status(404).json({ success:false, message:'Not found' });
    if (record.settlement_status === 'Settled') return res.status(400).json({ success:false, message:'Already settled' });

    const { notes } = req.body;

    // AI draft email
    let aiDraftBody = null;
    try {
      aiDraftBody = await draftSettlementEmail({
        customerName: record.customer_name, deviceName: record.device_name,
        condition: record.device_condition, repairCost: record.repair_cost,
        depositAmount: record.deposit_amount, refundAmount: record.deposit_refund,
        status: 'Approved', notes
      });
    } catch(e) { console.warn('AI email draft failed:', e.message); }

    await db.query(
      `UPDATE return_records SET settlement_status='Approved', approved_by=$1, notes=COALESCE($2,notes) WHERE id=$3`,
      [req.user.name, notes||null, req.params.id]
    );
    await logAction({ userId:req.user.id, userName:req.user.name, action:'APPROVE', tableName:'return_records', recordId:+req.params.id, ipAddress:req.ip });

    try {
      await sendSettlementEmail({
        to:record.customer_email, customerName:record.customer_name, deviceName:record.device_name,
        recordId:record.id, status:'Approved', refund:record.deposit_refund,
        deduction:record.deposit_deduction, notes, aiDraftBody
      });
    } catch(e) { console.warn('Email failed:', e.message); }

    res.json({ success:true, message:`Record #${req.params.id} approved. AI email sent.`, aiDraft:aiDraftBody });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

router.put('/:id/reject', requireAuth, async (req, res) => {
  try {
    const record = await getRecord(req.params.id);
    if (!record) return res.status(404).json({ success:false, message:'Not found' });

    const { reason } = req.body;

    let aiDraftBody = null;
    try {
      aiDraftBody = await draftSettlementEmail({
        customerName:record.customer_name, deviceName:record.device_name,
        condition:record.device_condition, repairCost:record.repair_cost,
        depositAmount:record.deposit_amount, refundAmount:0,
        status:'Rejected', notes:reason
      });
    } catch(e) {}

    await db.query(
      `UPDATE return_records SET settlement_status='Rejected', approved_by=$1, notes=$2 WHERE id=$3`,
      [req.user.name, reason||'Rejected by admin', req.params.id]
    );
    await logAction({ userId:req.user.id, userName:req.user.name, action:'REJECT', tableName:'return_records', recordId:+req.params.id, ipAddress:req.ip });

    try {
      await sendSettlementEmail({
        to:record.customer_email, customerName:record.customer_name, deviceName:record.device_name,
        recordId:record.id, status:'Rejected', refund:0,
        deduction:record.deposit_deduction, notes:reason, aiDraftBody
      });
    } catch(e) {}

    res.json({ success:true, message:`Record #${req.params.id} rejected.` });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

router.put('/:id/settle', requireAuth, async (req, res) => {
  try {
    await db.query(`UPDATE return_records SET settlement_status='Settled', approved_by=$1 WHERE id=$2`, [req.user.name, req.params.id]);
    await logAction({ userId:req.user.id, userName:req.user.name, action:'SETTLE', tableName:'return_records', recordId:+req.params.id, ipAddress:req.ip });
    res.json({ success:true, message:`Record #${req.params.id} settled.` });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;