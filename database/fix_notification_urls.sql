-- Update existing notifications to point to billing details page instead of calendar
-- Run this SQL script to fix notifications that were created before the update

UPDATE payment_notifications
SET action_url = CONCAT('/dashboard/tiffin/billing-details?id=', billing_id)
WHERE notification_type = 'billing_pending_approval'
  AND billing_id IS NOT NULL
  AND (action_url LIKE '%billing-calendar%' OR action_url NOT LIKE '%billing-details%');

-- Show updated notifications
SELECT
  id,
  title,
  billing_id,
  action_url,
  created_at
FROM payment_notifications
WHERE notification_type = 'billing_pending_approval'
ORDER BY created_at DESC
LIMIT 10;
