-- ============================================================
-- Migration: 032_auth_users_table.sql
-- Description: Create/update users table for authentication system
-- with extended roles (admin, manager, staff, tester, user)
-- ============================================================

-- Drop existing users table if it exists (be careful in production!)
-- For development, we'll recreate it with proper structure
DROP TABLE IF EXISTS users;

-- Create users table with extended roles
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    photo_url VARCHAR(500) DEFAULT NULL,
    phone_number VARCHAR(50) DEFAULT NULL,
    country VARCHAR(100) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    state VARCHAR(100) DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    zip_code VARCHAR(20) DEFAULT NULL,
    about TEXT DEFAULT NULL,
    role ENUM('admin', 'manager', 'staff', 'tester', 'user') DEFAULT 'user',
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    is_public BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create login audit log table (for future security features)
CREATE TABLE IF NOT EXISTS login_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    status ENUM('success', 'failed', 'blocked') NOT NULL,
    failure_reason VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert dummy accounts
-- Passwords are bcrypt hashed:
-- Admin@123 -> $2a$10$rQnM1YV1jK5S5L5X5X5X5O5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5
-- User@123 -> $2a$10$rQnM1YV1jK5S5L5X5X5X5O5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5
-- Tester@123 -> $2a$10$rQnM1YV1jK5S5L5X5X5X5O5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5

-- Note: Actual hashes will be inserted via seed script after bcrypt processing

SELECT 'Migration 032_auth_users_table completed successfully' AS status;
