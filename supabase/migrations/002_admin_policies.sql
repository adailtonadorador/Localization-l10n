-- Migration: Add RLS policies for Admin role
-- Allows admin users to view and manage all data

-- Workers - admin pode ver todos
CREATE POLICY "Admin can view all workers" ON workers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM auth.users au WHERE au.id = auth.uid() AND au.raw_user_meta_data->>'role' = 'admin')
  );

-- Workers - admin pode atualizar
CREATE POLICY "Admin can update all workers" ON workers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM auth.users au WHERE au.id = auth.uid() AND au.raw_user_meta_data->>'role' = 'admin')
  );

-- Clients - admin pode ver todos
CREATE POLICY "Admin can view all clients" ON clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM auth.users au WHERE au.id = auth.uid() AND au.raw_user_meta_data->>'role' = 'admin')
  );

-- Jobs - admin pode ver todos
CREATE POLICY "Admin can view all jobs" ON jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM auth.users au WHERE au.id = auth.uid() AND au.raw_user_meta_data->>'role' = 'admin')
  );

-- Jobs - admin pode atualizar
CREATE POLICY "Admin can update all jobs" ON jobs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM auth.users au WHERE au.id = auth.uid() AND au.raw_user_meta_data->>'role' = 'admin')
  );

-- Job Applications - admin pode ver todos
CREATE POLICY "Admin can view all applications" ON job_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM auth.users au WHERE au.id = auth.uid() AND au.raw_user_meta_data->>'role' = 'admin')
  );

-- Job Assignments - admin pode ver todos
CREATE POLICY "Admin can view all assignments" ON job_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM auth.users au WHERE au.id = auth.uid() AND au.raw_user_meta_data->>'role' = 'admin')
  );
