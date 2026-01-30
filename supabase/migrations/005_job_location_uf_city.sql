-- =============================================
-- Migration: Adicionar UF e Município nas vagas
-- =============================================

-- Adicionar colunas de UF e Município
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS uf VARCHAR(2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS city VARCHAR(255);

-- Índices para filtros
CREATE INDEX IF NOT EXISTS idx_jobs_uf ON jobs(uf);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_jobs_uf_city ON jobs(uf, city);
