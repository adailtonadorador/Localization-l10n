-- =============================================
-- Fix 1: Adicionar valores ausentes ao ENUM assignment_status
-- (Se a coluna ainda for ENUM; se já for VARCHAR, estes comandos não causam erro)
-- =============================================

DO $$ BEGIN
  ALTER TYPE assignment_status ADD VALUE IF NOT EXISTS 'withdrawn';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE assignment_status ADD VALUE IF NOT EXISTS 'unassigned_by_admin';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE assignment_status ADD VALUE IF NOT EXISTS 'in_progress';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE assignment_status ADD VALUE IF NOT EXISTS 'checked_in';
EXCEPTION WHEN others THEN null;
END $$;

-- =============================================
-- Fix 2: Adicionar política de UPDATE e DELETE para admin em job_assignments
-- (sem esta política o admin não conseguia atualizar o status dos assignments)
-- =============================================

DROP POLICY IF EXISTS "Admin can update all assignments" ON public.job_assignments;
CREATE POLICY "Admin can update all assignments" ON public.job_assignments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin can delete all assignments" ON public.job_assignments;
CREATE POLICY "Admin can delete all assignments" ON public.job_assignments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- Fix 3: Garantir que a política de INSERT para admin também existe
-- =============================================

DROP POLICY IF EXISTS "Admin can insert all assignments" ON public.job_assignments;
CREATE POLICY "Admin can insert all assignments" ON public.job_assignments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
