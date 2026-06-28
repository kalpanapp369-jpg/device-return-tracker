const db = require('../config/db');

// ── Helpers ──────────────────────────────────────────────────────────────────

function calculateDeduction(repairCost, depositAmount) {
  const cost    = parseFloat(repairCost)    || 0;
  const deposit = parseFloat(depositAmount) || 0;
  const deduction = Math.min(cost, deposit);
  const refund    = deposit - deduction;
  return { deduction, refund };
}

function generateDamageSummary(condition, description) {
  if (condition === 'Good')            return 'Device returned in good condition. Full deposit will be refunded.';
  if (condition === 'Minor Scratches') return `Minor cosmetic damage. ${description || 'Scratches noted.'}`;
  if (condition === 'Major Damage')    return `Significant damage. ${description || 'Structural damage.'}`;
  if (condition === 'Non-Functional')  return `Device non-functional. ${description || 'Does not power on.'}`;
  return description || 'Condition noted.';
}

// ── Model ─────────────────────────────────────────────────────────────────────

const ReturnRecord = {

  async getAll() {
    const [rows] = await db.execute(`
      SELECT rr.*,
        rb.rental_start, rb.rental_end, rb.deposit_amount,
        c.name AS customer_name, c.phone AS customer_phone,
        d.device_name, d.serial_number
      FROM return_records rr
      JOIN rental_bookings rb ON rr.booking_id  = rb.id
      JOIN customers       c  ON rb.customer_id = c.id
      JOIN devices         d  ON rb.device_id   = d.id
      ORDER BY rr.created_at DESC
    `);
    return rows;
  },

  async getById(id) {
    const [rows] = await db.execute(`
      SELECT rr.*,
        rb.rental_start, rb.rental_end, rb.deposit_amount,
        c.name AS customer_name, c.phone AS customer_phone,
        d.device_name, d.serial_number
      FROM return_records rr
      JOIN rental_bookings rb ON rr.booking_id  = rb.id
      JOIN customers       c  ON rb.customer_id = c.id
      JOIN devices         d  ON rb.device_id   = d.id
      WHERE rr.id = ?
    `, [id]);
    return rows[0] || null;
  },

  async create(data) {
    const {
      booking_id, return_date, device_condition,
      damage_description = null, repair_cost = 0,
      deposit_amount = 0, notes = null
    } = data;

    const { deduction, refund } = calculateDeduction(repair_cost, deposit_amount);
    const summary = generateDamageSummary(device_condition, damage_description);

    const [result] = await db.execute(`
      INSERT INTO return_records
        (booking_id, return_date, device_condition, damage_description,
         repair_cost, deposit_deduction, deposit_refund, notes, settlement_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `, [
      booking_id, return_date, device_condition,
      damage_description || summary,
      parseFloat(repair_cost) || 0, deduction, refund, notes
    ]);

    await db.execute(
      `UPDATE rental_bookings SET booking_status = 'Returned' WHERE id = ?`,
      [booking_id]
    );

    return result.insertId;
  },

  // ── UPDATE ────────────────────────────────────────────────────────────────
  async update(id, data) {
    const {
      return_date, device_condition,
      damage_description = null, repair_cost = 0,
      settlement_status, notes = null
    } = data;

    // Get current deposit amount from booking
    const [rows] = await db.execute(
      `SELECT rb.deposit_amount FROM return_records rr
       JOIN rental_bookings rb ON rr.booking_id = rb.id
       WHERE rr.id = ?`, [id]
    );
    if (rows.length === 0) return false;

    const { deduction, refund } = calculateDeduction(repair_cost, rows[0].deposit_amount);

    const [result] = await db.execute(`
      UPDATE return_records SET
        return_date        = ?,
        device_condition   = ?,
        damage_description = ?,
        repair_cost        = ?,
        deposit_deduction  = ?,
        deposit_refund     = ?,
        settlement_status  = ?,
        notes              = ?
      WHERE id = ?
    `, [
      return_date, device_condition,
      damage_description, parseFloat(repair_cost) || 0,
      deduction, refund,
      settlement_status || 'Pending',
      notes, id
    ]);

    return result.affectedRows > 0;
  },

  // ── DELETE ────────────────────────────────────────────────────────────────
  async delete(id) {
    // Get booking_id first so we can revert booking status
    const [rows] = await db.execute(
      `SELECT booking_id FROM return_records WHERE id = ?`, [id]
    );
    if (rows.length === 0) return false;

    const booking_id = rows[0].booking_id;

    // Delete the return record
    const [result] = await db.execute(
      `DELETE FROM return_records WHERE id = ?`, [id]
    );

    // Revert booking back to Active
    if (result.affectedRows > 0) {
      await db.execute(
        `UPDATE rental_bookings SET booking_status = 'Active' WHERE id = ?`,
        [booking_id]
      );
    }

    return result.affectedRows > 0;
  }

};

module.exports = { ReturnRecord, calculateDeduction, generateDamageSummary };