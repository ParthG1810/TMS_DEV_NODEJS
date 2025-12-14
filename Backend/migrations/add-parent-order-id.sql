-- Migration: Add parent_order_id column to customer_orders table
-- This column tracks which extra tiffin orders belong to which main meal plan order
-- Parent orders have NULL parent_order_id, child (extra tiffin) orders have the parent's ID

-- Add parent_order_id column
ALTER TABLE customer_orders
ADD COLUMN IF NOT EXISTS parent_order_id INT NULL DEFAULT NULL
AFTER customer_id;

-- Add foreign key constraint (optional, for data integrity)
-- ALTER TABLE customer_orders
-- ADD CONSTRAINT fk_parent_order
-- FOREIGN KEY (parent_order_id) REFERENCES customer_orders(id)
-- ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_parent_order_id ON customer_orders(parent_order_id);
