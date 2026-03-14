import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { runAutoUpdates } from "@/lib/job-status-updater";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Search, Users, Clock, CheckCircle, AlertCircle, Calendar, CalendarDays, Eye, Mail, Phone, Star, Camera, MapPin, Building, Building2, ClipboardCheck, ZoomIn, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RatingDialog, RatingDisplay } from "@/components/RatingDialog";
import { getLocalToday } from "@/lib/date-utils";

interface WorkRecord {
  id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_photo: string | null;
  signature_data: string | null;
  signed_at: string | null;
  status: string;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  notes: string | null;
  workers: {
    id: string;
    rating: number;
    total_jobs: number;
    users: {
      name: string;
      email: string;
      phone: string | null;
    };
  };
  job_assignments?: {
    id: string;
    rating: number | null;
    feedback: string | null;
  } | null;
}

interface JobWithRecords {
  id: string;
  title: string;
  location: string;
  date: string;
  dates: string[] | null;
  start_time: string;
  end_time: string;
  status: string;
  clients: {
    company_name: string;
    fantasia?: string | null;
  };
  work_records: WorkRecord[];
}

interface CompletedWorkRecord {
  id: string;
  work_date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  job_id: string;
  worker_id: string;
  workers: {
    id: string;
    rating: number;
    users: {
      name: string;
      email: string;
      phone: string | null;
      avatar_url: string | null;
    };
  };
  jobs: {
    id: string;
    title: string;
    date: string;
    location: string;
    clients: {
      company_name: string;
    };
  };
  // Rating from job_assignment (loaded separately)
  assignment_id?: string;
  rating?: number | null;
  feedback?: string | null;
}

export function AdminMonitoringPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("monitoring");
  const [jobs, setJobs] = useState<JobWithRecords[]>([]);
  const [completedRecords, setCompletedRecords] = useState<CompletedWorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<string>(getLocalToday());
  const [dateTo, setDateTo] = useState<string>(getLocalToday());
  const [activeFilter, setActiveFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [selectedJob, setSelectedJob] = useState<JobWithRecords | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<"all" | "pending" | "rated">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "completed" | "has_absent">("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Photo zoom state
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  // Rating dialog state
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WorkRecord | null>(null);
  const [selectedWorkRecord, setSelectedWorkRecord] = useState<CompletedWorkRecord | null>(null);

  const [autoUpdated, setAutoUpdated] = useState(false);
  const [clientsList, setClientsList] = useState<{ id: string; company_name: string; fantasia: string | null }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const isDateRangeInvalid = dateFrom && dateTo && dateTo < dateFrom;

  function getCurrentWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  function getCurrentWeekEnd(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? 0 : 7);
    const sunday = new Date(now.setDate(diff));
    return sunday.toISOString().split('T')[0];
  }

  function formatDateLabel(dateStr: string) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  function getFilterLabel() {
    if (activeFilter === 'all') return 'Todos os registros';
    if (!dateFrom && !dateTo) return 'Todos os registros';
    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) return formatDateLabel(dateFrom);
      return `${formatDateLabel(dateFrom)} — ${formatDateLabel(dateTo)}`;
    }
    if (dateFrom) return `A partir de ${formatDateLabel(dateFrom)}`;
    if (dateTo) return `Até ${formatDateLabel(dateTo)}`;
    return '';
  }

  // Auto-update stale records on mount, then allow data load
  useEffect(() => {
    loadClientsList();
    runAutoUpdates().then(() => setAutoUpdated(true));
  }, []);

  async function loadClientsList() {
    const { data } = await supabaseUntyped
      .from('clients')
      .select('id, company_name, fantasia')
      .order('company_name');
    setClientsList(data || []);
  }

  // Recarrega dados quando navega para esta página ou muda a data/tab/client
  useEffect(() => {
    if (!autoUpdated || isDateRangeInvalid) return;
    if (activeTab === "monitoring") {
      loadJobs();
    } else {
      loadCompletedAssignments();
    }
  }, [dateFrom, dateTo, location.pathname, activeTab, autoUpdated, selectedClientId]);

  async function loadJobs() {
    setLoading(true);
    try {
      console.log('[AdminMonitoring] Loading jobs for range:', dateFrom, '-', dateTo);

      // 1. Buscar work_records no intervalo de datas
      let workRecordsQuery = supabaseUntyped
        .from('work_records')
        .select(`
          id,
          job_id,
          work_date,
          check_in,
          check_out,
          check_in_photo,
          signature_data,
          signed_at,
          status,
          check_in_latitude,
          check_in_longitude,
          check_out_latitude,
          check_out_longitude,
          notes,
          worker_id,
          workers (
            id,
            rating,
            total_jobs,
            users (name, email, phone)
          )
        `);

      if (dateFrom) {
        workRecordsQuery = workRecordsQuery.gte('work_date', dateFrom);
      }
      if (dateTo) {
        workRecordsQuery = workRecordsQuery.lte('work_date', dateTo);
      }

      const { data: workRecordsData, error: workRecordsError } = await workRecordsQuery;

      if (workRecordsError) {
        console.error('[AdminMonitoring] Error loading work_records:', workRecordsError);
      }

      console.log('[AdminMonitoring] Work records found:', workRecordsData?.length || 0);

      // 2. Pegar os job_ids únicos dos work_records
      const jobIdsFromRecords = [...new Set((workRecordsData || []).map((wr: { job_id: string }) => wr.job_id))];

      // 3. Buscar jobs no intervalo de datas
      let jobsByDateQuery = supabaseUntyped
        .from('jobs')
        .select('id');

      if (dateFrom) {
        jobsByDateQuery = jobsByDateQuery.gte('date', dateFrom);
      }
      if (dateTo) {
        jobsByDateQuery = jobsByDateQuery.lte('date', dateTo);
      }

      const { data: jobsByDate, error: jobsByDateError } = await jobsByDateQuery;

      if (jobsByDateError) {
        console.error('[AdminMonitoring] Error loading jobs by date:', jobsByDateError);
      }

      // Combinar os IDs
      const allJobIds = [...new Set([
        ...jobIdsFromRecords,
        ...(jobsByDate || []).map((j: { id: string }) => j.id)
      ])];

      console.log('[AdminMonitoring] All job IDs:', allJobIds);

      if (allJobIds.length === 0) {
        setJobs([]);
        return;
      }

      // 4. Buscar detalhes completos dos jobs
      let jobsDetailQuery = supabaseUntyped
        .from('jobs')
        .select(`
          *,
          clients (company_name, fantasia)
        `)
        .in('id', allJobIds)
        .order('start_time', { ascending: true });

      if (selectedClientId) {
        jobsDetailQuery = jobsDetailQuery.eq('client_id', selectedClientId);
      }

      const { data: jobsData, error: jobsError } = await jobsDetailQuery;

      if (jobsError) {
        console.error('[AdminMonitoring] Error loading jobs:', jobsError);
        setJobs([]);
        return;
      }

      console.log('[AdminMonitoring] Jobs found:', jobsData?.length || 0, jobsData);

      // 5. Buscar TODOS os job_assignments (sem filtro de status) para poder filtrar corretamente
      const { data: allAssignmentsData, error: assignmentsError } = await supabaseUntyped
        .from('job_assignments')
        .select(`
          id,
          job_id,
          worker_id,
          status,
          rating,
          feedback,
          workers (
            id,
            rating,
            total_jobs,
            users (name, email, phone)
          )
        `)
        .in('job_id', allJobIds);

      if (assignmentsError) {
        console.error('[AdminMonitoring] Error loading assignments:', assignmentsError);
      }

      // Filtrar apenas confirmados/completados (exclui withdrawn, pending, etc.)
      const assignmentsData = (allAssignmentsData || []).filter(
        (a: { status: string }) => a.status === 'confirmed' || a.status === 'completed'
      );

      // Criar um Set de worker_ids confirmados/completados por job para filtragem rápida
      const confirmedWorkersByJob = new Map<string, Set<string>>();
      assignmentsData.forEach((a: { job_id: string; worker_id: string }) => {
        if (!confirmedWorkersByJob.has(a.job_id)) {
          confirmedWorkersByJob.set(a.job_id, new Set());
        }
        confirmedWorkersByJob.get(a.job_id)!.add(a.worker_id);
      });

      // 6. Mapear work_records para cada job
      const jobsWithRecords = (jobsData || []).map((job: JobWithRecords) => {
        // Work records do dia para este job
        const confirmedSet = confirmedWorkersByJob.get(job.id) || new Set();
        const jobWorkRecords = (workRecordsData || [])
          .filter((wr: { job_id: string; worker_id: string }) => {
            if (wr.job_id !== job.id) return false;
            // Exibir somente workers com assignment confirmado/completado
            return confirmedSet.has(wr.worker_id);
          })
          .map((wr: WorkRecord & { worker_id: string }) => {
            const assignment = (assignmentsData || []).find(
              (a: { job_id: string; worker_id: string }) =>
                a.job_id === job.id && a.worker_id === wr.worker_id
            );
            return {
              ...wr,
              job_assignments: assignment ? {
                id: assignment.id,
                rating: assignment.rating,
                feedback: assignment.feedback
              } : null
            };
          });

        // Se não há work_records mas há assignments, criar registros "virtuais" para mostrar os prestadores
        if (jobWorkRecords.length === 0) {
          const jobAssignments = (assignmentsData || []).filter(
            (a: { job_id: string }) => a.job_id === job.id
          );

          jobAssignments.forEach((assignment: {
            id: string;
            worker_id: string;
            workers: WorkRecord['workers'];
            rating: number | null;
            feedback: string | null;
          }) => {
            jobWorkRecords.push({
              id: `virtual-${assignment.id}`,
              work_date: job.date,
              check_in: null,
              check_out: null,
              check_in_photo: null,
              signature_data: null,
              signed_at: null,
              status: 'pending',
              check_in_latitude: null,
              check_in_longitude: null,
              check_out_latitude: null,
              check_out_longitude: null,
              notes: null,
              workers: assignment.workers,
              job_assignments: {
                id: assignment.id,
                rating: assignment.rating,
                feedback: assignment.feedback
              }
            } as WorkRecord);
          });
        }

        // Log status values for each job's work records
        console.log(`[AdminMonitoring] Job ${job.id} (${job.title}) work records:`, jobWorkRecords.map((r: WorkRecord) => ({
          id: r.id,
          status: r.status,
          check_in: r.check_in,
          check_out: r.check_out,
          isVirtual: r.id.startsWith('virtual-')
        })));

        return {
          ...job,
          work_records: jobWorkRecords
        };
      });

      console.log('[AdminMonitoring] Final jobs with records:', jobsWithRecords.length);
      setJobs(jobsWithRecords);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[AdminMonitoring] Error loading jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompletedAssignments() {
    setLoading(true);
    try {
      // Query completed work_records
      const { data: workRecordsData, error: workRecordsError } = await supabaseUntyped
        .from('work_records')
        .select(`
          id,
          work_date,
          status,
          check_in,
          check_out,
          job_id,
          worker_id,
          workers (
            id,
            rating,
            users (name, email, phone, avatar_url)
          ),
          jobs (
            id,
            title,
            date,
            location,
            clients (company_name)
          )
        `)
        .eq('status', 'completed')
        .order('work_date', { ascending: false })
        .limit(100);

      if (workRecordsError) {
        console.error('Error loading work records:', workRecordsError);
        setCompletedRecords([]);
        setLoading(false);
        return;
      }

      // Now get the job_assignments to fetch ratings
      const { data: assignmentsData } = await supabaseUntyped
        .from('job_assignments')
        .select('id, job_id, worker_id, rating, feedback');

      // Merge ratings into work records
      const recordsWithRatings = (workRecordsData || []).map((record: CompletedWorkRecord) => {
        const assignment = (assignmentsData || []).find(
          (a: { job_id: string; worker_id: string }) =>
            a.job_id === record.job_id && a.worker_id === record.worker_id
        );
        return {
          ...record,
          assignment_id: assignment?.id,
          rating: assignment?.rating ?? null,
          feedback: assignment?.feedback ?? null,
        };
      });

      setCompletedRecords(recordsWithRatings);
    } catch (error) {
      console.error('Error loading completed assignments:', error);
    } finally {
      setLoading(false);
    }
  }

  function openRatingDialog(record: WorkRecord, jobTitle: string) {
    setSelectedRecord({ ...record, jobTitle } as WorkRecord & { jobTitle: string });
    setRatingDialogOpen(true);
  }

  function openWorkRecordRatingDialog(record: CompletedWorkRecord) {
    setSelectedWorkRecord(record);
    setRatingDialogOpen(true);
  }

  function formatTime(timeStr: string | null) {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatScheduleTime(timeStr: string) {
    return timeStr.slice(0, 5);
  }

  function getRecordStatusBadge(record: WorkRecord) {
    // Check completed first - by status OR by having both check_in and check_out
    if (record.status === 'completed' || (record.check_in && record.check_out)) {
      return <Badge className="bg-green-500">Concluído</Badge>;
    }
    if (record.status === 'absent' || record.status === 'no_show') {
      return <Badge variant="destructive">Falta</Badge>;
    }
    if (record.status === 'in_progress' || record.status === 'checked_in' || record.check_in) {
      return <Badge className="bg-blue-500">Em andamento</Badge>;
    }
    return <Badge variant="secondary">Pendente</Badge>;
  }

  function getJobStats(job: JobWithRecords) {
    const todayRecords = job.work_records;
    const total = todayRecords.length;
    // Conta como "concluído" se status é completed OU se tem check_in E check_out
    const completed = todayRecords.filter(r =>
      r.status === 'completed' || (r.check_in && r.check_out)
    ).length;
    // Conta como "trabalhando" se tem check_in mas não check_out (e não está marcado como concluído)
    const checkedIn = todayRecords.filter(r =>
      (r.check_in || r.status === 'checked_in' || r.status === 'in_progress') &&
      !(r.status === 'completed' || (r.check_in && r.check_out))
    ).length + completed; // Include completed in checkedIn for the progress bar
    const absent = todayRecords.filter(r => r.status === 'absent' || r.status === 'no_show').length;

    return { total, checkedIn, completed, absent };
  }

  const filteredJobs = jobs.filter(job => {
    // Status filter
    if (statusFilter !== "all") {
      const stats = getJobStats(job);
      switch (statusFilter) {
        case "pending":
          if (stats.checkedIn > 0 || stats.absent > 0) return false;
          break;
        case "in_progress":
          if (stats.checkedIn === stats.completed && stats.completed > 0) return false;
          if (stats.checkedIn === 0) return false;
          break;
        case "completed":
          if (stats.total === 0 || stats.completed !== stats.total) return false;
          break;
        case "has_absent":
          if (stats.absent === 0) return false;
          break;
      }
    }

    // Search filter
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      job.title.toLowerCase().includes(search) ||
      job.location.toLowerCase().includes(search) ||
      job.clients?.company_name?.toLowerCase().includes(search)
    );
  });

  const filteredRecords = completedRecords.filter(record => {
    // Filter by rating status
    if (ratingFilter === "pending" && record.rating !== null) return false;
    if (ratingFilter === "rated" && record.rating === null) return false;

    // Filter by search term
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      record.jobs?.title?.toLowerCase().includes(search) ||
      record.jobs?.location?.toLowerCase().includes(search) ||
      record.jobs?.clients?.company_name?.toLowerCase().includes(search) ||
      record.workers?.users?.name?.toLowerCase().includes(search)
    );
  });

  // Stats for ratings tab
  const pendingRatingsCount = completedRecords.filter(r => r.rating === null).length;
  const ratedCount = completedRecords.filter(r => r.rating !== null).length;

  function openDetails(job: JobWithRecords) {
    setSelectedJob(job);
    setDetailsOpen(true);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold mb-1">Monitoramento</h2>
          <p className="text-muted-foreground text-sm">Acompanhe em tempo real o status das diárias</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (activeTab === 'monitoring') loadJobs(); else loadCompletedAssignments(); }}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="monitoring" className="gap-2">
            <Eye className="h-4 w-4" />
            Monitoramento
          </TabsTrigger>
          <TabsTrigger value="ratings" className="gap-2">
            <Star className="h-4 w-4" />
            Avaliações
            {pendingRatingsCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {pendingRatingsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-5">
          {/* Filter Card - same style as dashboard */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="border-l-4 border-l-blue-500">
              <CardContent className="py-4">
                <div className="flex flex-col gap-4">
                  {/* Header row with title and quick filters */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        <CalendarDays className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Período</span>
                    </div>

                    {/* Segmented control */}
                    <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                      {([
                        { key: 'today' as const, label: 'Hoje' },
                        { key: 'week' as const, label: 'Semana' },
                        { key: 'month' as const, label: 'Mês' },
                        { key: 'all' as const, label: 'Tudo' },
                      ]).map((item, idx) => (
                        <button
                          key={item.key}
                          className={`px-4 py-2 text-sm font-medium transition-all ${
                            idx < 3 ? 'border-r border-slate-200' : ''
                          } ${
                            activeFilter === item.key
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          onClick={() => {
                            setActiveFilter(item.key);
                            const today = getLocalToday();
                            if (item.key === 'today') {
                              setDateFrom(today);
                              setDateTo(today);
                            } else if (item.key === 'week') {
                              setDateFrom(getCurrentWeekStart());
                              setDateTo(getCurrentWeekEnd());
                            } else if (item.key === 'month') {
                              const now = new Date();
                              setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
                              setDateTo(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
                            } else {
                              setDateFrom('');
                              setDateTo('');
                            }
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date inputs + Client + Search row */}
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="monitorDateFrom" className="text-xs font-medium text-slate-500 uppercase tracking-wide">Início</Label>
                        <Input
                          id="monitorDateFrom"
                          type="date"
                          value={dateFrom}
                          onChange={(e) => {
                            setDateFrom(e.target.value);
                            setActiveFilter('custom');
                            if (dateTo && e.target.value && dateTo < e.target.value) {
                              setDateTo(e.target.value);
                            }
                          }}
                          className="w-full sm:w-44 h-10 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/30 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="monitorDateTo" className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fim</Label>
                        <Input
                          id="monitorDateTo"
                          type="date"
                          value={dateTo}
                          min={dateFrom || undefined}
                          onChange={(e) => {
                            setDateTo(e.target.value);
                            setActiveFilter('custom');
                          }}
                          className={`w-full sm:w-44 h-10 rounded-lg transition-colors ${
                            isDateRangeInvalid
                              ? 'border-red-400 ring-2 ring-red-400/30 bg-red-50 focus:ring-red-500/30'
                              : 'border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/30'
                          }`}
                        />
                        {isDateRangeInvalid && (
                          <p className="text-xs text-red-500 mt-0.5">Data final deve ser após a data inicial</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label htmlFor="monitorClient" className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cliente</Label>
                      <select
                        id="monitorClient"
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-colors min-w-[180px] sm:w-52"
                      >
                        <option value="">Todos os clientes</option>
                        {clientsList.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.fantasia || client.company_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Search */}
                    <div className="flex-1 flex flex-col gap-1">
                      <Label htmlFor="monitorSearch" className="text-xs font-medium text-slate-500 uppercase tracking-wide">Busca</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="monitorSearch"
                          placeholder="Buscar por vaga, empresa ou local..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 h-10 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/30 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active filter pills + Status pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-full px-3 py-1.5 text-xs font-medium">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {getFilterLabel()}
                    </span>
                    {selectedClientId && (
                      <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 rounded-full px-3 py-1.5 text-xs font-medium">
                        <Building2 className="h-3.5 w-3.5" />
                        {clientsList.find(c => c.id === selectedClientId)?.fantasia ||
                         clientsList.find(c => c.id === selectedClientId)?.company_name}
                      </span>
                    )}

                    <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                    {([
                      { value: 'all', label: 'Todos', count: jobs.length },
                      { value: 'pending', label: 'Aguardando', count: jobs.filter(j => { const s = getJobStats(j); return s.checkedIn === 0 && s.absent === 0; }).length },
                      { value: 'in_progress', label: 'Em andamento', count: jobs.filter(j => { const s = getJobStats(j); return s.checkedIn > 0 && s.completed !== s.total; }).length },
                      { value: 'completed', label: 'Concluídos', count: jobs.filter(j => { const s = getJobStats(j); return s.total > 0 && s.completed === s.total; }).length },
                      { value: 'has_absent', label: 'Com faltas', count: jobs.filter(j => getJobStats(j).absent > 0).length },
                    ] as const).map((f) => (
                      <Button
                        key={f.value}
                        variant={statusFilter === f.value ? 'default' : 'outline'}
                        size="sm"
                        className={`h-7 text-xs gap-1.5 ${
                          statusFilter === f.value
                            ? f.value === 'has_absent' ? 'bg-red-500 hover:bg-red-600' : ''
                            : f.value === 'has_absent' && f.count > 0 ? 'border-red-200 text-red-700 hover:bg-red-50' : ''
                        }`}
                        onClick={() => setStatusFilter(f.value)}
                      >
                        {f.label}
                        {f.count > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            statusFilter === f.value ? 'bg-white/20' : 'bg-slate-100'
                          }`}>
                            {f.count}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* KPI Summary */}
          {(() => {
            const totalJobs = filteredJobs.length;
            const totalWorkers = filteredJobs.reduce((a, j) => a + getJobStats(j).total, 0);
            const totalInProgress = filteredJobs.reduce((a, j) => a + (getJobStats(j).checkedIn - getJobStats(j).completed), 0);
            const totalCompleted = filteredJobs.reduce((a, j) => a + getJobStats(j).completed, 0);
            const totalAbsent = filteredJobs.reduce((a, j) => a + getJobStats(j).absent, 0);
            const completionPct = totalWorkers > 0 ? Math.round((totalCompleted / totalWorkers) * 100) : 0;
            return (
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <div className="relative overflow-hidden rounded-xl border border-l-4 border-l-slate-400 bg-slate-50 p-4">
                  <Calendar className="absolute top-3 right-3 h-8 w-8 text-slate-200" />
                  <p className="text-3xl font-black text-slate-800">{totalJobs}</p>
                  <p className="text-xs text-muted-foreground mt-1">Diárias no dia</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{totalWorkers} prestadores</p>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-l-4 border-l-blue-500 bg-blue-50 p-4">
                  <Users className="absolute top-3 right-3 h-8 w-8 text-blue-200" />
                  <p className="text-3xl font-black text-blue-700">{totalInProgress}</p>
                  <p className="text-xs text-muted-foreground mt-1">Em andamento</p>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-l-4 border-l-green-500 bg-green-50 p-4">
                  <CheckCircle className="absolute top-3 right-3 h-8 w-8 text-green-200" />
                  <p className="text-3xl font-black text-green-700">{totalCompleted}</p>
                  <p className="text-xs text-muted-foreground mt-1">Concluídos</p>
                  {totalWorkers > 0 && <p className="text-[10px] text-green-600 mt-0.5">{completionPct}% do total</p>}
                </div>
                <div className={`relative overflow-hidden rounded-xl border border-l-4 border-l-red-500 bg-red-50 p-4 ${totalAbsent > 0 ? 'ring-1 ring-red-300' : ''}`}>
                  <AlertCircle className="absolute top-3 right-3 h-8 w-8 text-red-200" />
                  <p className="text-3xl font-black text-red-700">{totalAbsent}</p>
                  <p className="text-xs text-muted-foreground mt-1">Faltas</p>
                </div>
              </div>
            );
          })()}

      {/* Lista de diárias */}
      {filteredJobs.length > 0 ? (
        <div className="grid gap-4">
          {filteredJobs.map((job) => {
            const stats = getJobStats(job);
            const todayRecords = job.work_records;
            const cardAccent = stats.absent > 0
              ? 'border-l-4 border-l-red-500 bg-red-50/30'
              : stats.total > 0 && stats.completed === stats.total
              ? 'border-l-4 border-l-green-500 bg-green-50/20'
              : stats.checkedIn > 0
              ? 'border-l-4 border-l-blue-500'
              : 'border-l-4 border-l-amber-400 bg-amber-50/20';
            return (
              <Card key={job.id} className={`transition-all hover:shadow-md cursor-pointer ${cardAccent}`} onClick={() => openDetails(job)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap mt-1">
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building className="h-3 w-3" />
                          {job.clients?.fantasia || job.clients?.company_name}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{job.location}</span>
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDetails(job); }} className="text-muted-foreground hover:text-foreground">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Metadata row */}
                  <div className="flex items-center gap-4 pb-3 border-b text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatScheduleTime(job.start_time)} - {formatScheduleTime(job.end_time)}
                    </span>
                    <span className="text-slate-200">|</span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {stats.total} prestadores
                    </span>
                  </div>

                  {/* Status badges row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {stats.checkedIn - stats.completed > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                        <Clock className="h-3 w-3" />
                        {stats.checkedIn - stats.completed} trabalhando
                      </span>
                    )}
                    {stats.completed > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        {stats.completed} concluídos
                      </span>
                    )}
                    {stats.absent > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                        <AlertCircle className="h-3 w-3" />
                        {stats.absent} faltas
                      </span>
                    )}
                    {stats.checkedIn === 0 && stats.absent === 0 && stats.total > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                        <Clock className="h-3 w-3" />
                        Aguardando check-in
                      </span>
                    )}
                  </div>

                  {/* Barra de progresso */}
                  {stats.total > 0 && (
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full flex">
                        <div
                          className="bg-green-500 transition-all"
                          style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                        />
                        <div
                          className="bg-blue-500 transition-all"
                          style={{ width: `${((stats.checkedIn - stats.completed) / stats.total) * 100}%` }}
                        />
                        <div
                          className="bg-red-400 transition-all"
                          style={{ width: `${(stats.absent / stats.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Lista de prestadores do dia */}
                  {todayRecords.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-3">TRABALHADORES DO DIA</p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {todayRecords.map((record) => (
                          <div
                            key={record.id}
                            className={`flex items-center gap-3 p-2 rounded-lg border ${
                              record.status === 'completed' || (record.check_in && record.check_out)
                                ? 'bg-green-50 border-green-200'
                                : record.status === 'absent' || record.status === 'no_show'
                                ? 'bg-red-50 border-red-200'
                                : record.status === 'checked_in' || record.status === 'in_progress' || record.check_in
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-amber-50 border-amber-200'
                            }`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className={`text-xs font-medium ${
                                record.status === 'completed' || (record.check_in && record.check_out)
                                  ? 'bg-green-500 text-white'
                                  : record.status === 'absent' || record.status === 'no_show'
                                  ? 'bg-red-500 text-white'
                                  : record.status === 'checked_in' || record.status === 'in_progress' || record.check_in
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-amber-500 text-white'
                              }`}>
                                {record.workers?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{record.workers?.users?.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {/* Check completed first - by status OR by having both check_in and check_out */}
                                {record.status === 'completed' || (record.check_in && record.check_out) ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-green-600 flex items-center gap-1 flex-wrap">
                                      <CheckCircle className="h-3 w-3" />
                                      Concluído {record.check_out && `às ${formatTime(record.check_out)}`}
                                      {record.check_out_latitude && record.check_out_longitude && (
                                        <a
                                          href={`https://www.google.com/maps?q=${record.check_out_latitude},${record.check_out_longitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-500 hover:text-blue-700 ml-1"
                                          title="Ver localização de saída"
                                        >
                                          <MapPin className="h-3 w-3" />
                                        </a>
                                      )}
                                    </span>
                                    {record.notes && record.notes.includes('automaticamente') && (
                                      <span className="text-orange-500 flex items-center gap-1 text-[10px]">
                                        <AlertCircle className="h-3 w-3" />
                                        Sem registro de saída
                                      </span>
                                    )}
                                    {record.notes && record.notes.includes('Saída antecipada') && (
                                      <span className="text-amber-600 flex items-center gap-1 text-[10px]">
                                        <AlertCircle className="h-3 w-3" />
                                        {record.notes}
                                      </span>
                                    )}
                                  </div>
                                ) : record.status === 'absent' || record.status === 'no_show' ? (
                                  <span className="text-red-600 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Falta
                                  </span>
                                ) : record.status === 'checked_in' || record.status === 'in_progress' || record.check_in ? (
                                  <span className="text-blue-600 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Em andamento {record.check_in && `desde ${formatTime(record.check_in)}`}
                                    {record.check_in_latitude && record.check_in_longitude && (
                                      <a
                                        href={`https://www.google.com/maps?q=${record.check_in_latitude},${record.check_in_longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-700 ml-1"
                                        title="Ver localização de entrada"
                                      >
                                        <MapPin className="h-3 w-3" />
                                      </a>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Aguardando check-in
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            {searchTerm && jobs.length > 0 ? (
              <>
                <p className="text-muted-foreground mb-2">Nenhuma diária corresponde à sua busca.</p>
                <Button variant="link" size="sm" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                  Limpar filtros
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                Nenhuma diária encontrada para o período selecionado.
              </p>
            )}
          </CardContent>
        </Card>
      )}
        </TabsContent>

        {/* Tab de Avaliações */}
        <TabsContent value="ratings" className="space-y-6">
          {/* Filtros de avaliação */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por vaga, empresa ou trabalhador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={ratingFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setRatingFilter("all")}
              >
                Todos ({completedRecords.length})
              </Button>
              <Button
                variant={ratingFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setRatingFilter("pending")}
                className={ratingFilter === "pending" ? "" : "text-amber-600 border-amber-300"}
              >
                Pendentes ({pendingRatingsCount})
              </Button>
              <Button
                variant={ratingFilter === "rated" ? "default" : "outline"}
                size="sm"
                onClick={() => setRatingFilter("rated")}
                className={ratingFilter === "rated" ? "" : "text-green-600 border-green-300"}
              >
                Avaliados ({ratedCount})
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{completedRecords.length}</p>
                    <p className="text-sm text-muted-foreground">Total Concluídos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold text-amber-700">{pendingRatingsCount}</p>
                    <p className="text-sm text-amber-600">Aguardando Avaliação</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-green-700">{ratedCount}</p>
                    <p className="text-sm text-green-600">Já Avaliados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de trabalhos concluídos */}
          {filteredRecords.length > 0 ? (
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <Card key={record.id} className={`transition-all hover:shadow-md ${
                  record.rating === null ? 'border-l-4 border-l-amber-400' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <Avatar className="h-12 w-12 ring-2 ring-white shadow flex-shrink-0">
                          <AvatarFallback className="bg-blue-500 text-white font-medium">
                            {record.workers?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900 truncate">{record.workers?.users?.name}</h4>
                            <Badge className="bg-green-500">Concluído</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {record.jobs?.title} - {record.jobs?.clients?.company_name || ''}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {record.work_date ? new Date(record.work_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {record.jobs?.location || 'N/A'}
                            </span>
                            {record.check_in && record.check_out && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(record.check_in).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(record.check_out).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="font-bold">{record.workers?.rating?.toFixed(1) || '0.0'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Média geral</p>
                        </div>

                        <RatingDisplay
                          rating={record.rating ?? null}
                          feedback={record.feedback ?? null}
                          onEdit={() => openWorkRecordRatingDialog(record)}
                          showEditButton={true}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhum trabalho encontrado</h3>
                <p className="text-muted-foreground">
                  {ratingFilter === "pending"
                    ? "Todos os trabalhos já foram avaliados!"
                    : ratingFilter === "rated"
                    ? "Nenhum trabalho foi avaliado ainda."
                    : "Nenhum trabalho concluído encontrado."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
          {selectedJob && (
            <>
              {/* Header com gradiente */}
              <div className={`p-6 ${
                selectedJob.status === 'assigned'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                  : selectedJob.status === 'in_progress'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                  : selectedJob.status === 'completed'
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gradient-to-r from-slate-600 to-slate-700'
              } text-white`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-1">{selectedJob.title}</h2>
                    <div className="flex items-center gap-3 text-white/80 text-sm">
                      <span className="flex items-center gap-1">
                        <Building className="h-3.5 w-3.5" />
                        {selectedJob.clients?.fantasia || selectedJob.clients?.company_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedJob.location}
                      </span>
                    </div>
                  </div>
                  {selectedJob.status === 'assigned' && (
                    <Badge className="bg-white/20 text-white border-white/30">Atribuída</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Calendar className="h-3 w-3" />
                      Data
                    </div>
                    <p className="font-semibold text-sm">{new Date(selectedJob.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Clock className="h-3 w-3" />
                      Horário
                    </div>
                    <p className="font-semibold text-sm">{formatScheduleTime(selectedJob.start_time)} - {formatScheduleTime(selectedJob.end_time)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Users className="h-3 w-3" />
                      Prestadores
                    </div>
                    <p className="font-semibold text-sm">{getJobStats(selectedJob).total} no dia</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <CheckCircle className="h-3 w-3" />
                      Concluídos
                    </div>
                    <p className="font-semibold text-sm">{getJobStats(selectedJob).completed}</p>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Registros de Trabalho
                </h3>

                {(() => {
                  const todayRecords = selectedJob.work_records;

                  if (todayRecords.length === 0) {
                    return (
                      <div className="text-center py-8 bg-slate-50 rounded-xl">
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Users className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-muted-foreground">Nenhum trabalhador registrado para esta data.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {todayRecords.map((record) => (
                        <div key={record.id} className="border rounded-xl overflow-hidden">
                          {/* Info do trabalhador */}
                          <div className={`p-4 ${
                            record.status === 'completed' || (record.check_in && record.check_out)
                              ? 'bg-gradient-to-r from-green-50 to-green-100'
                              : record.status === 'in_progress' || record.status === 'checked_in' || record.check_in
                              ? 'bg-gradient-to-r from-blue-50 to-blue-100'
                              : record.status === 'absent' || record.status === 'no_show'
                              ? 'bg-gradient-to-r from-red-50 to-red-100'
                              : 'bg-gradient-to-r from-slate-50 to-slate-100'
                          }`}>
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 ring-2 ring-white shadow-lg">
                                <AvatarFallback className={`text-white text-lg font-bold ${
                                  record.status === 'completed' || (record.check_in && record.check_out) ? 'bg-green-500' :
                                  record.status === 'in_progress' || record.status === 'checked_in' || record.check_in ? 'bg-blue-500' :
                                  record.status === 'absent' || record.status === 'no_show' ? 'bg-red-500' : 'bg-purple-500'
                                }`}>
                                  {record.workers?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <h4 className="font-bold">{record.workers?.users?.name || 'N/A'}</h4>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                                  {record.workers?.users?.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3.5 w-3.5" />
                                      {record.workers.users.email}
                                    </span>
                                  )}
                                  {record.workers?.users?.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3.5 w-3.5" />
                                      {record.workers.users.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-2">
                                {getRecordStatusBadge(record)}
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                  <span className="font-bold text-sm">{record.workers?.rating?.toFixed(1) || '0.0'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Registros de ponto e assinatura */}
                          <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div className={`p-3 rounded-lg border ${
                                record.check_in ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-2 h-2 rounded-full ${record.check_in ? 'bg-green-500' : 'bg-slate-300'}`} />
                                  <span className="text-sm font-medium">Entrada</span>
                                </div>
                                <p className="text-lg font-bold">{formatTime(record.check_in)}</p>
                              </div>
                              <div className={`p-3 rounded-lg border ${
                                record.check_out ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-2 h-2 rounded-full ${record.check_out ? 'bg-red-500' : 'bg-slate-300'}`} />
                                  <span className="text-sm font-medium">Saída</span>
                                </div>
                                <p className="text-lg font-bold">{formatTime(record.check_out)}</p>
                              </div>
                            </div>

                            {/* Observações */}
                            {record.notes && (
                              <div className={`p-3 rounded-lg border text-sm ${
                                record.notes.includes('automaticamente')
                                  ? 'bg-orange-50 border-orange-200 text-orange-700'
                                  : record.notes.includes('Saída antecipada')
                                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                                  : 'bg-slate-50 border-slate-200 text-muted-foreground'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                  <span>{record.notes}</span>
                                </div>
                              </div>
                            )}

                            {/* Localização GPS */}
                            {(record.check_in_latitude || record.check_out_latitude) && (
                              <div className="flex gap-3 text-xs">
                                {record.check_in_latitude && record.check_in_longitude && (
                                  <a
                                    href={`https://www.google.com/maps?q=${record.check_in_latitude},${record.check_in_longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
                                  >
                                    <MapPin className="h-3 w-3" />
                                    Local de entrada
                                  </a>
                                )}
                                {record.check_out_latitude && record.check_out_longitude && (
                                  <a
                                    href={`https://www.google.com/maps?q=${record.check_out_latitude},${record.check_out_longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
                                  >
                                    <MapPin className="h-3 w-3" />
                                    Local de saída
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Fotos de Registro */}
                            {(record.check_in_photo || record.signature_data) && (
                              <div className="pt-3 border-t">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                  <Camera className="h-4 w-4" />
                                  <span>Fotos de Registro</span>
                                </div>
                                <div className="flex gap-3 flex-wrap">
                                  {record.check_in_photo && (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-xs text-muted-foreground">Entrada</span>
                                      <button
                                        type="button"
                                        className="relative group"
                                        onClick={() => setSelectedPhotoUrl(record.check_in_photo)}
                                        title="Clique para ampliar"
                                      >
                                        <img
                                          src={record.check_in_photo}
                                          alt="Foto de entrada"
                                          className="h-20 w-28 object-cover rounded-lg border"
                                        />
                                        <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <ZoomIn className="h-5 w-5 text-white" />
                                        </div>
                                      </button>
                                    </div>
                                  )}
                                  {record.signature_data && (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-xs text-muted-foreground">Saída</span>
                                      <button
                                        type="button"
                                        className="relative group"
                                        onClick={() => setSelectedPhotoUrl(record.signature_data)}
                                        title="Clique para ampliar"
                                      >
                                        <img
                                          src={record.signature_data}
                                          alt="Foto de saída"
                                          className="h-20 w-28 object-cover rounded-lg border"
                                        />
                                        <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <ZoomIn className="h-5 w-5 text-white" />
                                        </div>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Rating Section - only for completed records */}
                            {(record.status === 'completed' || (record.check_in && record.check_out)) && record.job_assignments && (
                              <div className="pt-3 border-t">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Star className="h-4 w-4" />
                                    <span>Avaliação</span>
                                  </div>
                                  <RatingDisplay
                                    rating={record.job_assignments.rating}
                                    feedback={record.job_assignments.feedback}
                                    onEdit={() => openRatingDialog(record, selectedJob?.title || '')}
                                    showEditButton={true}
                                    size="sm"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Rating Dialog - for work records */}
      {selectedRecord && selectedRecord.job_assignments && (
        <RatingDialog
          open={ratingDialogOpen && !selectedWorkRecord}
          onOpenChange={(open) => {
            setRatingDialogOpen(open);
            if (!open) setSelectedRecord(null);
          }}
          assignmentId={selectedRecord.job_assignments.id}
          workerId={selectedRecord.workers?.id || ""}
          workerName={selectedRecord.workers?.users?.name || "Trabalhador"}
          jobTitle={(selectedRecord as WorkRecord & { jobTitle?: string }).jobTitle}
          currentRating={selectedRecord.job_assignments.rating}
          currentFeedback={selectedRecord.job_assignments.feedback}
          onSuccess={loadJobs}
        />
      )}

      {/* Rating Dialog - for completed work records */}
      {selectedWorkRecord && selectedWorkRecord.assignment_id && (
        <RatingDialog
          open={ratingDialogOpen && !!selectedWorkRecord}
          onOpenChange={(open) => {
            setRatingDialogOpen(open);
            if (!open) setSelectedWorkRecord(null);
          }}
          assignmentId={selectedWorkRecord.assignment_id}
          workerId={selectedWorkRecord.workers?.id || ""}
          workerName={selectedWorkRecord.workers?.users?.name || "Trabalhador"}
          jobTitle={selectedWorkRecord.jobs?.title}
          currentRating={selectedWorkRecord.rating ?? null}
          currentFeedback={selectedWorkRecord.feedback ?? null}
          onSuccess={loadCompletedAssignments}
        />
      )}
      {/* Photo Zoom Dialog */}
      <Dialog open={!!selectedPhotoUrl} onOpenChange={(open) => !open && setSelectedPhotoUrl(null)}>
        <DialogContent className="max-w-lg p-2 bg-black border-0">
          {selectedPhotoUrl && (
            <img
              src={selectedPhotoUrl}
              alt="Foto de registro"
              className="w-full rounded-lg object-contain max-h-[80vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
