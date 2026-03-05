-- Add filial (branch code) column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS filial INTEGER NOT NULL DEFAULT 0;
