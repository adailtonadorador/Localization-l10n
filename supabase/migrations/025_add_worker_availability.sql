-- Add availability column to workers table
-- Stores schedule preferences: 'manha', 'tarde', 'noite'
ALTER TABLE workers ADD COLUMN IF NOT EXISTS availability TEXT[] DEFAULT '{}';
