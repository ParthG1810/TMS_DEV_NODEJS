-- ============================================================
-- Seed Script: User Accounts
-- Description: Creates default user accounts with hashed passwords
-- ============================================================

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
    '$2b$10$E3dU4bNyUYulH.fTNoAmCeddJfh3a7D48k/SPmlQcFcHrIE9mFmby',
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
    '$2b$10$Q/F96Yg1eBrOnToryj2sseax3XxXZTvoCynDMQXN5DAymydMAwuRG',
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
    '$2b$10$ab.LfeHD7g2Wy9TR10RtlelPKUjajDwyggzdY3Rj1oTcSElvSRrHS',
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
    '$2b$10$Or50FB5seK98o71Njj4X0OoNJaGDt7s.RiJ.VZhyG5FrtjUr3IjYG',
    'manager'
) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

SELECT 'Seed users completed successfully' AS status;
