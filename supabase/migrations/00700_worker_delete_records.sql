-- =============================================
-- Migration: Permitir worker deletar seus work_records
-- Necessário para a funcionalidade de desistência de diária
-- =============================================

-- Permitir que o worker delete seus próprios work_records
CREATE POLICY "Worker can delete own records" ON work_records
  FOR DELETE USING (worker_id = auth.uid());
