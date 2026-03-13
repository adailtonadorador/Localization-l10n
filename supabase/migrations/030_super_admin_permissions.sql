-- Migration 030: Super Admin + Admin Module Permissions
-- Adds is_super_admin flag to users and admin_permissions table

-- Add is_super_admin column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Set the current admin (adailtonadorador@gmail.com) as super admin
UPDATE users SET is_super_admin = TRUE WHERE role = 'admin' AND email = 'adailtonadorador@gmail.com';

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON admin_permissions(user_id);

-- Enable RLS
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: only super admins can manage permissions
CREATE POLICY "Super admins can manage all permissions"
  ON admin_permissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_super_admin = TRUE)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

-- Admins can read their own permissions
CREATE POLICY "Admins can read own permissions"
  ON admin_permissions FOR SELECT
  USING (user_id = auth.uid());

-- SECURITY DEFINER function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND is_super_admin = TRUE
  );
$$;

-- SECURITY DEFINER function to check if admin has permission for a module
CREATE OR REPLACE FUNCTION public.admin_has_permission(check_module TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND is_super_admin = TRUE
  )
  OR EXISTS (
    SELECT 1 FROM public.admin_permissions WHERE user_id = auth.uid() AND module = check_module
  );
$$;

-- Grant existing admins all permissions (except the super admin who has all by default)
INSERT INTO admin_permissions (user_id, module)
SELECT u.id, m.module
FROM users u
CROSS JOIN (
  VALUES ('dashboard'), ('jobs'), ('clients'), ('workers'), ('monitoring'), ('withdrawals'), ('reports'), ('users')
) AS m(module)
WHERE u.role = 'admin' AND u.is_super_admin = FALSE
ON CONFLICT (user_id, module) DO NOTHING;
