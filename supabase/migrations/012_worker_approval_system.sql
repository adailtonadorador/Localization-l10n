-- =============================================
-- Worker Approval System Migration
-- =============================================
-- This migration adds a comprehensive approval workflow for workers.
-- Workers must be approved by admin before they can access and take jobs.

-- Create worker approval status enum
DO $$ BEGIN
  CREATE TYPE worker_approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add approval status column (default: pending)
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS approval_status worker_approval_status DEFAULT 'pending' NOT NULL;

-- Add approval date column (when admin approved/rejected)
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS approval_date timestamptz DEFAULT NULL;

-- Add approval notes column (admin notes about approval)
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS approval_notes text DEFAULT NULL;

-- Add rejection reason column (reason for rejection)
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS rejected_reason text DEFAULT NULL;

-- Create index for faster queries on approval status
CREATE INDEX IF NOT EXISTS idx_workers_approval_status ON public.workers(approval_status);

-- Add column comments for documentation
COMMENT ON COLUMN public.workers.approval_status IS 'Approval status of the worker account. Must be approved by admin before accessing jobs.';
COMMENT ON COLUMN public.workers.approval_date IS 'Timestamp when admin approved or rejected the worker.';
COMMENT ON COLUMN public.workers.approval_notes IS 'Optional notes from admin about the approval decision.';
COMMENT ON COLUMN public.workers.rejected_reason IS 'Reason provided by admin when rejecting the worker.';

-- =============================================
-- RLS Policies for Worker Approval
-- =============================================

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Workers can create applications" ON public.job_applications;
DROP POLICY IF EXISTS "Clients can view workers" ON public.workers;

-- Workers can only create job applications if approved
CREATE POLICY "Approved workers can create applications" ON public.job_applications
  FOR INSERT WITH CHECK (
    worker_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.workers
      WHERE id = auth.uid()
        AND approval_status = 'approved'
        AND is_active = true
    )
  );

-- Clients can only view approved workers
CREATE POLICY "Clients can view approved workers" ON public.workers
  FOR SELECT USING (
    approval_status = 'approved' AND
    is_active = true AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'client')
  );

-- Drop existing policy for creating job assignments
DROP POLICY IF EXISTS "Workers can create assignments" ON public.job_assignments;

-- Workers can only create job assignments if approved (direct assignment)
-- Note: The original schema doesn't have this policy, but adding for consistency
CREATE POLICY "Approved workers can self-assign to jobs" ON public.job_assignments
  FOR INSERT WITH CHECK (
    worker_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.workers
      WHERE id = auth.uid()
        AND approval_status = 'approved'
        AND is_active = true
    )
  );

-- Admin can view all workers regardless of approval status
-- (Already covered by existing "Admin can view all users" policy)

-- Admin can update worker approval status
CREATE POLICY "Admin can update worker approval" ON public.workers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- Function to validate approval status changes
-- =============================================

-- Function to automatically set approval_date when status changes
CREATE OR REPLACE FUNCTION handle_worker_approval_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If approval_status changed to approved or rejected, set approval_date
  IF (OLD.approval_status IS DISTINCT FROM NEW.approval_status) AND
     (NEW.approval_status IN ('approved', 'rejected')) AND
     (NEW.approval_date IS NULL) THEN
    NEW.approval_date = NOW();
  END IF;

  -- If changing to rejected, ensure rejected_reason is provided
  IF (NEW.approval_status = 'rejected') AND (NEW.rejected_reason IS NULL OR TRIM(NEW.rejected_reason) = '') THEN
    RAISE EXCEPTION 'rejected_reason is required when rejecting a worker';
  END IF;

  -- Clear rejected_reason if status is not rejected
  IF (NEW.approval_status != 'rejected') THEN
    NEW.rejected_reason = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for approval status changes
DROP TRIGGER IF EXISTS worker_approval_status_change ON public.workers;
CREATE TRIGGER worker_approval_status_change
  BEFORE UPDATE ON public.workers
  FOR EACH ROW
  EXECUTE FUNCTION handle_worker_approval_change();

-- =============================================
-- Update existing workers to approved status
-- =============================================
-- Existing workers with documents_verified = true should be auto-approved
-- This ensures backward compatibility

UPDATE public.workers
SET approval_status = 'approved',
    approval_date = NOW(),
    approval_notes = 'Auto-approved during migration (existing verified worker)'
WHERE documents_verified = true
  AND approval_status = 'pending';
