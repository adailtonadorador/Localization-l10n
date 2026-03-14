import { useState, useEffect, useRef, useCallback } from 'react';
import { supabaseUntyped } from '@/lib/supabase';
import { detectLateWorkers, type LateAlert } from '@/lib/late-alerts';
import { getLocalToday } from '@/lib/date-utils';

const REFRESH_INTERVAL_MS = 60_000; // 1 minuto

export function useAdminLateAlerts(enabled: boolean) {
  const [alerts, setAlerts] = useState<LateAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAlerts = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      const today = getLocalToday();

      // Buscar jobs de hoje com work_records de workers confirmados
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select('id, title, location, date, start_time, end_time')
        .eq('date', today);

      if (!jobsData || jobsData.length === 0) {
        setAlerts([]);
        return;
      }

      const jobIds = jobsData.map((j: { id: string }) => j.id);

      // Buscar assignments confirmados
      const { data: assignmentsData } = await supabaseUntyped
        .from('job_assignments')
        .select('job_id, worker_id')
        .in('job_id', jobIds)
        .in('status', ['confirmed', 'completed']);

      const confirmedWorkers = new Set(
        (assignmentsData || []).map((a: { job_id: string; worker_id: string }) => `${a.job_id}:${a.worker_id}`)
      );

      // Buscar work_records de hoje
      const { data: workRecordsData } = await supabaseUntyped
        .from('work_records')
        .select(`
          id, job_id, worker_id, check_in, check_out, status, work_date,
          workers (id, users (name))
        `)
        .eq('work_date', today)
        .in('job_id', jobIds);

      // Montar jobs com work_records filtrados por confirmados
      const jobsWithRecords = jobsData.map((job: { id: string; title: string; location: string; date: string; start_time: string; end_time: string }) => ({
        ...job,
        work_records: (workRecordsData || [])
          .filter((wr: { job_id: string; worker_id: string }) =>
            wr.job_id === job.id && confirmedWorkers.has(`${job.id}:${wr.worker_id}`)
          ),
      }));

      // Incluir workers confirmados sem work_record (virtual records)
      for (const job of jobsWithRecords) {
        const jobAssignments = (assignmentsData || []).filter(
          (a: { job_id: string }) => a.job_id === job.id
        );
        const existingWorkerIds = new Set(
          job.work_records.map((wr: { worker_id: string }) => wr.worker_id)
        );

        for (const assignment of jobAssignments) {
          if (!existingWorkerIds.has(assignment.worker_id)) {
            // Worker confirmado sem work_record = aguardando check-in
            const { data: workerData } = await supabaseUntyped
              .from('workers')
              .select('id, users (name)')
              .eq('id', assignment.worker_id)
              .single();

            if (workerData) {
              job.work_records.push({
                id: `virtual-${assignment.worker_id}`,
                job_id: job.id,
                worker_id: assignment.worker_id,
                check_in: null,
                check_out: null,
                status: 'pending',
                work_date: today,
                workers: workerData,
              });
            }
          }
        }
      }

      const detected = detectLateWorkers(jobsWithRecords, new Date());
      setAlerts(detected);
    } catch (error) {
      console.error('[LateAlerts] Error checking alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setAlerts([]);
      return;
    }

    checkAlerts();

    intervalRef.current = setInterval(checkAlerts, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, checkAlerts]);

  return { alerts, count: alerts.length, loading, refresh: checkAlerts };
}
