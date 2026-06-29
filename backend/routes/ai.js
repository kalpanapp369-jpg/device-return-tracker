const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  generateDamageSummary,
  estimateRepairCost,
  draftSettlementEmail,
  chatAssistant
} = require('../utils/gemini');
const db = require('../config/db');

// ── POST /api/ai/damage-summary ───────────────────────────────────────────────
// Generate AI damage summary from condition + description
router.post('/damage-summary', requireAuth, async (req, res) => {
  try {
    const { deviceName, condition, description, repairCost } = req.body;
    if (!deviceName || !condition)
      return res.status(400).json({ success: false, message: 'deviceName and condition required' });

    const summary = await generateDamageSummary({ deviceName, condition, description, repairCost });
    res.json({ success: true, summary });
  } catch (err) {
    console.error('AI damage-summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/ai/repair-estimate ──────────────────────────────────────────────
// Get AI repair cost estimate
router.post('/repair-estimate', requireAuth, async (req, res) => {
  try {
    const { deviceName, condition, description, purchaseCost } = req.body;
    if (!deviceName || !condition)
      return res.status(400).json({ success: false, message: 'deviceName and condition required' });

    const estimate = await estimateRepairCost({ deviceName, condition, description, purchaseCost });
    res.json({ success: true, estimate });
  } catch (err) {
    console.error('AI repair-estimate error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/ai/draft-email ──────────────────────────────────────────────────
// Draft settlement email using AI
router.post('/draft-email', requireAuth, async (req, res) => {
  try {
    const { customerName, deviceName, condition, repairCost, depositAmount, refundAmount, status, notes } = req.body;
    if (!customerName || !deviceName || !status)
      return res.status(400).json({ success: false, message: 'customerName, deviceName, status required' });

    const draft = await draftSettlementEmail({ customerName, deviceName, condition, repairCost, depositAmount, refundAmount, status, notes });
    res.json({ success: true, draft });
  } catch (err) {
    console.error('AI draft-email error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
// AI chat assistant — optionally with a return record context
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { message, returnId } = req.body;
    if (!message)
      return res.status(400).json({ success: false, message: 'message required' });

    let context = null;
    if (returnId) {
      const { rows } = await db.query(`
        SELECT rr.*, c.name AS customer_name, d.device_name, rb.deposit_amount
        FROM return_records rr
        JOIN rental_bookings rb ON rr.booking_id = rb.id
        JOIN customers c ON rb.customer_id = c.id
        JOIN devices   d ON rb.device_id   = d.id
        WHERE rr.id = $1`, [returnId]);
      context = rows[0] || null;
    }

    const reply = await chatAssistant({ message, context });
    res.json({ success: true, reply });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/ai/auto-fill/:returnId ─────────────────────────────────────────
// Auto-generate + save AI summary for a return record
router.post('/auto-fill/:returnId', requireAuth, async (req, res) => {
  try {
    const { returnId } = req.params;
    const { rows } = await db.query(`
      SELECT rr.*, d.device_name, d.purchase_cost
      FROM return_records rr
      JOIN rental_bookings rb ON rr.booking_id = rb.id
      JOIN devices d ON rb.device_id = d.id
      WHERE rr.id = $1`, [returnId]);

    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Record not found' });

    const r = rows[0];

    // Run AI calls sequentially to avoid rate limits on free tier
    const summary = await generateDamageSummary({
      deviceName:  r.device_name,
      condition:   r.device_condition,
      description: r.damage_description,
      repairCost:  r.repair_cost
    });
    
    const estimate = await estimateRepairCost({
      deviceName:  r.device_name,
      condition:   r.device_condition,
      description: r.damage_description,
      purchaseCost:r.purchase_cost
    });

    // Save to DB
    await db.query(
      `UPDATE return_records SET ai_damage_summary=$1, ai_repair_estimate=$2 WHERE id=$3`,
      [summary, JSON.stringify(estimate), returnId]
    );

    res.json({
      success: true,
      message: 'AI analysis saved to record',
      data: { summary, estimate }
    });
  } catch (err) {
    console.error('AI auto-fill error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;