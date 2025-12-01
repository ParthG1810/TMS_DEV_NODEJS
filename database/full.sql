-- ============================================
-- TMS Database Schema for MySQL 8.0+
-- ============================================
-- Drop existing database and create new one
DROP DATABASE IF EXISTS tms_db;

CREATE DATABASE tms_db CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tms_db;

-- ============================================
-- Users and Authentication Tables
-- ============================================
CREATE TABLE
    users (
        id VARCHAR(36) PRIMARY KEY,
        display_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        photo_url VARCHAR(500),
        phone_number VARCHAR(50),
        country VARCHAR(100),
        address TEXT,
        state VARCHAR(100),
        city VARCHAR(100),
        zip_code VARCHAR(20),
        about TEXT,
        role ENUM ('admin', 'user') DEFAULT 'user',
        is_public BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(500) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_token (token (255))
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Products Tables
-- ============================================
CREATE TABLE
    products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) UNIQUE,
        sku VARCHAR(100) UNIQUE,
        price DECIMAL(10, 2) NOT NULL,
        price_sale DECIMAL(10, 2),
        description TEXT,
        status ENUM ('new', 'sale', '') DEFAULT '',
        inventory_type ENUM ('in_stock', 'out_of_stock', 'low_stock') DEFAULT 'in_stock',
        available INT DEFAULT 0,
        sold INT DEFAULT 0,
        total_rating DECIMAL(3, 2) DEFAULT 0,
        total_review INT DEFAULT 0,
        category VARCHAR(100),
        gender ENUM ('Men', 'Women', 'Kids', 'Unisex') DEFAULT 'Unisex',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_status (status),
        INDEX idx_inventory_type (inventory_type),
        INDEX idx_created_at (created_at)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    product_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        is_cover BOOLEAN DEFAULT FALSE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    product_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        tag VARCHAR(100) NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id),
        INDEX idx_tag (tag)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    product_sizes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        size VARCHAR(50) NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    product_colors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        color_name VARCHAR(50) NOT NULL,
        color_hex VARCHAR(7) NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    product_ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        star_count INT NOT NULL CHECK (star_count BETWEEN 1 AND 5),
        review_count INT DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    product_reviews (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        comment TEXT,
        rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        is_purchased BOOLEAN DEFAULT FALSE,
        helpful INT DEFAULT 0,
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id),
        INDEX idx_posted_at (posted_at)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Blog Tables
-- ============================================
CREATE TABLE
    blog_posts (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content LONGTEXT,
        cover_url VARCHAR(500),
        author_id VARCHAR(36) NOT NULL,
        views INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        share_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_author_id (author_id),
        INDEX idx_created_at (created_at),
        FULLTEXT idx_title_content (title, description, content)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    blog_comments (
        id VARCHAR(36) PRIMARY KEY,
        post_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES blog_posts (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_post_id (post_id),
        INDEX idx_created_at (created_at)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Chat Tables
-- ============================================
CREATE TABLE
    chat_conversations (
        id VARCHAR(36) PRIMARY KEY,
        type ENUM ('ONE_TO_ONE', 'GROUP') DEFAULT 'ONE_TO_ONE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_updated_at (updated_at)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    chat_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        unread_count INT DEFAULT 0,
        last_seen_at TIMESTAMP NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE KEY unique_conversation_user (conversation_id, user_id),
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_user_id (user_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    chat_messages (
        id VARCHAR(36) PRIMARY KEY,
        conversation_id VARCHAR(36) NOT NULL,
        sender_id VARCHAR(36) NOT NULL,
        body TEXT NOT NULL,
        content_type ENUM ('text', 'image') DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations (id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_sender_id (sender_id),
        INDEX idx_created_at (created_at)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    chat_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id VARCHAR(36) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_name VARCHAR(255),
        file_type VARCHAR(100),
        file_size INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES chat_messages (id) ON DELETE CASCADE,
        INDEX idx_message_id (message_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Calendar Tables
-- ============================================
CREATE TABLE
    calendar_events (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        all_day BOOLEAN DEFAULT FALSE,
        color VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_start_time (start_time),
        INDEX idx_end_time (end_time)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Kanban Tables
-- ============================================
CREATE TABLE
    kanban_columns (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sort_order INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sort_order (sort_order)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    kanban_cards (
        id VARCHAR(36) PRIMARY KEY,
        column_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        due_start DATE,
        due_end DATE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (column_id) REFERENCES kanban_columns (id) ON DELETE CASCADE,
        INDEX idx_column_id (column_id),
        INDEX idx_sort_order (sort_order)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    kanban_card_assignees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id) REFERENCES kanban_cards (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE KEY unique_card_user (card_id, user_id),
        INDEX idx_card_id (card_id),
        INDEX idx_user_id (user_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    kanban_card_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_id VARCHAR(36) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id) REFERENCES kanban_cards (id) ON DELETE CASCADE,
        INDEX idx_card_id (card_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    kanban_card_comments (
        id VARCHAR(36) PRIMARY KEY,
        card_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        message TEXT NOT NULL,
        message_type ENUM ('text', 'image') DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id) REFERENCES kanban_cards (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_card_id (card_id),
        INDEX idx_created_at (created_at)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Mail Tables
-- ============================================
CREATE TABLE
    mail_labels (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        unread_count INT DEFAULT 0,
        color VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    mails (
        id VARCHAR(36) PRIMARY KEY,
        from_email VARCHAR(255) NOT NULL,
        from_name VARCHAR(255),
        from_avatar VARCHAR(500),
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        message LONGTEXT,
        is_important BOOLEAN DEFAULT FALSE,
        is_starred BOOLEAN DEFAULT FALSE,
        is_unread BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_to_email (to_email),
        INDEX idx_from_email (from_email),
        INDEX idx_is_unread (is_unread),
        INDEX idx_created_at (created_at)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    mail_label_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mail_id VARCHAR(36) NOT NULL,
        label_id VARCHAR(36) NOT NULL,
        FOREIGN KEY (mail_id) REFERENCES mails (id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES mail_labels (id) ON DELETE CASCADE,
        UNIQUE KEY unique_mail_label (mail_id, label_id),
        INDEX idx_mail_id (mail_id),
        INDEX idx_label_id (label_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    mail_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mail_id VARCHAR(36) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_name VARCHAR(255),
        file_type VARCHAR(100),
        file_size INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mail_id) REFERENCES mails (id) ON DELETE CASCADE,
        INDEX idx_mail_id (mail_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Files Tables
-- ============================================
CREATE TABLE
    files (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100),
        file_url VARCHAR(500),
        file_size INT,
        date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_shared BOOLEAN DEFAULT FALSE,
        is_starred BOOLEAN DEFAULT FALSE,
        tags TEXT,
        user_id VARCHAR(36) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_file_type (file_type),
        INDEX idx_date_modified (date_modified)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS recipe_images;

DROP TABLE IF EXISTS recipe_ingredients;

DROP TABLE IF EXISTS recipes;

DROP TABLE IF EXISTS vendors;

DROP TABLE IF EXISTS products;

-- ============================================================
-- PRODUCTS TABLE
-- Stores core ingredient/product information
-- ============================================================
CREATE TABLE
    products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================
-- VENDORS TABLE
-- Stores vendor-specific pricing for each product
-- Each product can have multiple vendors
-- ============================================================
CREATE TABLE
    vendors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        vendor_name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
        weight DECIMAL(10, 2) NOT NULL CHECK (weight > 0),
        package_size ENUM (
            'tsp',
            'tbsp',
            'c',
            'pt',
            'qt',
            'gal',
            'fl_oz',
            'oz',
            'lb',
            'g',
            'kg',
            'ml',
            'l',
            'pcs'
        ) NOT NULL DEFAULT 'g',
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id),
        INDEX idx_vendor_name (vendor_name)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================
-- RECIPES TABLE
-- Stores recipe information
-- ============================================================
CREATE TABLE
    recipes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================
-- RECIPE_INGREDIENTS TABLE
-- Join table linking recipes to their ingredients (products)
-- Stores the quantity of each ingredient needed for a recipe
-- ============================================================
CREATE TABLE
    recipe_ingredients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipe_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
        INDEX idx_recipe_id (recipe_id),
        INDEX idx_product_id (product_id),
        UNIQUE KEY unique_recipe_product (recipe_id, product_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================
-- RECIPE_IMAGES TABLE
-- Stores multiple images for each recipe
-- Supports primary image designation and display ordering
-- ============================================================
CREATE TABLE
    recipe_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipe_id INT NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
        INDEX idx_recipe_id (recipe_id),
        INDEX idx_display_order (display_order)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================
-- Insert Default/Demo Data
-- ============================================
-- Insert demo user
INSERT INTO
    users (
        id,
        display_name,
        email,
        password_hash,
        role,
        is_public
    )
VALUES
    (
        'demo-user-id-001',
        'Demo User',
        'demo@minimals.cc',
        '$2b$10$YourHashedPasswordHere',
        'admin',
        TRUE
    );

-- Insert default mail labels
INSERT INTO
    mail_labels (id, name, unread_count, color)
VALUES
    ('label-inbox', 'Inbox', 0, '#00B8D9'),
    ('label-sent', 'Sent', 0, '#36B37E'),
    ('label-drafts', 'Drafts', 0, '#FFC107'),
    ('label-trash', 'Trash', 0, '#FF5630'),
    ('label-spam', 'Spam', 0, '#666666'),
    ('label-important', 'Important', 0, '#FF6B6B');

-- Sample Products
INSERT INTO
    products (name, description)
VALUES
    ('Tomatoes', 'Fresh red tomatoes'),
    ('Olive Oil', 'Extra virgin olive oil'),
    ('Garlic', 'Fresh garlic cloves'),
    ('Pasta', 'Italian pasta'),
    ('Cheese', 'Parmesan cheese');

-- Sample Vendors for Tomatoes (product_id = 1)
INSERT INTO
    vendors (
        product_id,
        vendor_name,
        price,
        weight,
        package_size,
        is_default
    )
VALUES
    (1, 'Local Farm', 5.99, 1.0, 'kg', true),
    (1, 'City Market', 6.50, 1.0, 'kg', false),
    (1, 'Organic Store', 8.99, 1.0, 'kg', false);

-- Sample Vendors for Olive Oil (product_id = 2)
INSERT INTO
    vendors (
        product_id,
        vendor_name,
        price,
        weight,
        package_size,
        is_default
    )
VALUES
    (
        2,
        'Mediterranean Imports',
        12.99,
        500,
        'ml',
        true
    ),
    (2, 'Local Farm', 15.50, 750, 'ml', false);

-- Sample Vendors for Garlic (product_id = 3)
INSERT INTO
    vendors (
        product_id,
        vendor_name,
        price,
        weight,
        package_size,
        is_default
    )
VALUES
    (3, 'Local Farm', 2.99, 250, 'g', true),
    (3, 'City Market', 3.50, 300, 'g', false);

-- Sample Vendors for Pasta (product_id = 4)
INSERT INTO
    vendors (
        product_id,
        vendor_name,
        price,
        weight,
        package_size,
        is_default
    )
VALUES
    (4, 'Italian Imports', 4.99, 500, 'g', true),
    (4, 'Local Store', 3.99, 500, 'g', false);

-- Sample Vendors for Cheese (product_id = 5)
INSERT INTO
    vendors (
        product_id,
        vendor_name,
        price,
        weight,
        package_size,
        is_default
    )
VALUES
    (5, 'Cheese Factory', 8.99, 200, 'g', true),
    (5, 'Italian Imports', 10.50, 250, 'g', false);

-- Sample Recipes
INSERT INTO
    recipes (name, description)
VALUES
    ('Pasta Pomodoro', 'Classic Italian tomato pasta'),
    ('Aglio e Olio', 'Garlic and olive oil pasta');

-- Sample Recipe Ingredients for Pasta Pomodoro (recipe_id = 1)
INSERT INTO
    recipe_ingredients (recipe_id, product_id, quantity)
VALUES
    (1, 1, 500), -- 500g tomatoes
    (1, 2, 50), -- 50ml olive oil
    (1, 3, 20), -- 20g garlic
    (1, 4, 400), -- 400g pasta
    (1, 5, 50);

-- 50g cheese
-- Sample Recipe Ingredients for Aglio e Olio (recipe_id = 2)
INSERT INTO
    recipe_ingredients (recipe_id, product_id, quantity)
VALUES
    (2, 2, 100), -- 100ml olive oil
    (2, 3, 30), -- 30g garlic
    (2, 4, 400);

-- 400g pasta
-- ============================================
-- End of Schema
-- ============================================