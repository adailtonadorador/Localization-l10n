-- Rename hourly_rate to daily_rate in jobs table
-- This reflects the change from hourly payment to daily payment

ALTER TABLE public.jobs
RENAME COLUMN hourly_rate TO daily_rate;

-- Update column comment
COMMENT ON COLUMN public.jobs.daily_rate IS 'Payment amount per day for the job';
