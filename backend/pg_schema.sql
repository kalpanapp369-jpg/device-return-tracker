-- ============================================================
-- Device Return & Damage Tracker — PostgreSQL Schema
-- Run this in Render PostgreSQL dashboard → Query tab
-- ============================================================

-- 1. Users (auth)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(10) DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(15)  NOT NULL,
  email         VARCHAR(100),
  customer_type VARCHAR(50)  DEFAULT 'Rental Customer',
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 3. Devices
CREATE TABLE IF NOT EXISTS devices (
  id            SERIAL PRIMARY KEY,
  serial_number VARCHAR(50) UNIQUE NOT NULL,
  device_name   VARCHAR(100) NOT NULL,
  category      VARCHAR(50),
  purchase_cost DECIMAL(10,2),
  status        VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available','Rented','Under Repair','Retired')),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 4. Rental Bookings
CREATE TABLE IF NOT EXISTS rental_bookings (
  id             SERIAL PRIMARY KEY,
  customer_id    INT NOT NULL REFERENCES customers(id),
  device_id      INT NOT NULL REFERENCES devices(id),
  rental_start   DATE NOT NULL,
  rental_end     DATE NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  rental_amount  DECIMAL(10,2) DEFAULT 0,
  booking_status VARCHAR(20) DEFAULT 'Active' CHECK (booking_status IN ('Active','Returned','Cancelled')),
  created_at     TIMESTAMP DEFAULT NOW()
);

-- 5. Return Records (MAIN TABLE)
CREATE TABLE IF NOT EXISTS return_records (
  id                SERIAL PRIMARY KEY,
  booking_id        INT NOT NULL REFERENCES rental_bookings(id),
  return_date       DATE NOT NULL,
  device_condition  VARCHAR(20) NOT NULL CHECK (device_condition IN ('Good','Minor Scratches','Major Damage','Non-Functional')),
  damage_description TEXT,
  damage_photo_url  VARCHAR(500),
  repair_cost       DECIMAL(10,2) DEFAULT 0,
  deposit_deduction DECIMAL(10,2) DEFAULT 0,
  deposit_refund    DECIMAL(10,2) DEFAULT 0,
  settlement_status VARCHAR(20) DEFAULT 'Pending' CHECK (settlement_status IN ('Pending','Approved','Rejected','Settled')),
  approved_by       VARCHAR(100),
  notes             TEXT,
  ai_damage_summary TEXT,
  ai_repair_estimate TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- 6. Damage Evidence (multiple photos per return, stored in Cloudinary)
CREATE TABLE IF NOT EXISTS damage_evidence (
  id           SERIAL PRIMARY KEY,
  return_id    INT NOT NULL REFERENCES return_records(id) ON DELETE CASCADE,
  photo_url    VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  public_id    VARCHAR(255),
  description  VARCHAR(200),
  uploaded_at  TIMESTAMP DEFAULT NOW()
);

-- 7. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  user_name  VARCHAR(100),
  action     VARCHAR(20) CHECK (action IN ('CREATE','UPDATE','DELETE','APPROVE','REJECT','SETTLE','LOGIN','LOGOUT')),
  table_name VARCHAR(50),
  record_id  INT,
  old_data   JSONB,
  new_data   JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON return_records;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON return_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Sample Data
-- ============================================================

INSERT INTO customers (name, phone, email, customer_type) VALUES
('Ravi Kumar',    '9876543210', 'ravi@email.com',     'Rental Customer'),
('TechCorp Events','9988776655','techcorp@email.com',  'Corporate Client'),
('Priya Sharma',  '9123456789', 'priya@email.com',    'Rental Customer')
ON CONFLICT DO NOTHING;

INSERT INTO devices (serial_number, device_name, category, purchase_cost) VALUES
('DEV-001', 'Dell Laptop 15"',   'Laptop', 55000.00),
('DEV-002', 'Canon DSLR Camera', 'Camera', 45000.00),
('DEV-003', 'iPad Pro 12.9"',    'Tablet', 80000.00)
ON CONFLICT DO NOTHING;

INSERT INTO rental_bookings (customer_id, device_id, rental_start, rental_end, deposit_amount, rental_amount) VALUES
(1, 1, '2026-05-01', '2026-06-01', 5000.00, 2000.00),
(2, 2, '2026-05-15', '2026-06-15', 4000.00, 3000.00),
(3, 3, '2026-06-01', '2026-06-30', 8000.00, 5000.00)
ON CONFLICT DO NOTHING;