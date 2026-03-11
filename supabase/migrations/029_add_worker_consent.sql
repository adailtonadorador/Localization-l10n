-- Add consent_accepted timestamp to workers table
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ DEFAULT NULL;
