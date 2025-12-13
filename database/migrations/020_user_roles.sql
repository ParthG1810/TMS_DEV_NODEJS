-- Migration: 020_user_roles.sql
-- Description: Add user roles table for role-based access control
-- Date: 2025-12-13

-- =====================================================
-- User Roles Table
-- =====================================================
-- Store user roles for authorization (admin, manager, staff, viewer)

CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,                       -- Auth0 user ID or internal user ID
    email VARCHAR(255) DEFAULT NULL,                     -- User email for reference
    role ENUM('admin', 'manager', 'staff', 'viewer') NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user_role (user_id),
    INDEX idx_role (role),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Delete Authorization Log Table
-- =====================================================
-- Audit trail for all delete operations

CREATE TABLE IF NOT EXISTS delete_authorization_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) DEFAULT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    action_type ENUM('soft_delete', 'restore') NOT NULL,
    password_verified TINYINT(1) NOT NULL DEFAULT 0,
    reason TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user (user_id),
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Insert default admin role (update user_id as needed)
-- =====================================================
-- INSERT INTO user_roles (user_id, email, role) VALUES ('auth0|xxx', 'admin@example.com', 'admin');

-- =====================================================
-- Rollback Script
-- =====================================================
-- DROP TABLE IF EXISTS delete_authorization_log;
-- DROP TABLE IF EXISTS user_roles;
