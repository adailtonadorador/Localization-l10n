-- Add is_active column to workers table for enabling/disabling workers
-- When disabled, workers cannot login to the platform

ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Add deactivation_reason column for storing the reason when worker is disabled
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS deactivation_reason text DEFAULT NULL;

-- Add deactivated_at column to track when worker was disabled
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS deactivated_at timestamptz DEFAULT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_workers_is_active ON public.workers(is_active);

-- Add comments for documentation
COMMENT ON COLUMN public.workers.is_active IS 'Whether the worker is active and can access the platform. Controlled by admin.';
COMMENT ON COLUMN public.workers.deactivation_reason IS 'Reason provided by admin when disabling the worker.';
COMMENT ON COLUMN public.workers.deactivated_at IS 'Timestamp when the worker was disabled.';
