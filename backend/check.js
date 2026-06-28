const db = require('./config/db');
db.query("SELECT status, count(id) FROM devices GROUP BY status")
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(console.error);
