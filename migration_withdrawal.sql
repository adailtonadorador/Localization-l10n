-- Migration: Add withdrawal functionality to job_assignments
-- Description: Adds fields to track when and why a worker withdraws from a job assignment

-- Step 1: Add withdrawal_reason column
ALTER TABLE job_assignments
ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;

-- Step 2: Add withdrawn_at column
ALTER TABLE job_assignments
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE;

-- Step 3: Update the assignment_status enum to include 'withdrawn'
-- Note: In PostgreSQL, you cannot directly alter an enum type if it's in use.
-- You need to add the new value to the existing enum.
ALTER TYPE assignment_status ADD VALUE IF NOT EXISTS 'withdrawn';

-- Step 4: Add comment to columns for documentation
COMMENT ON COLUMN job_assignments.withdrawal_reason IS 'Reason provided by worker when withdrawing from a job assignment';
COMMENT ON COLUMN job_assignments.withdrawn_at IS 'Timestamp when the worker withdrew from the job assignment';

-- Step 5: Create index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_job_assignments_status ON job_assignments(status);

-- Step 6: Create index on withdrawn_at for analytics
CREATE INDEX IF NOT EXISTS idx_job_assignments_withdrawn_at ON job_assignments(withdrawn_at) WHERE withdrawn_at IS NOT NULL;
