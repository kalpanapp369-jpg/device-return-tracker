const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Kotha 3 tables unna file path idigo
const schemaPath = path.join(__dirname, 'new_tables.sql');

try {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    pool.query(schema, (err, res) => {
        if (err) {
            console.error("❌ Error creating tables:", err.message);
        } else {
            console.log("✅ Database Tables created successfully!");
        }
        pool.end();
    });
} catch (error) {
    console.error("❌ File error:", error.message);
}