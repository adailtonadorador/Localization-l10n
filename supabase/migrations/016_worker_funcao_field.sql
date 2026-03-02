-- Add funcao (job function) to workers table
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS funcao TEXT DEFAULT NULL;
