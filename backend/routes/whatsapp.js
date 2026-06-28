const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../config/db');

// WhatsApp via Twilio WhatsApp Sandbox (free)
// OR via direct WhatsApp link (no API key needed for basic use)

// POST /api/whatsapp/send — send WhatsApp message via Twilio
router.post('/send', requireAuth, async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message)
      return res.status(400).json({ success:false, message:'to and message required' });

    // Option 1: Twilio WhatsApp API (if credentials set)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const msg = await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || '+14155238886'}`,
        to:   `whatsapp:${to}`,
        body: message
      });
      return res.json({ success:true, message:'WhatsApp sent via Twilio', sid:msg.sid });
    }

    // Option 2: Generate WhatsApp web link (no API needed)
    const phone   = to.replace(/\D/g,'');
    const encoded = encodeURIComponent(message);
    const waLink  = `https://wa.me/${phone}?text=${encoded}`;

    res.json({
      success:  true,
      message:  'WhatsApp link generated (Twilio not configured)',
      wa_link:  waLink,
      fallback: true
    });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/whatsapp/notify-settlement — notify customer about settlement
router.post('/notify-settlement', requireAuth, async (req, res) => {
  try {
    const { returnId } = req.body;
    const { rows } = await db.query(`
      SELECT rr.*, c.name AS customer_name, c.phone AS customer_phone,
             d.device_name, rb.deposit_amount
      FROM return_records rr
      JOIN rental_bookings rb ON rr.booking_id  = rb.id
      JOIN customers       c  ON rb.customer_id = c.id
      JOIN devices         d  ON rb.device_id   = d.id
      WHERE rr.id=$1`, [returnId]);

    if (!rows.length) return res.status(404).json({ success:false, message:'Return record not found' });
    const r = rows[0];

    const statusEmoji = r.settlement_status==='Approved' ? '✅' : r.settlement_status==='Rejected' ? '❌' : '📋';
    const message = `${statusEmoji} *One Point Solutions — Device Return Update*

Hello ${r.customer_name}!

Your device return has been processed:
📱 Device: ${r.device_name}
📦 Condition: ${r.device_condition}
🔧 Repair Cost: ₹${parseFloat(r.repair_cost||0).toFixed(2)}
💰 Deposit Refund: ₹${parseFloat(r.deposit_refund||0).toFixed(2)}
📊 Status: *${r.settlement_status}*

${r.notes ? `📝 Notes: ${r.notes}` : ''}

For queries: support@onepointsolutions.com`;

    const phone   = r.customer_phone?.replace(/\D/g,'');
    const encoded = encodeURIComponent(message);
    const waLink  = `https://wa.me/91${phone}?text=${encoded}`;

    // Try Twilio if configured
    if (process.env.TWILIO_ACCOUNT_SID && phone) {
      try {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || '+14155238886'}`,
          to:   `whatsapp:+91${phone}`,
          body: message
        });
        return res.json({ success:true, message:`WhatsApp sent to ${r.customer_name}`, via:'twilio' });
      } catch(e) { console.warn('Twilio failed, using link fallback:', e.message); }
    }

    res.json({ success:true, message:'WhatsApp link ready', wa_link:waLink, customer_name:r.customer_name, customer_phone:r.customer_phone, fallback:true });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// POST /api/whatsapp/reminder — send reminder for pending returns
router.post('/reminder', requireAuth, async (req, res) => {
  try {
    const { customerId, message } = req.body;
    const { rows } = await db.query('SELECT * FROM customers WHERE id=$1', [customerId]);
    if (!rows.length) return res.status(404).json({ success:false, message:'Customer not found' });

    const c = rows[0];
    const msg = message || `📢 *One Point Solutions Reminder*\n\nDear ${c.name},\n\nThis is a reminder regarding your device rental. Please contact us for any pending returns or queries.\n\n📞 Call us or reply here.\nTeam One Point Solutions`;

    const phone   = c.phone?.replace(/\D/g,'');
    const encoded = encodeURIComponent(msg);
    const waLink  = `https://wa.me/91${phone}?text=${encoded}`;

    res.json({ success:true, wa_link:waLink, customer_name:c.name, fallback:true });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;