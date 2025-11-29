-- ============================================================
-- TMS (Table Management System) Database Schema
-- Restaurant Management Application
-- ============================================================

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
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VENDORS TABLE
-- Stores vendor-specific pricing for each product
-- Each product can have multiple vendors
-- ============================================================
CREATE TABLE vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  weight DECIMAL(10, 2) NOT NULL CHECK (weight > 0),
  package_size ENUM('tsp', 'tbsp', 'c', 'pt', 'qt', 'gal', 'fl_oz', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'pcs') NOT NULL DEFAULT 'g',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id),
  INDEX idx_vendor_name (vendor_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RECIPES TABLE
-- Stores recipe information
-- ============================================================
CREATE TABLE recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RECIPE_INGREDIENTS TABLE
-- Join table linking recipes to their ingredients (products)
-- Stores the quantity of each ingredient needed for a recipe
-- ============================================================
CREATE TABLE recipe_ingredients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipe_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_recipe_id (recipe_id),
  INDEX idx_product_id (product_id),
  UNIQUE KEY unique_recipe_product (recipe_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RECIPE_IMAGES TABLE
-- Stores multiple images for each recipe
-- Supports primary image designation and display ordering
-- ============================================================
CREATE TABLE recipe_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipe_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  INDEX idx_recipe_id (recipe_id),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================

-- Sample Products
INSERT INTO products (name, description) VALUES
('Tomatoes', 'Fresh red tomatoes'),
('Olive Oil', 'Extra virgin olive oil'),
('Garlic', 'Fresh garlic cloves'),
('Pasta', 'Italian pasta'),
('Cheese', 'Parmesan cheese');

-- Sample Vendors for Tomatoes (product_id = 1)
INSERT INTO vendors (product_id, vendor_name, price, weight, package_size, is_default) VALUES
(1, 'Local Farm', 5.99, 1.0, 'kg', true),
(1, 'City Market', 6.50, 1.0, 'kg', false),
(1, 'Organic Store', 8.99, 1.0, 'kg', false);

-- Sample Vendors for Olive Oil (product_id = 2)
INSERT INTO vendors (product_id, vendor_name, price, weight, package_size, is_default) VALUES
(2, 'Mediterranean Imports', 12.99, 500, 'ml', true),
(2, 'Local Farm', 15.50, 750, 'ml', false);

-- Sample Vendors for Garlic (product_id = 3)
INSERT INTO vendors (product_id, vendor_name, price, weight, package_size, is_default) VALUES
(3, 'Local Farm', 2.99, 250, 'g', true),
(3, 'City Market', 3.50, 300, 'g', false);

-- Sample Vendors for Pasta (product_id = 4)
INSERT INTO vendors (product_id, vendor_name, price, weight, package_size, is_default) VALUES
(4, 'Italian Imports', 4.99, 500, 'g', true),
(4, 'Local Store', 3.99, 500, 'g', false);

-- Sample Vendors for Cheese (product_id = 5)
INSERT INTO vendors (product_id, vendor_name, price, weight, package_size, is_default) VALUES
(5, 'Cheese Factory', 8.99, 200, 'g', true),
(5, 'Italian Imports', 10.50, 250, 'g', false);

-- Sample Recipes
INSERT INTO recipes (name, description) VALUES
('Pasta Pomodoro', 'Classic Italian tomato pasta'),
('Aglio e Olio', 'Garlic and olive oil pasta');

-- Sample Recipe Ingredients for Pasta Pomodoro (recipe_id = 1)
INSERT INTO recipe_ingredients (recipe_id, product_id, quantity) VALUES
(1, 1, 500),  -- 500g tomatoes
(1, 2, 50),   -- 50ml olive oil
(1, 3, 20),   -- 20g garlic
(1, 4, 400),  -- 400g pasta
(1, 5, 50);   -- 50g cheese

-- Sample Recipe Ingredients for Aglio e Olio (recipe_id = 2)
INSERT INTO recipe_ingredients (recipe_id, product_id, quantity) VALUES
(2, 2, 100),  -- 100ml olive oil
(2, 3, 30),   -- 30g garlic
(2, 4, 400);  -- 400g pasta

-- ============================================================
-- INDEXES SUMMARY
-- ============================================================
-- products: idx_name
-- vendors: idx_product_id, idx_vendor_name
-- recipes: idx_name
-- recipe_ingredients: idx_recipe_id, idx_product_id, unique_recipe_product
-- recipe_images: idx_recipe_id, idx_display_order

-- ============================================================
-- USAGE NOTES
-- ============================================================
-- 1. To create database: CREATE DATABASE tms_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- 2. To import schema: mysql -u root -p tms_database < schema.sql
-- 3. Default vendor must be set for each product for cost calculations
-- 4. Recipe images are stored in filesystem, only URLs stored in DB
-- 5. CASCADE delete on vendors when product is deleted
-- 6. RESTRICT delete on recipe_ingredients when product is deleted (protect data integrity)
