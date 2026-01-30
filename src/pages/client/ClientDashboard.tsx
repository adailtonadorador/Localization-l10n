import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Briefcase,
  Users,
  Clock,
  MapPin,
  Calendar,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Eye,
  UserCheck,
  AlertCircle,
  Mail,
  Phone,
  Star,
  FileSignature,
  User
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Job {
  id: string;
  title: string;
  description: string | null;
  location: string;
  date: string;
  dates: string[] | null;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  required_workers: number;
  skills_required: string[];
  status: string;
}

interface WorkRecord {
  id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  signature_data: string | null;
  signed_at: string | null;
  status: string;
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
}

interface JobWithRecords extends Job {
  work_records: WorkRecord[];
  job_assignments: { id: string }[];
}

export function ClientDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobWithRecords[]>([]);
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalWorkers: 0,
    completedDays: 0,
    pendingDays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobWithRecords | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // Load client's jobs with work records
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select(`
          *,
          job_assignments (id),
          work_records (
            id,
            work_date,
            check_in,
            check_out,
            signature_data,
            signed_at,
            status,
            workers (
              id,
              rating,
              total_jobs,
              users (name, email, phone)
            )
          )
        `)
        .eq('client_id', user?.id)
        .order('date', { ascending: false });

      const jobsList = (jobsData || []) as JobWithRecords[];
      setJobs(jobsList);

      // Calculate stats
      const activeJobs = jobsList.filter(j => j.status === 'open').length;
      const totalWorkers = jobsList.reduce((acc, j) => acc + (j.job_assignments?.length || 0), 0);
      const allRecords = jobsList.flatMap(j => j.work_records || []);
      const completedDays = allRecords.filter(r => r.status === 'completed').length;
      const pendingDays = allRecords.filter(r => r.status === 'pending' || r.status === 'in_progress').length;

      setStats({
        activeJobs,
        totalWorkers,
        completedDays,
        pendingDays,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  }

  function formatJobDates(dates: string[] | null, date: string) {
    const allDates = dates && dates.length > 0 ? dates : [date];
    if (allDates.length === 1) {
      return formatDate(allDates[0]);
    }
    if (allDates.length === 2) {
      return `${formatDate(allDates[0])} e ${formatDate(allDates[1])}`;
    }
    return `${formatDate(allDates[0])} +${allDates.length - 1} dias`;
  }

  function formatTime(timeStr: string) {
    return timeStr.slice(0, 5);
  }

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open':
        return <Badge className="bg-emerald-500">Aberta</Badge>;
      case 'assigned':
        return <Badge className="bg-purple-500 text-white">Atribuída</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">Em Andamento</Badge>;
      case 'completed':
        return <Badge className="bg-slate-500">Concluída</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function getRecordStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">Trabalhando</Badge>;
      case 'absent':
        return <Badge variant="destructive">Falta</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  }

  function openDetails(job: JobWithRecords) {
    setSelectedJob(job);
    setDetailsOpen(true);
  }

  // Data for simple chart
  const chartData = jobs.slice(0, 6).map(job => ({
    name: job.title.slice(0, 15) + (job.title.length > 15 ? '...' : ''),
    workers: job.job_assignments?.length || 0,
    completed: job.work_records?.filter(r => r.status === 'completed').length || 0,
  }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-blue-600 font-medium">Vagas Ativas</CardDescription>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.activeJobs}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <TrendingUp className="h-3 w-3" />
              <span>Aguardando trabalhadores</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-emerald-600 font-medium">Trabalhadores Alocados</CardDescription>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.totalWorkers}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <UserCheck className="h-3 w-3" />
              <span>Total em suas vagas</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-green-600 font-medium">Dias Concluídos</CardDescription>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.completedDays}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              <span>Trabalhos finalizados</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-amber-600 font-medium">Dias Pendentes</CardDescription>
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.pendingDays}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3" />
              <span>Aguardando execução</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Jobs */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-1 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Resumo das Vagas</CardTitle>
            <CardDescription>Trabalhadores por vaga</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="space-y-4">
                {chartData.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="text-muted-foreground">{item.workers} trab.</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min((item.completed / Math.max(item.workers, 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.completed} dias concluídos</span>
                      <span>{item.workers > 0 ? Math.round((item.completed / item.workers) * 100) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma vaga para exibir</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jobs List */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Minhas Vagas</CardTitle>
                <CardDescription>Vagas criadas para sua empresa</CardDescription>
              </div>
              <Link to="/client/jobs">
                <Button variant="outline" size="sm" className="gap-1">
                  Ver Todas
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {jobs.length > 0 ? (
              <div className="space-y-3">
                {jobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className={`group p-4 rounded-xl transition-all ${
                      job.status === 'assigned'
                        ? 'bg-purple-50 border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-100'
                        : job.status === 'in_progress'
                        ? 'bg-blue-50 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-100'
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900 truncate">{job.title}</h4>
                          {getStatusBadge(job.status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatJobDates(job.dates, job.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(job.start_time)} - {formatTime(job.end_time)}
                          </span>
                        </div>
                        <p className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                          <Users className="h-3 w-3 mr-1" />
                          {job.job_assignments?.length || 0}/{job.required_workers}
                        </Badge>
                        <p className="font-bold text-lg text-emerald-600">
                          R$ {job.hourly_rate}/h
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                          onClick={() => openDetails(job)}
                        >
                          <Eye className="h-3 w-3" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-muted-foreground">Nenhuma vaga criada para sua empresa ainda.</p>
                <p className="text-sm text-muted-foreground mt-1">Entre em contato com o administrador para criar vagas.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Details Dialog */}
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
                    <p className="text-white/80 text-sm">{selectedJob.location}</p>
                  </div>
                  {getStatusBadge(selectedJob.status)}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Calendar className="h-3 w-3" />
                      Datas
                    </div>
                    <p className="font-semibold text-sm">{formatJobDates(selectedJob.dates, selectedJob.date)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Clock className="h-3 w-3" />
                      Horário
                    </div>
                    <p className="font-semibold text-sm">{formatTime(selectedJob.start_time)} - {formatTime(selectedJob.end_time)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Users className="h-3 w-3" />
                      Vagas
                    </div>
                    <p className="font-semibold text-sm">{selectedJob.job_assignments?.length || 0}/{selectedJob.required_workers} preenchidas</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Star className="h-3 w-3" />
                      Valor/Hora
                    </div>
                    <p className="font-semibold text-sm">R$ {selectedJob.hourly_rate}</p>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6 space-y-6">
                {/* Descrição */}
                {selectedJob.description && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Descrição</h3>
                    <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedJob.description}</p>
                  </div>
                )}

                {/* Skills */}
                {selectedJob.skills_required?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Habilidades Requeridas</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.skills_required.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="bg-slate-100">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trabalhadores */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Trabalhadores Atribuídos ({selectedJob.job_assignments?.length || 0})
                  </h3>

                  {selectedJob.work_records && selectedJob.work_records.length > 0 ? (
                    <div className="space-y-4">
                      {/* Agrupar por trabalhador */}
                      {(() => {
                        const workerRecords = selectedJob.work_records.reduce((acc, record) => {
                          const workerId = record.workers?.id || 'unknown';
                          if (!acc[workerId]) {
                            acc[workerId] = {
                              worker: record.workers,
                              records: []
                            };
                          }
                          acc[workerId].records.push(record);
                          return acc;
                        }, {} as Record<string, { worker: WorkRecord['workers'], records: WorkRecord[] }>);

                        return Object.entries(workerRecords).map(([workerId, data]) => (
                          <div key={workerId} className="border rounded-xl overflow-hidden">
                            {/* Info do trabalhador */}
                            <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4">
                              <div className="flex items-center gap-4">
                                <Avatar className="h-14 w-14 ring-2 ring-white shadow-lg">
                                  <AvatarFallback className="bg-purple-500 text-white text-lg font-bold">
                                    {data.worker?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h4 className="font-bold text-lg">{data.worker?.users?.name || 'N/A'}</h4>
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                                    {data.worker?.users?.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3.5 w-3.5" />
                                        {data.worker.users.email}
                                      </span>
                                    )}
                                    {data.worker?.users?.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5" />
                                        {data.worker.users.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-1 justify-end">
                                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                    <span className="font-bold">{data.worker?.rating?.toFixed(1) || '0.0'}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{data.worker?.total_jobs || 0} trabalhos</p>
                                </div>
                              </div>
                            </div>

                            {/* Registros de trabalho */}
                            <div className="p-4 space-y-3">
                              <h5 className="text-sm font-medium text-muted-foreground">Registros de Ponto</h5>
                              {data.records.map((record) => (
                                <div
                                  key={record.id}
                                  className={`p-3 rounded-lg border ${
                                    record.status === 'completed'
                                      ? 'bg-green-50 border-green-200'
                                      : record.status === 'in_progress'
                                      ? 'bg-blue-50 border-blue-200'
                                      : record.status === 'absent'
                                      ? 'bg-red-50 border-red-200'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">{formatDate(record.work_date)}</span>
                                    </div>
                                    {getRecordStatusBadge(record.status)}
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${record.check_in ? 'bg-green-500' : 'bg-slate-300'}`} />
                                      <span className="text-muted-foreground">Entrada:</span>
                                      <span className="font-medium">{formatDateTime(record.check_in)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${record.check_out ? 'bg-red-500' : 'bg-slate-300'}`} />
                                      <span className="text-muted-foreground">Saída:</span>
                                      <span className="font-medium">{formatDateTime(record.check_out)}</span>
                                    </div>
                                  </div>

                                  {/* Assinatura */}
                                  {record.signature_data && (
                                    <div className="mt-3 pt-3 border-t">
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
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-xl">
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-muted-foreground">Nenhum trabalhador atribuído ainda.</p>
                      <p className="text-sm text-muted-foreground mt-1">Aguardando trabalhadores pegarem a vaga.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
