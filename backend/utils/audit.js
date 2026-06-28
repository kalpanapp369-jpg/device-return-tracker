const db = require('../config/db');

async function logAction({ userId, userName, action, tableName, recordId, oldData, newData, ipAddress }) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [userId||null, userName||'System', action, tableName||null, recordId||null,
       oldData ? JSON.stringify(oldData) : null,
       newData ? JSON.stringify(newData) : null,
       ipAddress||null]
    );
  } catch (err) { console.warn('Audit log failed (non-fatal):', err.message); }
}

module.exports = { logAction };