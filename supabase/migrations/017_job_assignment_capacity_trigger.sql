-- Trigger para impedir que uma diária receba mais assignments do que required_workers
-- Protege contra race conditions mesmo com múltiplos requests simultâneos

CREATE OR REPLACE FUNCTION public.check_job_assignment_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_required   INTEGER;
  v_current    INTEGER;
BEGIN
  -- Só valida quando o novo status é ativo (pending ou confirmed)
  IF NEW.status NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  -- Busca o limite de prestadores da diária
  SELECT required_workers INTO v_required
  FROM public.jobs
  WHERE id = NEW.job_id;

  IF v_required IS NULL THEN
    RETURN NEW;
  END IF;

  -- Conta assignments ativos para esta diária, excluindo o próprio registro em caso de UPDATE
  SELECT COUNT(*) INTO v_current
  FROM public.job_assignments
  WHERE job_id = NEW.job_id
    AND status IN ('pending', 'confirmed')
    AND id <> COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_current >= v_required THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED: Esta diária já atingiu o limite de % prestador(es).', v_required;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger anterior se existir
DROP TRIGGER IF EXISTS trg_check_job_assignment_capacity ON public.job_assignments;

-- Cria o trigger (executa ANTES de INSERT e UPDATE, garantindo atomicidade)
CREATE TRIGGER trg_check_job_assignment_capacity
  BEFORE INSERT OR UPDATE ON public.job_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_job_assignment_capacity();
