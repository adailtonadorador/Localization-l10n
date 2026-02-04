-- Add address fields to clients table
-- This allows storing detailed company address from ReceitaWS

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS fantasia TEXT,
ADD COLUMN IF NOT EXISTS cep VARCHAR(8),
ADD COLUMN IF NOT EXISTS logradouro TEXT,
ADD COLUMN IF NOT EXISTS numero VARCHAR(20),
ADD COLUMN IF NOT EXISTS complemento TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS uf VARCHAR(2);

-- Add comments
COMMENT ON COLUMN public.clients.fantasia IS 'Trade name (nome fantasia) of the company';
COMMENT ON COLUMN public.clients.cep IS 'Postal code (CEP) - 8 digits';
COMMENT ON COLUMN public.clients.logradouro IS 'Street name';
COMMENT ON COLUMN public.clients.numero IS 'Street number';
COMMENT ON COLUMN public.clients.complemento IS 'Address complement (suite, floor, etc)';
COMMENT ON COLUMN public.clients.bairro IS 'Neighborhood';
COMMENT ON COLUMN public.clients.cidade IS 'City name';
COMMENT ON COLUMN public.clients.uf IS 'State abbreviation (2 letters)';
