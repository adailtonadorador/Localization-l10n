import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  DollarSign,
  Star,
  Clock,
  MapPin,
  Calendar,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  dates: string[] | null;
  start_time: string;
  end_time: string;
  daily_rate: number;
  required_workers: number;
  skills_required: string[];
  status: string;
  clients: {
    company_name: string;
  };
}

interface JobApplication {
  id: string;
  status: string;
  jobs: Job;
}

interface JobAssignment {
  id: string;
  status: string;
  jobs: Job;
}

export function WorkerDashboard() {
  const { user, workerProfile } = useAuth();
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<JobAssignment[]>([]);
  const [pendingApplications, setPendingApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    monthlyEarnings: 0,
    rating: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // Load available jobs (open status)
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select(`
          *,
          clients (company_name)
        `)
        .eq('status', 'open')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(5);

      setAvailableJobs(jobsData || []);

      // Load upcoming assigned jobs
      const { data: assignmentsData } = await supabaseUntyped
        .from('job_assignments')
        .select(`
          *,
          jobs (
            *,
            clients (company_name)
          )
        `)
        .eq('worker_id', user?.id)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(5);

      setUpcomingJobs(assignmentsData || []);

      // Load pending applications
      const { data: applicationsData } = await supabaseUntyped
        .from('job_applications')
        .select(`
          *,
          jobs (
            *,
            clients (company_name)
          )
        `)
        .eq('worker_id', user?.id)
        .eq('status', 'pending')
        .order('applied_at', { ascending: false });

      setPendingApplications(applicationsData || []);

      // Calculate stats
      const { data: completedJobs } = await supabaseUntyped
        .from('job_assignments')
        .select('id')
        .eq('worker_id', user?.id)
        .eq('status', 'completed');

      setStats({
        totalJobs: workerProfile?.total_jobs || completedJobs?.length || 0,
        monthlyEarnings: 0, // Would need to calculate from completed jobs
        rating: workerProfile?.rating || 0,
        pendingCount: applicationsData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(jobId: string) {
    try {
      const { error } = await supabaseUntyped.from('job_applications').insert({
        job_id: jobId,
        worker_id: user?.id,
        status: 'pending',
      });

      if (error) {
        if (error.message.includes('duplicate')) {
          alert('Você já se candidatou a esta vaga.');
        } else {
          alert('Erro ao candidatar. Tente novamente.');
        }
        return;
      }

      // Reload data
      loadDashboardData();
      alert('Candidatura enviada com sucesso!');
    } catch {
      alert('Erro ao candidatar. Tente novamente.');
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
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-emerald-600 font-medium">Total de Trabalhos</CardDescription>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Briefcase className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.totalJobs}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span>Trabalhos realizados</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-blue-600 font-medium">Ganhos Este Mês</CardDescription>
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">R$ {stats.monthlyEarnings.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <TrendingUp className="h-3 w-3" />
              <span>Pagamentos confirmados</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-amber-600 font-medium">Avaliação Média</CardDescription>
              <div className="p-2 bg-amber-100 rounded-lg">
                <Star className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">
              {stats.rating > 0 ? stats.rating.toFixed(1) : 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-amber-600">
              {stats.rating > 0 ? (
                <>
                  <Star className="h-3 w-3 fill-current" />
                  <span>Excelente reputação</span>
                </>
              ) : (
                <span>Sem avaliações ainda</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-purple-600 font-medium">Candidaturas Pendentes</CardDescription>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.pendingCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-purple-600">
              <AlertCircle className="h-3 w-3" />
              <span>Aguardando resposta</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos Trabalhos */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Próximos Trabalhos</CardTitle>
                <CardDescription>Trabalhos confirmados para os próximos dias</CardDescription>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            {upcomingJobs.length > 0 ? (
              <div className="space-y-3">
                {upcomingJobs.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="group p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">{assignment.jobs.title}</h4>
                        <p className="text-sm text-muted-foreground">{assignment.jobs.clients?.company_name}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(assignment.jobs.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(assignment.jobs.start_time)} - {formatTime(assignment.jobs.end_time)}
                          </span>
                        </div>
                        <p className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {assignment.jobs.location}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <Badge
                          variant={assignment.status === 'confirmed' ? 'default' : 'secondary'}
                          className={assignment.status === 'confirmed' ? 'bg-emerald-500' : ''}
                        >
                          {assignment.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                        </Badge>
                        <p className="font-bold text-lg text-emerald-600">
                          R$ {assignment.jobs.daily_rate}/dia
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-muted-foreground">Nenhum trabalho agendado</p>
                <Link to="/worker/jobs">
                  <Button variant="link" className="mt-2">
                    Buscar vagas disponíveis
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vagas Disponíveis */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Vagas Disponíveis</CardTitle>
                <CardDescription>Oportunidades abertas para candidatura</CardDescription>
              </div>
              <Link to="/worker/jobs">
                <Button variant="outline" size="sm" className="gap-2">
                  Ver Todas
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {availableJobs.length > 0 ? (
              <div className="space-y-3">
                {availableJobs.map((job) => (
                  <div
                    key={job.id}
                    className="group p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">{job.title}</h4>
                        <p className="text-sm text-muted-foreground">{job.clients?.company_name}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-slate-500">
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
                          {job.required_workers} vaga(s)
                        </Badge>
                        <p className="font-bold text-lg text-emerald-600">
                          R$ {job.daily_rate}/dia
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleApply(job.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Candidatar
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
                <p className="text-muted-foreground">Nenhuma vaga disponível no momento</p>
                <p className="text-sm text-slate-400 mt-1">Novas vagas são publicadas diariamente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Candidaturas Pendentes */}
        {pendingApplications.length > 0 && (
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Candidaturas Pendentes</CardTitle>
                  <CardDescription>Aguardando resposta das empresas</CardDescription>
                </div>
                <Link to="/worker/applications">
                  <Button variant="outline" size="sm" className="gap-2">
                    Ver Todas
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendingApplications.map((application) => (
                  <div
                    key={application.id}
                    className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl"
                  >
                    <h4 className="font-semibold text-slate-900 truncate">{application.jobs.title}</h4>
                    <p className="text-sm text-muted-foreground">{application.jobs.clients?.company_name}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(application.jobs.date)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-100">
                      <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                        <Clock className="h-3 w-3 mr-1" />
                        Aguardando
                      </Badge>
                      <span className="font-bold text-emerald-600">R$ {application.jobs.daily_rate}/dia</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
