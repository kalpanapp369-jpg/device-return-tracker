-- =============================================
-- Device Return & Damage Tracker — Schema
-- One Point Solutions Internship Project
-- =============================================

-- 1. Customers
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(100),
  customer_type ENUM('Rental Customer','Event Organizer','Corporate Client','Institutional Client') DEFAULT 'Rental Customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Devices
CREATE TABLE devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  serial_number VARCHAR(50) UNIQUE NOT NULL,
  device_name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  purchase_cost DECIMAL(10,2),
  status ENUM('Available','Rented','Under Repair','Retired') DEFAULT 'Available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Rental Bookings
CREATE TABLE rental_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  device_id INT NOT NULL,
  rental_start DATE NOT NULL,
  rental_end DATE NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  rental_amount DECIMAL(10,2) DEFAULT 0,
  booking_status ENUM('Active','Returned','Cancelled') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- 4. Return Records (MAIN TABLE)
CREATE TABLE return_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  return_date DATE NOT NULL,
  device_condition ENUM('Good','Minor Scratches','Major Damage','Non-Functional') NOT NULL,
  damage_description TEXT,
  damage_photo_url VARCHAR(255),
  repair_cost DECIMAL(10,2) DEFAULT 0,
  deposit_deduction DECIMAL(10,2) DEFAULT 0,
  deposit_refund DECIMAL(10,2) DEFAULT 0,
  settlement_status ENUM('Pending','Approved','Rejected','Settled') DEFAULT 'Pending',
  approved_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES rental_bookings(id)
);

-- 5. Damage Evidence (multiple photos per return)
CREATE TABLE damage_evidence (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT NOT NULL,
  photo_url VARCHAR(255) NOT NULL,
  description VARCHAR(200),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (return_id) REFERENCES return_records(id)
);

-- =============================================
-- Sample Data for Testing
-- =============================================

INSERT INTO customers (name, phone, email, customer_type) VALUES
('Ravi Kumar', '9876543210', 'ravi@email.com', 'Rental Customer'),
('TechCorp Events', '9988776655', 'techcorp@email.com', 'Corporate Client'),
('Priya Sharma', '9123456789', 'priya@email.com', 'Rental Customer');

INSERT INTO devices (serial_number, device_name, category, purchase_cost) VALUES
('DEV-001', 'Dell Laptop 15"', 'Laptop', 55000.00),
('DEV-002', 'Canon DSLR Camera', 'Camera', 45000.00),
('DEV-003', 'iPad Pro 12.9"', 'Tablet', 80000.00);

INSERT INTO rental_bookings (customer_id, device_id, rental_start, rental_end, deposit_amount, rental_amount) VALUES
(1, 1, '2026-05-01', '2026-06-01', 5000.00, 2000.00),
(2, 2, '2026-05-15', '2026-06-15', 4000.00, 3000.00),
(3, 3, '2026-06-01', '2026-06-30', 8000.00, 5000.00);
