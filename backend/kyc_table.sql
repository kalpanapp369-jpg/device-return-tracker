DROP TABLE IF EXISTS kyc_records CASCADE;
CREATE TABLE kyc_records (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    address TEXT,
    agreement_signed BOOLEAN DEFAULT false,
    deposit_paid BOOLEAN DEFAULT false,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    kyc_status VARCHAR(20) DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
