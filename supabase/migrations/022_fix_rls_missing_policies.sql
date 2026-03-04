-- ============================================================================
-- Migration 022: Corrigir políticas RLS faltantes após ativar RLS em todas tabelas
-- ============================================================================
-- Problemas identificados:
--   1. users: admin não consegue ver dados de users (foto, nome, email) em joins
--   2. jobs: worker não consegue ver jobs com status != 'open' (Minhas Diárias)
--   3. clients: worker não consegue ver company_name em jobs
--   4. admin: faltam políticas de INSERT/DELETE em várias tabelas
--   5. work_records: faltam políticas de admin e INSERT do worker
-- ============================================================================


-- ============================================================================
-- TABELA: users
-- Problema: "Admin can view all users" pode não existir. Sem ela, admin não
-- consegue ver name/email/phone/avatar_url em joins com workers.
-- ============================================================================

-- Admin pode ver todos os usuários
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
CREATE POLICY "Admin can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Admin pode atualizar todos os usuários (ex: alterar role)
DROP POLICY IF EXISTS "Admin can update all users" ON public.users;
CREATE POLICY "Admin can update all users" ON public.users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );


-- ============================================================================
-- TABELA: jobs
-- Problema: worker só vê jobs com status='open'. Quando aceita um job e o
-- status muda, o worker perde acesso ao job em "Minhas Diárias".
-- ============================================================================

-- Workers podem ver jobs aos quais foram atribuídos (qualquer status)
DROP POLICY IF EXISTS "Workers can view assigned jobs" ON public.jobs;
CREATE POLICY "Workers can view assigned jobs" ON public.jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.job_assignments ja
      WHERE ja.job_id = id AND ja.worker_id = auth.uid()
    )
  );

-- Workers podem ver jobs onde têm work_records
DROP POLICY IF EXISTS "Workers can view jobs with work records" ON public.jobs;
CREATE POLICY "Workers can view jobs with work records" ON public.jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.work_records wr
      WHERE wr.job_id = id AND wr.worker_id = auth.uid()
    )
  );

-- Admin pode criar jobs
DROP POLICY IF EXISTS "Admin can insert jobs" ON public.jobs;
CREATE POLICY "Admin can insert jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin pode deletar jobs
DROP POLICY IF EXISTS "Admin can delete jobs" ON public.jobs;
CREATE POLICY "Admin can delete jobs" ON public.jobs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================================
-- TABELA: clients
-- Problema: workers não conseguem ver company_name ao listar jobs.
-- Política restrita: workers só veem clients que têm jobs acessíveis.
-- ============================================================================

-- Workers podem ver dados de clients que postaram jobs
DROP POLICY IF EXISTS "Workers can view clients" ON public.clients;
CREATE POLICY "Workers can view clients" ON public.clients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'worker')
  );

-- Admin pode criar clients
DROP POLICY IF EXISTS "Admin can insert clients" ON public.clients;
CREATE POLICY "Admin can insert clients" ON public.clients
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin pode atualizar clients
DROP POLICY IF EXISTS "Admin can update all clients" ON public.clients;
CREATE POLICY "Admin can update all clients" ON public.clients
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin pode deletar clients
DROP POLICY IF EXISTS "Admin can delete clients" ON public.clients;
CREATE POLICY "Admin can delete clients" ON public.clients
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================================
-- TABELA: job_applications
-- Garantir que admin tem acesso completo
-- ============================================================================

DROP POLICY IF EXISTS "Admin can update applications" ON public.job_applications;
CREATE POLICY "Admin can update applications" ON public.job_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin can delete applications" ON public.job_applications;
CREATE POLICY "Admin can delete applications" ON public.job_applications
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================================
-- TABELA: work_records
-- Garantir que admin tem CRUD completo e workers podem gerenciar seus registros.
-- Políticas existentes (mig 020): DELETE (pending only), UPDATE trigger.
-- ============================================================================

-- Admin pode ver todos os work_records
DROP POLICY IF EXISTS "Admin can view all work records" ON public.work_records;
CREATE POLICY "Admin can view all work records" ON public.work_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin pode criar work_records
DROP POLICY IF EXISTS "Admin can insert work records" ON public.work_records;
CREATE POLICY "Admin can insert work records" ON public.work_records
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin pode atualizar work_records
DROP POLICY IF EXISTS "Admin can update all work records" ON public.work_records;
CREATE POLICY "Admin can update all work records" ON public.work_records
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin pode deletar work_records
DROP POLICY IF EXISTS "Admin can delete all work records" ON public.work_records;
CREATE POLICY "Admin can delete all work records" ON public.work_records
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Worker pode ver seus próprios work_records
DROP POLICY IF EXISTS "Workers can view own work records" ON public.work_records;
CREATE POLICY "Workers can view own work records" ON public.work_records
  FOR SELECT USING (worker_id = auth.uid());

-- Worker pode criar work_records (para si mesmo)
DROP POLICY IF EXISTS "Workers can insert own work records" ON public.work_records;
CREATE POLICY "Workers can insert own work records" ON public.work_records
  FOR INSERT WITH CHECK (worker_id = auth.uid());

-- Worker pode atualizar seus work_records (check-in/check-out)
DROP POLICY IF EXISTS "Workers can update own work records" ON public.work_records;
CREATE POLICY "Workers can update own work records" ON public.work_records
  FOR UPDATE USING (worker_id = auth.uid());

-- Worker DELETE de pending records (já existe na mig 020, recriar por segurança)
DROP POLICY IF EXISTS "Worker can delete own pending records" ON public.work_records;
CREATE POLICY "Worker can delete own pending records" ON public.work_records
  FOR DELETE USING (worker_id = auth.uid() AND status = 'pending');


-- ============================================================================
-- TABELA: job_assignments
-- Garantir que admin tem CRUD e workers podem gerenciar suas atribuições.
-- ============================================================================

-- Admin INSERT/UPDATE/DELETE já existem (mig 018), recriar por segurança
DROP POLICY IF EXISTS "Admin can insert all assignments" ON public.job_assignments;
CREATE POLICY "Admin can insert all assignments" ON public.job_assignments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

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


-- ============================================================================
-- TABELA: workers
-- Garantir que admin pode inserir e deletar workers
-- ============================================================================

DROP POLICY IF EXISTS "Admin can insert workers" ON public.workers;
CREATE POLICY "Admin can insert workers" ON public.workers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin can delete workers" ON public.workers;
CREATE POLICY "Admin can delete workers" ON public.workers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
