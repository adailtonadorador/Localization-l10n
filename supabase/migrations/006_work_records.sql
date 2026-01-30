-- =============================================
-- Migration: Registros de Trabalho e Assinaturas
-- =============================================

-- Tabela de registros de trabalho (check-in/check-out por dia)
CREATE TABLE work_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  signature_data TEXT, -- Base64 da assinatura
  signed_at TIMESTAMPTZ,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, absent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, worker_id, work_date)
);

-- Índices
CREATE INDEX idx_work_records_job ON work_records(job_id);
CREATE INDEX idx_work_records_worker ON work_records(worker_id);
CREATE INDEX idx_work_records_date ON work_records(work_date);
CREATE INDEX idx_work_records_status ON work_records(status);

-- RLS
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- Trabalhador pode ver, inserir e atualizar seus próprios registros
CREATE POLICY "Worker can view own records" ON work_records
  FOR SELECT USING (worker_id = auth.uid());

CREATE POLICY "Worker can insert own records" ON work_records
  FOR INSERT WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Worker can update own records" ON work_records
  FOR UPDATE USING (worker_id = auth.uid());

-- Admin pode ver e gerenciar todos os registros
CREATE POLICY "Admin can manage all records" ON work_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Cliente pode ver registros dos seus jobs
CREATE POLICY "Client can view job records" ON work_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = work_records.job_id
      AND jobs.client_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_work_records_updated_at
  BEFORE UPDATE ON work_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Modificar job_assignments para ser mais simples (trabalhador pegou a vaga)
-- A tabela já existe, vamos apenas garantir que ela tenha os campos necessários
ALTER TABLE job_assignments ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW();
