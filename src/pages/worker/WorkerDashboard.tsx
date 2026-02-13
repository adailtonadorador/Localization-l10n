import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonJobCard, SkeletonStatsCard } from "@/components/ui/skeleton";
import { useProfileCompleteness } from "@/components/ProfileCompleteness";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { WithdrawalDialog } from "@/components/WithdrawalDialog";
import {
  Briefcase,
  Star,
  Clock,
  MapPin,
  Calendar,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building,
  ShieldAlert,
  XCircle
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

interface ConflictInfo {
  selectedJob: Job;
  conflictingJob: {
    title: string;
    company_name?: string;
    dates: string[];
    start_time: string;
    end_time: string;
    location?: string;
  };
  conflictDates: string[];
}

// Alert component for approval status
function ApprovalStatusAlert({ workerProfile }: { workerProfile: any }) {
  const approvalStatus = workerProfile?.approval_status;

  if (approvalStatus === 'approved') return null;

  if (approvalStatus === 'pending') {
    return (
      <Alert className="mb-6 border-blue-300 bg-blue-50">
        <Clock className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-800">Conta em Análise</AlertTitle>
        <AlertDescription className="text-blue-700">
          Sua conta está sendo analisada pelo administrador. Você poderá acessar e se candidatar às vagas assim que sua conta for aprovada.
          <span className="block font-medium mt-2">Aguarde o contato da equipe.</span>
        </AlertDescription>
      </Alert>
    );
  }

  if (approvalStatus === 'rejected') {
    return (
      <Alert className="mb-6 border-red-300 bg-red-50">
        <ShieldAlert className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-800">Conta Rejeitada</AlertTitle>
        <AlertDescription className="text-red-700">
          Sua conta foi rejeitada.
          {workerProfile?.rejected_reason && (
            <>
              <br />
              <span className="font-semibold">Motivo:</span> {workerProfile.rejected_reason}
            </>
          )}
          <span className="block font-medium mt-2">Entre em contato com o suporte para mais informações.</span>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

// Alert component for incomplete profile
function ProfileCompletenessAlert({ profile, workerProfile }: { profile: any; workerProfile: any }) {
  const { percentage, isComplete, hasRequiredMissing } = useProfileCompleteness(profile, workerProfile);

  if (isComplete) return null;

  return (
    <div className={`mb-6 p-4 rounded-xl border ${hasRequiredMissing ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold ${hasRequiredMissing ? 'text-amber-800' : 'text-blue-800'}`}>
              {hasRequiredMissing ? 'Complete seu perfil para se candidatar' : 'Quase lá!'}
            </span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${hasRequiredMissing ? 'bg-amber-200 text-amber-700' : 'bg-blue-200 text-blue-700'}`}>
              {percentage}%
            </span>
          </div>
          <p className={`text-sm ${hasRequiredMissing ? 'text-amber-700' : 'text-blue-700'}`}>
            {hasRequiredMissing
              ? 'Preencha os campos obrigatórios para poder se candidatar às vagas.'
              : 'Seu perfil está quase completo. Adicione mais informações para se destacar.'}
          </p>
        </div>
        <Link to="/worker/profile">
          <Button size="sm" variant={hasRequiredMissing ? 'default' : 'outline'}>
            Completar Perfil
          </Button>
        </Link>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-2 bg-white/50 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${hasRequiredMissing ? 'bg-amber-500' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function WorkerDashboard() {
  const location = useLocation();
  const { user, profile, workerProfile } = useAuth();
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
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [selectedJobForWithdrawal, setSelectedJobForWithdrawal] = useState<{ id: string; title: string; job_id: string } | null>(null);

  // Recarrega dados quando navega para esta página
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, location.pathname]);

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
      const today = new Date().toISOString().split('T')[0];
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
        .order('created_at', { ascending: false });

      // Filter only future jobs (Supabase doesn't support filtering on joined tables)
      const futureAssignments = (assignmentsData || []).filter(
        (a: JobAssignment) => a.jobs?.date >= today
      ).slice(0, 5);

      setUpcomingJobs(futureAssignments);

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

      // Calculate stats from work_records
      const { data: allCompletedRecords } = await supabaseUntyped
        .from('work_records')
        .select('id')
        .eq('worker_id', user?.id)
        .eq('status', 'completed');

      // Get current month's completed work records with job details for earnings
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: monthlyRecords } = await supabaseUntyped
        .from('work_records')
        .select(`
          id,
          work_date,
          check_in,
          check_out,
          jobs (daily_rate, start_time, end_time)
        `)
        .eq('worker_id', user?.id)
        .eq('status', 'completed')
        .gte('work_date', firstDayOfMonth)
        .lte('work_date', lastDayOfMonth);

      // Calculate monthly earnings
      let monthlyEarnings = 0;
      (monthlyRecords || []).forEach((record: any) => {
        if (record.jobs) {
          // Use daily_rate directly (it's the daily payment)
          monthlyEarnings += record.jobs.daily_rate || 0;
        }
      });

      setStats({
        totalJobs: allCompletedRecords?.length || 0,
        monthlyEarnings,
        rating: workerProfile?.rating || 0,
        pendingCount: applicationsData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Verifica se dois intervalos de tempo se sobrepõem
  function timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);
    return s1 < e2 && s2 < e1;
  }

  async function handleAcceptJob(jobId: string) {
    try {
      // Check if worker is approved
      if (workerProfile?.approval_status !== 'approved') {
        toast.error('Você precisa ser aprovado pelo administrador antes de aceitar vagas.');
        return;
      }

      // Buscar detalhes da vaga selecionada
      const selectedJob = availableJobs.find(j => j.id === jobId);
      if (!selectedJob) {
        toast.error('Erro ao encontrar a vaga.');
        return;
      }

      const selectedJobDates = selectedJob.dates && selectedJob.dates.length > 0
        ? selectedJob.dates
        : [selectedJob.date];

      // Buscar todas as vagas já atribuídas ao trabalhador
      const { data: existingAssignments } = await supabaseUntyped
        .from('job_assignments')
        .select(`
          job_id,
          jobs (
            id,
            date,
            dates,
            start_time,
            end_time,
            title,
            location,
            clients (company_name)
          )
        `)
        .eq('worker_id', user?.id)
        .in('status', ['pending', 'confirmed']);

      // Verificar conflito de datas e horários
      if (existingAssignments && existingAssignments.length > 0) {
        for (const assignment of existingAssignments) {
          const existingJob = assignment.jobs as {
            id: string;
            date: string;
            dates: string[] | null;
            start_time: string;
            end_time: string;
            title: string;
            location?: string;
            clients?: { company_name: string };
          };

          if (!existingJob) continue;

          const existingJobDates = existingJob.dates && existingJob.dates.length > 0
            ? existingJob.dates
            : [existingJob.date];

          // Verificar se há datas em comum
          const commonDates = selectedJobDates.filter(date => existingJobDates.includes(date));

          if (commonDates.length > 0) {
            // Verificar se os horários se sobrepõem
            const hasTimeConflict = timeRangesOverlap(
              selectedJob.start_time,
              selectedJob.end_time,
              existingJob.start_time,
              existingJob.end_time
            );

            if (hasTimeConflict) {
              // Mostrar diálogo de conflito com detalhes
              setConflictInfo({
                selectedJob,
                conflictingJob: {
                  title: existingJob.title,
                  company_name: existingJob.clients?.company_name,
                  dates: existingJobDates,
                  start_time: existingJob.start_time,
                  end_time: existingJob.end_time,
                  location: existingJob.location,
                },
                conflictDates: commonDates,
              });
              setConflictDialogOpen(true);
              return;
            }
          }
        }
      }

      // Criar assignment diretamente (atribuir vaga ao trabalhador)
      const { error: assignError } = await supabaseUntyped.from('job_assignments').insert({
        job_id: jobId,
        worker_id: user?.id,
        status: 'confirmed',
      });

      if (assignError) {
        if (assignError.message.includes('duplicate')) {
          toast.warning('Você já está atribuído a esta vaga.');
        } else {
          toast.error('Erro ao aceitar vaga. Tente novamente.');
        }
        return;
      }

      // Criar work_records para cada dia da vaga
      const dates = selectedJob.dates && selectedJob.dates.length > 0 ? selectedJob.dates : [selectedJob.date];
      const workRecords = dates.map(date => ({
        job_id: selectedJob.id,
        worker_id: user?.id,
        work_date: date,
        status: 'pending',
      }));

      const { error: recordsError } = await supabaseUntyped.from('work_records').insert(workRecords);

      if (recordsError) {
        console.error('Work records error:', recordsError);
      }

      // Verificar se todas as vagas foram preenchidas e atualizar status
      const { count: totalAssigned } = await supabaseUntyped
        .from('job_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', selectedJob.id);

      if ((totalAssigned || 0) >= selectedJob.required_workers) {
        await supabaseUntyped
          .from('jobs')
          .update({ status: 'assigned' })
          .eq('id', selectedJob.id);
      }

      // Reload data
      loadDashboardData();
      toast.success('Diária aceita com sucesso!', {
        description: 'Acesse "Meus Trabalhos" para ver seus dias de trabalho.',
      });
    } catch {
      toast.error('Erro ao aceitar vaga. Tente novamente.');
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

  function handleWithdrawClick(assignment: JobAssignment) {
    setSelectedJobForWithdrawal({
      id: assignment.id,
      title: assignment.jobs.title,
      job_id: assignment.jobs.id
    });
    setWithdrawalDialogOpen(true);
  }

  async function handleWithdrawalSubmit(reason: string) {
    if (!selectedJobForWithdrawal || !user?.id) return;

    try {
      // 1. Atualizar o assignment para status 'withdrawn'
      const { error: assignmentError } = await supabaseUntyped
        .from('job_assignments')
        .update({
          status: 'withdrawn',
          withdrawal_reason: reason,
          withdrawn_at: new Date().toISOString()
        })
        .eq('id', selectedJobForWithdrawal.id)
        .select();

      if (assignmentError) {
        console.error('Assignment error:', assignmentError);
        if (assignmentError.message?.includes('invalid input value') || assignmentError.code === '22P02') {
          toast.error('Erro: Status de desistência não configurado no banco de dados.', {
            description: 'Entre em contato com o administrador.'
          });
          return;
        }
        throw assignmentError;
      }

      // 2. Deletar todos os work_records associados a este job_id e worker_id
      await supabaseUntyped
        .from('work_records')
        .delete()
        .eq('job_id', selectedJobForWithdrawal.job_id)
        .eq('worker_id', user.id);

      // 3. Verificar se ainda há outros trabalhadores atribuídos
      const { count } = await supabaseUntyped
        .from('job_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', selectedJobForWithdrawal.job_id)
        .in('status', ['pending', 'confirmed']);

      // 4. Se não houver mais trabalhadores, retornar a vaga para status 'open'
      if (count === 0) {
        await supabaseUntyped
          .from('jobs')
          .update({ status: 'open' })
          .eq('id', selectedJobForWithdrawal.job_id);
      }

      setWithdrawalDialogOpen(false);
      setSelectedJobForWithdrawal(null);
      toast.success('Desistência registrada com sucesso!', {
        description: 'A vaga ficou disponível novamente para outros trabalhadores.'
      });
      loadDashboardData();
    } catch (error: any) {
      console.error('Erro ao confirmar desistência:', error);
      toast.error('Erro ao registrar desistência. Tente novamente.');
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonStatsCard key={i} />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Próximos Trabalhos Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonJobCard key={i} />
              ))}
            </CardContent>
          </Card>

          {/* Vagas Disponíveis Skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonJobCard key={i} />
              ))}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
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

      {/* Approval Status Alert */}
      <ApprovalStatusAlert workerProfile={workerProfile} />

      {/* Profile Completeness Alert */}
      <ProfileCompletenessAlert profile={profile} workerProfile={workerProfile} />

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
                    <div className="flex flex-col gap-3">
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
                      <div className="pt-3 border-t border-slate-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWithdrawClick(assignment)}
                          className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4" />
                          Desistir da Diária
                        </Button>
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
                          onClick={() => handleAcceptJob(job.id)}
                          className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        >
                          Aceitar a Diária
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

      {/* Conflict Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-w-lg">
          {conflictInfo && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Conflito de Horário</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Você já tem um trabalho atribuído que conflita com esta vaga.
                  </p>
                </div>
              </div>

              {/* Conflict dates */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800 mb-2">Datas em conflito:</p>
                <div className="flex flex-wrap gap-2">
                  {conflictInfo.conflictDates.map((date, i) => (
                    <Badge key={i} variant="outline" className="bg-red-100 border-red-300 text-red-700">
                      {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short'
                      })}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Jobs comparison */}
              <div className="grid gap-4">
                {/* Conflicting job (existing) */}
                <div className="border border-red-200 rounded-lg p-4 bg-red-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="destructive" className="text-xs">Trabalho Atribuído</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900">{conflictInfo.conflictingJob.title}</h3>
                  {conflictInfo.conflictingJob.company_name && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Building className="h-3.5 w-3.5" />
                      {conflictInfo.conflictingJob.company_name}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-red-500" />
                      <span className="font-medium">
                        {conflictInfo.conflictingJob.start_time.slice(0, 5)} - {conflictInfo.conflictingJob.end_time.slice(0, 5)}
                      </span>
                    </div>
                    {conflictInfo.conflictingJob.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{conflictInfo.conflictingJob.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected job (new) */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">Vaga Selecionada</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900">{conflictInfo.selectedJob.title}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Building className="h-3.5 w-3.5" />
                    {conflictInfo.selectedJob.clients?.company_name}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="font-medium">
                        {conflictInfo.selectedJob.start_time.slice(0, 5)} - {conflictInfo.selectedJob.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{conflictInfo.selectedJob.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setConflictDialogOpen(false)}>
                  Entendi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <WithdrawalDialog
        open={withdrawalDialogOpen}
        onOpenChange={setWithdrawalDialogOpen}
        onSubmit={handleWithdrawalSubmit}
        jobTitle={selectedJobForWithdrawal?.title || ''}
      />
    </DashboardLayout>
  );
}
