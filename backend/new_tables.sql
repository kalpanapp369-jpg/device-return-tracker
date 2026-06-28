-- 1. KYC Records Table
CREATE TABLE IF NOT EXISTS kyc_records (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id),
  document_type VARCHAR(50),
  document_url VARCHAR(500),
  verification_status VARCHAR(20) DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 2. Logistics Table
CREATE TABLE IF NOT EXISTS logistics (
  id SERIAL PRIMARY KEY,
  return_id INT NOT NULL REFERENCES return_records(id),
  courier_name VARCHAR(100),
  tracking_number VARCHAR(100),
  dispatch_date DATE,
  delivery_status VARCHAR(50) DEFAULT 'In Transit' CHECK (delivery_status IN ('In Transit', 'Delivered', 'Returned to Sender')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Maintenance Table
CREATE TABLE IF NOT EXISTS maintenance (
  id SERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  repair_date DATE DEFAULT CURRENT_DATE,
  issue_description TEXT NOT NULL,
  repair_cost DECIMAL(10,2) DEFAULT 0,
  maintenance_status VARCHAR(50) DEFAULT 'In Progress' CHECK (maintenance_status IN ('In Progress', 'Completed', 'Cannot be Fixed')),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
