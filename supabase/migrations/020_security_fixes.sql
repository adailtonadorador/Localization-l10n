-- ============================================================================
-- Migration 020: Security Fixes
-- ============================================================================
-- Corrige 7 vulnerabilidades identificadas na auditoria de segurança:
--   1. CRITICAL  — notifications INSERT aberta a qualquer usuário autenticado
--   2. HIGH      — políticas de admin usam auth.raw_user_meta_data (client-controlled)
--   3. HIGH      — worker_availability sem política para admin
--   4. MEDIUM    — workers podem deletar work_records já completados
--   5. MEDIUM    — workers podem alterar campos imutáveis / forçar status inválidos
--   6. MEDIUM    — índices compostos ausentes em work_records
--   7. LOW       — cleanup_old_notifications sem controle de acesso
-- ============================================================================


-- ----------------------------------------------------------------------------
-- FIX 1 (CRITICAL): notifications INSERT — só service_role pode inserir
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');


-- ----------------------------------------------------------------------------
-- FIX 2 (HIGH): Políticas de admin — trocar raw_user_meta_data por public.users.role
-- auth.raw_user_meta_data é controlado pelo cliente no signup; public.users.role
-- é definido server-side e não pode ser manipulado pelo usuário.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can view all workers"      ON public.workers;
DROP POLICY IF EXISTS "Admin can update all workers"    ON public.workers;
DROP POLICY IF EXISTS "Admin can view all clients"      ON public.clients;
DROP POLICY IF EXISTS "Admin can view all jobs"         ON public.jobs;
DROP POLICY IF EXISTS "Admin can update all jobs"       ON public.jobs;
DROP POLICY IF EXISTS "Admin can view all applications" ON public.job_applications;
DROP POLICY IF EXISTS "Admin can view all assignments"  ON public.job_assignments;

CREATE POLICY "Admin can view all workers" ON public.workers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can update all workers" ON public.workers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can view all clients" ON public.clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can view all jobs" ON public.jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can update all jobs" ON public.jobs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can view all applications" ON public.job_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can view all assignments" ON public.job_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );


-- ----------------------------------------------------------------------------
-- FIX 3 (HIGH): worker_availability — adicionar política para admin
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can manage all worker availability" ON public.worker_availability;

CREATE POLICY "Admin can manage all worker availability" ON public.worker_availability
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );


-- ----------------------------------------------------------------------------
-- FIX 4 (MEDIUM): work_records DELETE — só registros com status 'pending'
-- Impede que worker apague prova de presença já registrada.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Worker can delete own records" ON public.work_records;

CREATE POLICY "Worker can delete own pending records" ON public.work_records
  FOR DELETE USING (
    worker_id = auth.uid()
    AND status = 'pending'
  );


-- ----------------------------------------------------------------------------
-- FIX 5 (MEDIUM): work_records UPDATE — trigger protege campos imutáveis
-- e impede transições de status inválidas por workers.
-- Fluxo válido para worker: pending → in_progress (check-in)
--                           in_progress → completed (check-out)
-- Status 'absent' é exclusivo do admin.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_work_record_fields()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    -- Campos imutáveis: não podem ser alterados por ninguém exceto admin
    IF NEW.job_id    IS DISTINCT FROM OLD.job_id    THEN
      RAISE EXCEPTION 'Campo job_id não pode ser alterado';
    END IF;
    IF NEW.worker_id IS DISTINCT FROM OLD.worker_id THEN
      RAISE EXCEPTION 'Campo worker_id não pode ser alterado';
    END IF;
    IF NEW.work_date IS DISTINCT FROM OLD.work_date THEN
      RAISE EXCEPTION 'Campo work_date não pode ser alterado';
    END IF;

    -- Workers não podem definir status = 'absent'
    IF NEW.status = 'absent' THEN
      RAISE EXCEPTION 'Somente o admin pode marcar ausência';
    END IF;

    -- Workers não podem reverter um status já completado
    IF OLD.status = 'completed' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Registro já finalizado não pode ser alterado';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_work_record_fields ON public.work_records;

CREATE TRIGGER trg_protect_work_record_fields
  BEFORE UPDATE ON public.work_records
  FOR EACH ROW EXECUTE FUNCTION public.protect_work_record_fields();


-- ----------------------------------------------------------------------------
-- FIX 6 (MEDIUM): Índices compostos para queries de monitoramento
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_work_records_job_date
  ON public.work_records(job_id, work_date);

CREATE INDEX IF NOT EXISTS idx_work_records_worker_date
  ON public.work_records(worker_id, work_date);


-- ----------------------------------------------------------------------------
-- FIX 7 (LOW): cleanup_old_notifications — restringir a service_role
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;
