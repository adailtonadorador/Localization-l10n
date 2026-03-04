-- ============================================
-- CLEANUP: Remove all test data
-- Keep only admin user(s) for production use
-- ============================================

-- 1. Delete leaf tables first (respecting FK order)
DELETE FROM work_records;
DELETE FROM job_assignments;
DELETE FROM job_applications;
DELETE FROM withdrawal_history;
DELETE FROM worker_availability;
DELETE FROM project_tasks;

-- 2. Delete jobs (depends on clients)
DELETE FROM jobs;

-- 3. Delete push subscriptions and notifications for non-admin users
DELETE FROM push_subscriptions WHERE user_id IN (
  SELECT id FROM users WHERE role != 'admin'
);
DELETE FROM notifications WHERE user_id IN (
  SELECT id FROM users WHERE role != 'admin'
);

-- 4. Delete workers and clients (depends on users)
DELETE FROM workers;
DELETE FROM clients;

-- 5. Delete non-admin users
DELETE FROM users WHERE role != 'admin';

-- 6. Also clean admin's push subscriptions and notifications (fresh start)
DELETE FROM push_subscriptions;
DELETE FROM notifications;
