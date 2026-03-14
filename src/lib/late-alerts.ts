export interface LateAlert {
  type: 'late_checkin' | 'late_checkout';
  jobId: string;
  jobTitle: string;
  jobLocation: string;
  workerName: string;
  workerId: string;
  workRecordId: string;
  scheduledTime: string;
  minutesLate: number;
  workDate: string;
}

interface WorkRecordForAlert {
  id: string;
  worker_id?: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  work_date: string;
  workers: {
    id: string;
    users: {
      name: string;
    };
  };
}

interface JobForAlert {
  id: string;
  title: string;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
  work_records: WorkRecordForAlert[];
}

const LATE_THRESHOLD_MINUTES = 30;

/**
 * Combina a data do job com o horário (start_time/end_time) em um Date local.
 */
function combineDateAndTime(dateStr: string, timeStr: string): Date {
  // timeStr pode ser "HH:MM" ou "HH:MM:SS"
  const timePart = timeStr.slice(0, 5);
  return new Date(`${dateStr}T${timePart}:00`);
}

/**
 * Detecta workers atrasados para check-in ou check-out.
 */
export function detectLateWorkers(jobs: JobForAlert[], now: Date): LateAlert[] {
  const alerts: LateAlert[] = [];

  for (const job of jobs) {
    const startTime = combineDateAndTime(job.date, job.start_time);
    const endTime = combineDateAndTime(job.date, job.end_time);

    const lateCheckinThreshold = new Date(startTime.getTime() + LATE_THRESHOLD_MINUTES * 60000);
    const lateCheckoutThreshold = new Date(endTime.getTime() + LATE_THRESHOLD_MINUTES * 60000);

    for (const record of job.work_records) {
      const workerName = record.workers?.users?.name || 'Desconhecido';
      const workerId = record.workers?.id || record.worker_id || '';

      // Late check-in: status pending, sem check_in, e passou 30min do start_time
      if (
        record.status === 'pending' &&
        !record.check_in &&
        now >= lateCheckinThreshold
      ) {
        const minutesLate = Math.floor((now.getTime() - startTime.getTime()) / 60000);
        alerts.push({
          type: 'late_checkin',
          jobId: job.id,
          jobTitle: job.title,
          jobLocation: job.location,
          workerName,
          workerId,
          workRecordId: record.id,
          scheduledTime: job.start_time.slice(0, 5),
          minutesLate,
          workDate: job.date,
        });
      }

      // Late check-out: em andamento (tem check_in, sem check_out), e passou 30min do end_time
      if (
        (record.status === 'in_progress' || record.status === 'checked_in') &&
        record.check_in &&
        !record.check_out &&
        now >= lateCheckoutThreshold
      ) {
        const minutesLate = Math.floor((now.getTime() - endTime.getTime()) / 60000);
        alerts.push({
          type: 'late_checkout',
          jobId: job.id,
          jobTitle: job.title,
          jobLocation: job.location,
          workerName,
          workerId,
          workRecordId: record.id,
          scheduledTime: job.end_time.slice(0, 5),
          minutesLate,
          workDate: job.date,
        });
      }
    }
  }

  return alerts;
}

/**
 * Gera uma chave única para deduplicação de notificações push.
 */
export function getAlertKey(alert: LateAlert): string {
  return `late-alert-${alert.jobId}-${alert.workerId}-${alert.type}-${alert.workDate}`;
}

/**
 * Verifica se a notificação push já foi enviada para este alerta.
 */
export function wasAlertNotified(alert: LateAlert): boolean {
  return localStorage.getItem(getAlertKey(alert)) === 'true';
}

/**
 * Marca a notificação push como enviada para este alerta.
 */
export function markAlertNotified(alert: LateAlert): void {
  localStorage.setItem(getAlertKey(alert), 'true');
}
