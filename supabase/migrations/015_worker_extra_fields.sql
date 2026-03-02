-- Add birth_date and phone_recado to workers table
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS birth_date DATE DEFAULT NULL;

ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS phone_recado TEXT DEFAULT NULL;
