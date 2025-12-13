-- Migration: Convert full URLs to relative paths
-- Date: 2025-12-12
-- Description: Updates all image URLs stored in the database from full URLs
--              (e.g., http://localhost:3000/uploads/...) to relative paths
--              (e.g., /uploads/...) to avoid CORS issues

-- Update company logo in app_settings
UPDATE app_settings
SET setting_value = CASE
    -- If starts with http://localhost:3000, remove it
    WHEN setting_value LIKE 'http://localhost:3000/%'
        THEN SUBSTRING(setting_value, 22)
    -- If starts with http://localhost:8081, remove it
    WHEN setting_value LIKE 'http://localhost:8081/%'
        THEN SUBSTRING(setting_value, 22)
    -- If starts with https://, extract path after domain
    WHEN setting_value LIKE 'https://%'
        THEN CONCAT('/', SUBSTRING_INDEX(SUBSTRING(setting_value, 9), '/', -1))
    -- If starts with http://, extract path after domain
    WHEN setting_value LIKE 'http://%'
        THEN CONCAT('/', SUBSTRING_INDEX(SUBSTRING(setting_value, 8), '/', -1))
    -- Otherwise keep as is (already relative)
    ELSE setting_value
END
WHERE setting_key = 'company_logo'
  AND setting_value IS NOT NULL
  AND setting_value != '';

-- Update recipe images
UPDATE recipe_images
SET image_url = CASE
    -- If starts with http://localhost:3000, remove it
    WHEN image_url LIKE 'http://localhost:3000/%'
        THEN SUBSTRING(image_url, 22)
    -- If starts with http://localhost:8081, remove it
    WHEN image_url LIKE 'http://localhost:8081/%'
        THEN SUBSTRING(image_url, 22)
    -- If starts with https://, extract path after domain
    WHEN image_url LIKE 'https://%'
        THEN CONCAT('/', SUBSTRING_INDEX(SUBSTRING(image_url, 9), '/', -1))
    -- If starts with http://, extract path after domain
    WHEN image_url LIKE 'http://%'
        THEN CONCAT('/', SUBSTRING_INDEX(SUBSTRING(image_url, 8), '/', -1))
    -- Otherwise keep as is (already relative)
    ELSE image_url
END
WHERE image_url IS NOT NULL
  AND image_url != '';

-- Verify the changes
SELECT
    'app_settings' AS table_name,
    setting_key AS identifier,
    setting_value AS url
FROM app_settings
WHERE setting_key = 'company_logo'
UNION ALL
SELECT
    'recipe_images' AS table_name,
    CONCAT('Recipe ID: ', recipe_id) AS identifier,
    image_url AS url
FROM recipe_images
WHERE image_url IS NOT NULL
ORDER BY table_name;
