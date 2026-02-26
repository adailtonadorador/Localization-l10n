import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, Users, Clock, CheckCircle, AlertCircle, Calendar, Eye, Mail, Phone, Star, FileSignature, MapPin, Building, ClipboardCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RatingDialog, RatingDisplay } from "@/components/RatingDialog";

interface WorkRecord {
  id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  signature_data: string | null;
  signed_at: string | null;
  status: string;
  job_assignment_id: string | null;
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
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedJob, setSelectedJob] = useState<JobWithRecords | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<"all" | "pending" | "rated">("all");

  // Rating dialog state
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WorkRecord | null>(null);
  const [selectedWorkRecord, setSelectedWorkRecord] = useState<CompletedWorkRecord | null>(null);

  // Recarrega dados quando navega para esta página ou muda a data/tab
  useEffect(() => {
    if (activeTab === "monitoring") {
      loadJobs();
    } else {
      loadCompletedAssignments();
    }
  }, [filterDate, location.pathname, activeTab]);

  async function loadJobs() {
    setLoading(true);
    try {
      console.log('[AdminMonitoring] Loading jobs for date:', filterDate);

      // Estratégia: buscar work_records do dia e depois os jobs relacionados
      // Isso garante que encontramos todos os trabalhadores escalados para o dia

      // 1. Buscar todos os work_records do dia selecionado
      const { data: workRecordsData, error: workRecordsError } = await supabaseUntyped
        .from('work_records')
        .select(`
          id,
          job_id,
          work_date,
          check_in,
          check_out,
          signature_data,
          signed_at,
          status,
          job_assignment_id,
          worker_id,
          workers (
            id,
            rating,
            total_jobs,
            users (name, email, phone)
          )
        `)
        .eq('work_date', filterDate);

      if (workRecordsError) {
        console.error('[AdminMonitoring] Error loading work_records:', workRecordsError);
      }

      console.log('[AdminMonitoring] Work records found for date:', workRecordsData?.length || 0);
      console.log('[AdminMonitoring] Work records status values:', workRecordsData?.map((wr: { id: string; status: string; check_in: string | null; check_out: string | null }) => ({
        id: wr.id,
        status: wr.status,
        check_in: wr.check_in,
        check_out: wr.check_out
      })));

      // 2. Pegar os job_ids únicos dos work_records
      const jobIdsFromRecords = [...new Set((workRecordsData || []).map((wr: { job_id: string }) => wr.job_id))];

      // 3. Buscar também jobs que têm a data mas podem não ter work_records ainda
      const { data: jobsByDate, error: jobsByDateError } = await supabaseUntyped
        .from('jobs')
        .select('id')
        .or(`date.eq.${filterDate},dates.cs.{"${filterDate}"}`);

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
      const { data: jobsData, error: jobsError } = await supabaseUntyped
        .from('jobs')
        .select(`
          *,
          clients (company_name)
        `)
        .in('id', allJobIds)
        .order('start_time', { ascending: true });

      if (jobsError) {
        console.error('[AdminMonitoring] Error loading jobs:', jobsError);
        setJobs([]);
        return;
      }

      console.log('[AdminMonitoring] Jobs found:', jobsData?.length || 0, jobsData);

      // 5. Buscar job_assignments para obter ratings e workers atribuídos
      const { data: assignmentsData, error: assignmentsError } = await supabaseUntyped
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
        .in('job_id', allJobIds)
        .in('status', ['pending', 'confirmed', 'completed']);

      if (assignmentsError) {
        console.error('[AdminMonitoring] Error loading assignments:', assignmentsError);
      }

      console.log('[AdminMonitoring] Assignments found:', assignmentsData?.length || 0, assignmentsData);

      // 6. Mapear work_records para cada job
      const jobsWithRecords = (jobsData || []).map((job: JobWithRecords) => {
        // Work records do dia para este job
        const jobWorkRecords = (workRecordsData || [])
          .filter((wr: { job_id: string }) => wr.job_id === job.id)
          .map((wr: WorkRecord & { worker_id: string }) => {
            // Encontrar o assignment correspondente
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

        // Se não há work_records mas há assignments, criar registros "virtuais" para mostrar os trabalhadores
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
              work_date: filterDate,
              check_in: null,
              check_out: null,
              signature_data: null,
              signed_at: null,
              status: 'pending',
              job_assignment_id: assignment.id,
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
      return <Badge className="bg-blue-500">Trabalhando</Badge>;
    }
    return <Badge variant="secondary">Pendente</Badge>;
  }

  function getJobStats(job: JobWithRecords) {
    const todayRecords = job.work_records.filter(r => r.work_date === filterDate);
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Monitoramento de Trabalhos</h2>
        <p className="text-muted-foreground">Acompanhe em tempo real o status dos trabalhos e avaliações</p>
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

        <TabsContent value="monitoring" className="space-y-6">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por vaga, empresa ou local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="w-full sm:w-48">
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
          </div>

          {/* Resumo do dia */}
          <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{filteredJobs.length}</p>
                <p className="text-sm text-muted-foreground">Vagas no dia</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredJobs.reduce((acc, job) => acc + getJobStats(job).checkedIn, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Trabalhando</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredJobs.reduce((acc, job) => acc + getJobStats(job).completed, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredJobs.reduce((acc, job) => acc + getJobStats(job).absent, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Faltas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de vagas */}
      {filteredJobs.length > 0 ? (
        <div className="grid gap-4">
          {filteredJobs.map((job) => {
            const stats = getJobStats(job);
            const isAssigned = job.status === 'assigned';
            const todayRecords = job.work_records.filter(r => r.work_date === filterDate);
            return (
              <Card key={job.id} className={`transition-all ${
                isAssigned
                  ? 'border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-white'
                  : ''
              }`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        {isAssigned && (
                          <Badge className="bg-purple-500 text-white">Atribuída</Badge>
                        )}
                      </div>
                      <CardDescription>{job.clients?.company_name} - {job.location}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openDetails(job)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Detalhes
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Info e Stats */}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {formatScheduleTime(job.start_time)} - {formatScheduleTime(job.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{stats.total} trabalhadores</span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <Badge variant="outline" className="bg-blue-50">
                        {stats.checkedIn} trabalhando
                      </Badge>
                      <Badge variant="outline" className="bg-green-50">
                        {stats.completed} concluídos
                      </Badge>
                      {stats.absent > 0 && (
                        <Badge variant="outline" className="bg-red-50">
                          {stats.absent} faltas
                        </Badge>
                      )}
                    </div>
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

                  {/* Lista de trabalhadores do dia */}
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
                                  <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Concluído {record.check_out && `às ${formatTime(record.check_out)}`}
                                  </span>
                                ) : record.status === 'absent' || record.status === 'no_show' ? (
                                  <span className="text-red-600 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Falta
                                  </span>
                                ) : record.status === 'checked_in' || record.status === 'in_progress' || record.check_in ? (
                                  <span className="text-blue-600 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Trabalhando {record.check_in && `desde ${formatTime(record.check_in)}`}
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
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhuma vaga encontrada para esta data.
            </p>
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
                            {record.jobs?.title} - {record.jobs?.clients?.company_name}
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
                        {selectedJob.clients?.company_name}
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
                    <p className="font-semibold text-sm">{new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
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
                      Trabalhadores
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
                  Registros de Trabalho - {new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </h3>

                {(() => {
                  const todayRecords = selectedJob.work_records.filter(r => r.work_date === filterDate);

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

                            {/* Assinatura */}
                            {record.signature_data && (
                              <div className="pt-3 border-t">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <FileSignature className="h-4 w-4" />
                                  <span>Assinatura Digital</span>
                                  {record.signed_at && (
                                    <span className="text-xs">
                                      ({new Date(record.signed_at).toLocaleString('pt-BR')})
                                    </span>
                                  )}
                                </div>
                                <div className="bg-white border rounded-lg p-2 inline-block">
                                  <img
                                    src={record.signature_data}
                                    alt="Assinatura"
                                    className="h-16 w-auto object-contain"
                                  />
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
    </DashboardLayout>
  );
}
