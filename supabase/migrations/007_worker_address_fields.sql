-- Migration: Add address and PIX fields to workers table
-- Date: 2026-01-30

-- Add PIX key field
ALTER TABLE workers ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- Add address fields
ALTER TABLE workers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS cep VARCHAR(8);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS uf VARCHAR(2);

-- Add index for city/state queries (useful for filtering workers by location)
CREATE INDEX IF NOT EXISTS idx_workers_cidade_uf ON workers(cidade, uf);
