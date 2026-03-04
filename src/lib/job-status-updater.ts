import { supabaseUntyped } from '@/lib/supabase';
import { getLocalToday } from '@/lib/date-utils';

/**
 * Auto-update jobs with status 'open' to 'unfilled' when:
 * - The job date has passed (or today after end_time)
 * - No active assignments exist (pending or confirmed)
 */
export async function autoUpdateJobStatuses() {
  try {
    const today = getLocalToday();
    const nowTime = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const { data: openJobs, error } = await supabaseUntyped
      .from('jobs')
      .select('id, date, dates, end_time, job_assignments(id, status)')
      .eq('status', 'open');

    if (error || !openJobs) return;

    const jobsToUpdate: string[] = [];

    for (const job of openJobs) {
      const allDates: string[] = [];
      if (job.date) allDates.push(job.date);
      if (job.dates && Array.isArray(job.dates)) {
        allDates.push(...job.dates);
      }

      if (allDates.length === 0) continue;

      const latestDate = allDates.sort().pop()!;
      const isPastDate = latestDate < today;
      const isEndedToday = latestDate === today && job.end_time && job.end_time <= nowTime;

      if (!isPastDate && !isEndedToday) continue;

      const activeAssignments = (job.job_assignments || []).filter(
        (a: { status: string }) => a.status === 'pending' || a.status === 'confirmed'
      );

      if (activeAssignments.length === 0) {
        jobsToUpdate.push(job.id);
      }
    }

    if (jobsToUpdate.length > 0) {
      await supabaseUntyped
        .from('jobs')
        .update({ status: 'unfilled' })
        .in('id', jobsToUpdate);
    }
  } catch (err) {
    console.error('Error auto-updating job statuses:', err);
  }
}

/**
 * Auto-complete work_records with status 'in_progress' (checked in but no check-out)
 * when the job's end_time has passed for that work_date.
 * Adds a note indicating the missing check-out.
 */
export async function autoCompleteStaleWorkRecords() {
  try {
    const today = getLocalToday();
    const nowTime = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const { data: staleRecords, error } = await supabaseUntyped
      .from('work_records')
      .select('id, work_date, check_in, notes, jobs(end_time)')
      .eq('status', 'in_progress');

    if (error || !staleRecords) return;

    const recordsToUpdate: string[] = [];

    for (const record of staleRecords) {
      const endTime = record.jobs?.end_time;
      if (!endTime) continue;

      const isPastDate = record.work_date < today;
      const isEndedToday = record.work_date === today && endTime <= nowTime;

      if (isPastDate || isEndedToday) {
        recordsToUpdate.push(record.id);
      }
    }

    for (const id of recordsToUpdate) {
      const record = staleRecords.find((r: { id: string }) => r.id === id);
      const existingNotes = record?.notes ? record.notes + ' | ' : '';
      const autoNote = 'Registro concluído automaticamente. Falta de registro de saída.';

      await supabaseUntyped
        .from('work_records')
        .update({
          status: 'completed',
          notes: existingNotes + autoNote,
        })
        .eq('id', id);
    }
  } catch (err) {
    console.error('Error auto-completing stale work records:', err);
  }
}

/**
 * Run all auto-update routines. Call this on page mount.
 */
export async function runAutoUpdates() {
  await Promise.all([
    autoUpdateJobStatuses(),
    autoCompleteStaleWorkRecords(),
  ]);
}
