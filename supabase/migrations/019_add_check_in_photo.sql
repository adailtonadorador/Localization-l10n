-- Adiciona coluna para foto do check-in
-- A foto do check-out será armazenada na coluna signature_data já existente
ALTER TABLE public.work_records ADD COLUMN IF NOT EXISTS check_in_photo TEXT;
