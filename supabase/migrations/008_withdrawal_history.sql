-- =============================================
-- Migration: Histórico de Desistências
-- Registra todas as desistências para análise
-- =============================================

-- Tabela de histórico de desistências
CREATE TABLE IF NOT EXISTS withdrawal_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_assignment_id UUID NOT NULL REFERENCES job_assignments(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  withdrawal_reason TEXT NOT NULL,
  withdrawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_withdrawal_history_worker ON withdrawal_history(worker_id);
CREATE INDEX idx_withdrawal_history_job ON withdrawal_history(job_id);
CREATE INDEX idx_withdrawal_history_date ON withdrawal_history(withdrawn_at);

-- RLS
ALTER TABLE withdrawal_history ENABLE ROW LEVEL SECURITY;

-- Admin pode ver e gerenciar todo o histórico
CREATE POLICY "Admin can manage withdrawal history" ON withdrawal_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Worker pode inserir seu próprio histórico
CREATE POLICY "Worker can insert own withdrawal history" ON withdrawal_history
  FOR INSERT WITH CHECK (worker_id = auth.uid());

-- Worker pode ver seu próprio histórico
CREATE POLICY "Worker can view own withdrawal history" ON withdrawal_history
  FOR SELECT USING (worker_id = auth.uid());
