-- ============================================================================
-- Migration 023: Corrigir RLS com funções SECURITY DEFINER
-- ============================================================================
-- PROBLEMA 1: Políticas de admin usam subquery em public.users para verificar
-- role='admin'. Com RLS ativo em users, isso cria dependência circular → 500.
--
-- PROBLEMA 2: Políticas com subqueries cruzadas entre tabelas (ex: policy em
-- job_assignments faz SELECT em jobs, e policy em jobs faz SELECT em
-- job_assignments) causam recursão infinita → 42P17.
--
-- SOLUÇÃO:
--   1. Dropar TODAS as políticas existentes em cada tabela (limpeza total)
--   2. Criar funções SECURITY DEFINER que bypassa RLS para:
--      a) Verificar roles (is_admin, is_worker, is_client, is_approved_worker)
--      b) Verificar ownership cruzado (is_job_owner, is_assigned_to_job,
--         has_work_record_for_job)
--   3. Recriar todas as políticas usando APENAS funções SECURITY DEFINER
--      para qualquer consulta cross-table (elimina recursão)
-- ============================================================================


-- ============================================================================
-- 0. LIMPEZA TOTAL — Dropar todas as políticas de todas as tabelas
-- ============================================================================
-- Usa bloco DO para iterar pg_policies e dropar tudo dinamicamente.
-- Isso garante que nenhuma política antiga (com nomes diferentes) sobreviva.
-- ============================================================================

DO $$
DECLARE
  _table TEXT;
  _policy TEXT;
  _tables TEXT[] := ARRAY[
    'users', 'workers', 'clients', 'jobs',
    'job_applications', 'job_assignments', 'work_records',
    'worker_availability', 'notifications', 'push_subscriptions',
    'withdrawal_history', 'project_tasks'
  ];
BEGIN
  FOREACH _table IN ARRAY _tables LOOP
    FOR _policy IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = _table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _policy, _table);
    END LOOP;
  END LOOP;
END $$;


-- ============================================================================
-- 1. FUNÇÕES HELPER — SECURITY DEFINER (bypassa RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_worker()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'worker'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_worker()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workers
    WHERE id = auth.uid() AND approval_status = 'approved' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_client()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'client'
  );
$$;

-- Verifica se o usuário atual é o client dono de um job específico (bypassa jobs RLS)
CREATE OR REPLACE FUNCTION public.is_job_owner(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs WHERE id = p_job_id AND client_id = auth.uid()
  );
$$;

-- Verifica se o worker atual tem assignment para um job (bypassa job_assignments RLS)
CREATE OR REPLACE FUNCTION public.is_assigned_to_job(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.job_assignments WHERE job_id = p_job_id AND worker_id = auth.uid()
  );
$$;

-- Verifica se o worker atual tem work_record para um job (bypassa work_records RLS)
CREATE OR REPLACE FUNCTION public.has_work_record_for_job(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.work_records WHERE job_id = p_job_id AND worker_id = auth.uid()
  );
$$;


-- ============================================================================
-- 2. TABELA: users
-- ============================================================================

CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON public.users
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can update all users" ON public.users
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can insert users" ON public.users
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete users" ON public.users
  FOR DELETE USING (public.is_admin());


-- ============================================================================
-- 3. TABELA: workers
-- ============================================================================

CREATE POLICY "Workers can view own data" ON public.workers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Workers can update own data" ON public.workers
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Workers can insert own data" ON public.workers
  FOR INSERT WITH CHECK (auth.uid() = id AND public.is_worker());

CREATE POLICY "Admin can view all workers" ON public.workers
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can update all workers" ON public.workers
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can insert workers" ON public.workers
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete workers" ON public.workers
  FOR DELETE USING (public.is_admin());


-- ============================================================================
-- 4. TABELA: clients
-- ============================================================================

CREATE POLICY "Clients can view own data" ON public.clients
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Clients can update own data" ON public.clients
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Clients can insert own data" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = id AND public.is_client());

CREATE POLICY "Admin can view all clients" ON public.clients
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can update all clients" ON public.clients
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can insert clients" ON public.clients
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete clients" ON public.clients
  FOR DELETE USING (public.is_admin());

-- Workers podem ver dados de clients (company_name em jobs)
CREATE POLICY "Workers can view clients" ON public.clients
  FOR SELECT USING (public.is_worker());


-- ============================================================================
-- 5. TABELA: jobs
-- ============================================================================

CREATE POLICY "Admin can view all jobs" ON public.jobs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can update all jobs" ON public.jobs
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can insert jobs" ON public.jobs
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete jobs" ON public.jobs
  FOR DELETE USING (public.is_admin());

-- Qualquer autenticado pode ver jobs abertos
CREATE POLICY "Anyone can view open jobs" ON public.jobs
  FOR SELECT USING (status = 'open');

-- Clients podem ver seus próprios jobs (qualquer status)
CREATE POLICY "Clients can view own jobs" ON public.jobs
  FOR SELECT USING (client_id = auth.uid());

-- Clients podem criar jobs
CREATE POLICY "Clients can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (client_id = auth.uid() AND public.is_client());

-- Clients podem atualizar seus jobs
CREATE POLICY "Clients can update own jobs" ON public.jobs
  FOR UPDATE USING (client_id = auth.uid());

-- Workers podem ver jobs atribuídos a eles (Minhas Diárias)
-- Usa SECURITY DEFINER para evitar recursão com job_assignments
CREATE POLICY "Workers can view assigned jobs" ON public.jobs
  FOR SELECT USING (public.is_assigned_to_job(id));

-- Workers podem ver jobs com work_records
-- Usa SECURITY DEFINER para evitar recursão com work_records
CREATE POLICY "Workers can view jobs with work records" ON public.jobs
  FOR SELECT USING (public.has_work_record_for_job(id));


-- ============================================================================
-- 6. TABELA: job_applications
-- ============================================================================

CREATE POLICY "Admin can view all applications" ON public.job_applications
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can update applications" ON public.job_applications
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete applications" ON public.job_applications
  FOR DELETE USING (public.is_admin());

CREATE POLICY "Admin can insert applications" ON public.job_applications
  FOR INSERT WITH CHECK (public.is_admin());

-- Workers podem ver suas aplicações
CREATE POLICY "Workers can view own applications" ON public.job_applications
  FOR SELECT USING (worker_id = auth.uid());

-- Workers aprovados podem criar aplicações
CREATE POLICY "Approved workers can create applications" ON public.job_applications
  FOR INSERT WITH CHECK (
    worker_id = auth.uid() AND public.is_approved_worker()
  );

-- Workers podem deletar suas aplicações (cancelar candidatura)
CREATE POLICY "Workers can delete own applications" ON public.job_applications
  FOR DELETE USING (worker_id = auth.uid());

-- Clients podem ver aplicações de seus jobs
CREATE POLICY "Clients can view applications for own jobs" ON public.job_applications
  FOR SELECT USING (public.is_job_owner(job_id));

-- Clients podem atualizar aplicações de seus jobs (aprovar/rejeitar)
CREATE POLICY "Clients can update applications for own jobs" ON public.job_applications
  FOR UPDATE USING (public.is_job_owner(job_id));


-- ============================================================================
-- 7. TABELA: job_assignments
-- ============================================================================

CREATE POLICY "Admin can view all assignments" ON public.job_assignments
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can insert all assignments" ON public.job_assignments
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update all assignments" ON public.job_assignments
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete all assignments" ON public.job_assignments
  FOR DELETE USING (public.is_admin());

-- Workers podem ver suas atribuições
CREATE POLICY "Workers can view own assignments" ON public.job_assignments
  FOR SELECT USING (worker_id = auth.uid());

-- Workers podem atualizar suas atribuições (confirmar, desistir)
CREATE POLICY "Workers can update own assignments" ON public.job_assignments
  FOR UPDATE USING (worker_id = auth.uid());

-- Workers aprovados podem se auto-atribuir
CREATE POLICY "Approved workers can self-assign to jobs" ON public.job_assignments
  FOR INSERT WITH CHECK (
    worker_id = auth.uid() AND public.is_approved_worker()
  );

-- Clients podem ver atribuições de seus jobs
CREATE POLICY "Clients can view assignments for own jobs" ON public.job_assignments
  FOR SELECT USING (public.is_job_owner(job_id));

-- Clients podem criar atribuições para seus jobs
CREATE POLICY "Clients can create assignments for own jobs" ON public.job_assignments
  FOR INSERT WITH CHECK (public.is_job_owner(job_id));


-- ============================================================================
-- 8. TABELA: work_records
-- ============================================================================

CREATE POLICY "Admin can view all work records" ON public.work_records
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can insert work records" ON public.work_records
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update all work records" ON public.work_records
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete all work records" ON public.work_records
  FOR DELETE USING (public.is_admin());

-- Worker pode ver seus próprios work_records
CREATE POLICY "Workers can view own work records" ON public.work_records
  FOR SELECT USING (worker_id = auth.uid());

-- Worker pode criar work_records
CREATE POLICY "Workers can insert own work records" ON public.work_records
  FOR INSERT WITH CHECK (worker_id = auth.uid());

-- Worker pode atualizar seus work_records (check-in/check-out)
CREATE POLICY "Workers can update own work records" ON public.work_records
  FOR UPDATE USING (worker_id = auth.uid());

-- Worker pode deletar apenas registros pending
CREATE POLICY "Worker can delete own pending records" ON public.work_records
  FOR DELETE USING (worker_id = auth.uid() AND status = 'pending');

-- Client pode ver work_records de seus jobs
CREATE POLICY "Clients can view work records for own jobs" ON public.work_records
  FOR SELECT USING (public.is_job_owner(job_id));


-- ============================================================================
-- 9. TABELA: worker_availability
-- ============================================================================

CREATE POLICY "Admin can manage all worker availability" ON public.worker_availability
  FOR ALL USING (public.is_admin());

CREATE POLICY "Workers can manage own availability" ON public.worker_availability
  FOR ALL USING (worker_id = auth.uid());


-- ============================================================================
-- 10. TABELA: notifications
-- ============================================================================

-- Service role insere notificações (Edge Functions)
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Admin can view all notifications" ON public.notifications
  FOR SELECT USING (public.is_admin());


-- ============================================================================
-- 11. TABELA: push_subscriptions
-- ============================================================================

CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.push_subscriptions
  FOR SELECT USING (public.is_admin());

-- Service role full access (Edge Functions)
CREATE POLICY "Service role full access" ON public.push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- 12. TABELA: withdrawal_history
-- ============================================================================

CREATE POLICY "Admin can manage withdrawal history" ON public.withdrawal_history
  FOR ALL USING (public.is_admin());

CREATE POLICY "Worker can insert own withdrawal history" ON public.withdrawal_history
  FOR INSERT WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Worker can view own withdrawal history" ON public.withdrawal_history
  FOR SELECT USING (worker_id = auth.uid());


-- ============================================================================
-- 13. TABELA: project_tasks
-- ============================================================================

-- Corrigir política antiga que usava subquery direta em users
CREATE POLICY "Admin can manage project tasks" ON public.project_tasks
  FOR ALL USING (public.is_admin());
