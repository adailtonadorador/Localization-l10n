-- =============================================
-- Migration: Suporte a múltiplas datas por vaga
-- =============================================

-- Adicionar coluna de array de datas
ALTER TABLE jobs ADD COLUMN dates DATE[] DEFAULT '{}';

-- Migrar dados existentes da coluna date para dates
UPDATE jobs SET dates = ARRAY[date] WHERE date IS NOT NULL;

-- Remover a coluna antiga (opcional - pode manter para compatibilidade)
-- ALTER TABLE jobs DROP COLUMN date;

-- Criar índice para busca em array de datas
CREATE INDEX idx_jobs_dates ON jobs USING GIN(dates);
