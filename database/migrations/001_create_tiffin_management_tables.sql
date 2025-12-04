-- ============================================================
-- Tiffin Management System - Database Migration
-- Created: 2025-12-04
-- Description: Creates tables for meal plans, customers, and tiffin orders
-- ============================================================

USE tms_db;

-- ============================================================
-- MEAL_PLANS TABLE
-- Stores meal plan configurations
-- ============================================================
CREATE TABLE meal_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meal_name VARCHAR(255) NOT NULL,
  description TEXT,
  frequency ENUM('Daily', 'Weekly', 'Monthly') NOT NULL,
  days ENUM('Mon-Fri', 'Mon-Sat', 'Single') DEFAULT 'Single',
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_frequency (frequency),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CUSTOMERS TABLE
-- Stores customer information
-- ============================================================
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CUSTOMER_ORDERS TABLE
-- Stores tiffin orders from customers
-- ============================================================
CREATE TABLE customer_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  meal_plan_id INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity >= 1),
  selected_days JSON NOT NULL COMMENT 'Array of selected days like ["Monday", "Tuesday", ...]',
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE RESTRICT,
  INDEX idx_customer_id (customer_id),
  INDEX idx_meal_plan_id (meal_plan_id),
  INDEX idx_start_date (start_date),
  INDEX idx_end_date (end_date),
  INDEX idx_created_at (created_at),
  CHECK (end_date > start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================

-- Sample Meal Plans
INSERT INTO meal_plans (meal_name, description, frequency, days, price) VALUES
('Standard Lunch', 'Dal, Roti, Rice, Sabzi', 'Weekly', 'Mon-Fri', 1500.00),
('Premium Lunch', 'Dal, Roti, Rice, Sabzi, Sweet', 'Weekly', 'Mon-Sat', 2000.00),
('Daily Special', 'Chef Special Meal', 'Daily', 'Single', 100.00),
('Monthly Family Pack', '2 Roti, Dal, Rice, Sabzi for 4 people', 'Monthly', 'Mon-Sat', 8000.00);

-- Sample Customers
INSERT INTO customers (name, phone, address) VALUES
('Rajesh Kumar', '9876543210', '123, MG Road, Bangalore'),
('Priya Sharma', '9876543211', '456, Park Street, Mumbai'),
('Amit Patel', NULL, '789, Lake View, Pune'),
('Sunita Verma', '9876543213', '321, Garden Road, Delhi');

-- Sample Customer Orders
INSERT INTO customer_orders (customer_id, meal_plan_id, quantity, selected_days, price, start_date, end_date) VALUES
(1, 1, 2, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', 1500.00, '2025-12-01', '2025-12-31'),
(2, 2, 1, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]', 2000.00, '2025-12-01', '2025-12-31'),
(3, 3, 1, '[]', 100.00, '2025-12-04', '2025-12-04'),
(4, 4, 1, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]', 8000.00, '2025-12-01', '2025-12-31');

-- ============================================================
-- INDEXES SUMMARY
-- ============================================================
-- meal_plans: idx_frequency, idx_created_at
-- customers: idx_name, idx_phone
-- customer_orders: idx_customer_id, idx_meal_plan_id, idx_start_date, idx_end_date, idx_created_at
-- ============================================================
-- USAGE NOTES
-- ============================================================
-- 1. When frequency is 'Daily', days should be set to 'Single'
-- 2. selected_days is stored as JSON array for flexibility
-- 3. CASCADE delete on customer_orders when customer is deleted
-- 4. RESTRICT delete on customer_orders when meal_plan is deleted (protect data integrity)
-- 5. CHECK constraint ensures end_date > start_date
-- ============================================================
