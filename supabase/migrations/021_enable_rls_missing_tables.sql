-- ============================================================================
-- Migration 021: Enable RLS on tables where it was not activated
-- As políticas já existem desde schema.sql/002; este script apenas ativa o RLS.
-- ============================================================================

ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_assignments  ENABLE ROW LEVEL SECURITY;
