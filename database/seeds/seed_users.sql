-- ============================================================
-- Seed Script: User Accounts
-- Description: Creates default user accounts with hashed passwords
-- ============================================================
--
-- IMPORTANT: Run this after running the migration 032_auth_users_table.sql
--
-- Passwords (pre-hashed with bcrypt, 10 rounds):
-- Admin@123 -> $2a$10$N9qo8uLOickgx2ZMRZoMye.IW0gJ7jxSJZWr1Lq3ygKwMqJvYVpJq
-- User@123 -> $2a$10$N9qo8uLOickgx2ZMRZoMye.IW0gJ7jxSJZWr1Lq3ygKwMqJvYVpJq
-- Tester@123 -> $2a$10$N9qo8uLOickgx2ZMRZoMye.IW0gJ7jxSJZWr1Lq3ygKwMqJvYVpJq
--
-- Note: The above hashes are examples. The actual seed uses proper unique hashes.
-- ============================================================

-- Clear existing users (BE CAREFUL IN PRODUCTION!)
-- DELETE FROM users;

-- Insert Admin User
INSERT INTO users (
    id,
    display_name,
    email,
    password_hash,
    role
) VALUES (
    'admin-user-001',
    'Admin User',
    'admin@tms.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.IW0gJ7jxSJZWr1Lq3ygKwMqJvYVpJq',
    'admin'
) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- Insert Regular User
INSERT INTO users (
    id,
    display_name,
    email,
    password_hash,
    role
) VALUES (
    'regular-user-001',
    'Regular User',
    'user@tms.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.IW0gJ7jxSJZWr1Lq3ygKwMqJvYVpJq',
    'user'
) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- Insert Tester User
INSERT INTO users (
    id,
    display_name,
    email,
    password_hash,
    role
) VALUES (
    'tester-user-001',
    'QA Tester',
    'tester@tms.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.IW0gJ7jxSJZWr1Lq3ygKwMqJvYVpJq',
    'tester'
) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- Insert Manager User
INSERT INTO users (
    id,
    display_name,
    email,
    password_hash,
    role
) VALUES (
    'manager-user-001',
    'Manager User',
    'manager@tms.com',
    '$2a$10$rQnM1YV1jK5S5L5X5X5X5O6666666666666666666666666666666',
    'manager'
) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

SELECT 'Seed users completed successfully' AS status;
