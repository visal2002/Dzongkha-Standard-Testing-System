-- Email: ambhutan@gmail.com | hello@aakash-pradhan.com
-- Website: ambhutan.com | aakash-pradhan.com
-- Phone: +975 - 1750 - 5267

-- New in-flight status for the notification dispatch worker's claim step - see
-- DeliveryDispatchService in notification-service. Distinct from PENDING_PROVIDER so
-- a concurrent worker instance's SKIP LOCKED poll excludes a row already claimed by
-- another instance, even after the claiming transaction's row lock is released.
\if :notification
ALTER TYPE notification.notification_delivery_status ADD VALUE IF NOT EXISTS 'SENDING';
\endif
