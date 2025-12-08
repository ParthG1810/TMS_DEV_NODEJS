-- Migration script to update existing recipe image URLs
-- This adds the backend server URL prefix to existing relative image URLs

-- Update recipe_images table to use full URLs
UPDATE recipe_images
SET image_url = CONCAT('http://localhost:3000', image_url)
WHERE image_url LIKE '/uploads/recipes/%'
  AND image_url NOT LIKE 'http://%'
  AND image_url NOT LIKE 'https://%';

-- Verify the changes
SELECT id, recipe_id, image_url, is_primary
FROM recipe_images
ORDER BY recipe_id, display_order;
