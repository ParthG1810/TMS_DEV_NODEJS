-- Quick fix: Update company logo URL to relative path
-- Run this with your database credentials

UPDATE app_settings
SET setting_value = SUBSTRING(setting_value, LOCATE('/uploads', setting_value))
WHERE setting_key = 'company_logo'
  AND setting_value LIKE '%/uploads/%'
  AND setting_value LIKE 'http%';

-- Verify the update
SELECT setting_key, setting_value
FROM app_settings
WHERE setting_key = 'company_logo';
